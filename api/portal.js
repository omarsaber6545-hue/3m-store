import { getDb } from './_lib/db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action } = req.query;
    if (!action) {
        return res.status(400).json({ error: "Missing action parameter" });
    }

    const db = await getDb();
    if (!db) {
        return res.status(500).json({ error: "Database connection not available" });
    }

    try {
        // 1. User Profile
        if (action === 'profile') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: "Missing userId" });
            const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
            if (result.rows.length > 0) {
                return res.status(200).json(result.rows[0]);
            }
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Claim Reward
        if (action === 'claim_reward' && req.method === 'POST') {
            const { userId } = req.body;
            if (!userId) return res.status(400).json({ error: "Missing userId" });

            const userResult = await db.query("SELECT last_daily_claim, streak, points, xp, level FROM users WHERE id = $1", [userId]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: "User profile not found. Log in first." });
            }

            const user = userResult.rows[0];
            const today = new Date().toISOString().split("T")[0];
            
            if (user.last_daily_claim) {
                const lastClaimStr = new Date(user.last_daily_claim).toISOString().split("T")[0];
                if (lastClaimStr === today) {
                    return res.status(400).json({ error: "Already claimed today / لقد استلمت جائزتك اليوم بالفعل!" });
                }
            }

            let newStreak = 1;
            if (user.last_daily_claim) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                const lastClaimStr = new Date(user.last_daily_claim).toISOString().split("T")[0];
                
                if (lastClaimStr === yesterdayStr) {
                    newStreak = (user.streak || 0) + 1;
                }
            }

            const pointsReward = 50 + (newStreak * 10);
            const xpReward = 150;

            let newXP = (user.xp || 0) + xpReward;
            let newLevel = user.level || 1;
            const maxXp = newLevel * 200;
            if (newXP >= maxXp) {
                newXP -= maxXp;
                newLevel += 1;
            }

            await db.query(
                "UPDATE users SET points = points + $1, xp = $2, level = $3, streak = $4, last_daily_claim = $5 WHERE id = $6",
                [pointsReward, newXP, newLevel, newStreak, today, userId]
            );

            await db.query(
                "INSERT INTO claims (user_id, reward_type, amount) VALUES ($1, 'Daily Reward', $2)",
                [userId, pointsReward]
            );

            return res.status(200).json({
                success: true,
                pointsEarned: pointsReward,
                xpEarned: xpReward,
                streak: newStreak,
                level: newLevel,
                xp: newXP
            });
        }

        // 3. Rewards History
        if (action === 'rewards_history') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: "Missing userId" });
            const history = await db.query(
                "SELECT * FROM claims WHERE user_id = $1 ORDER BY claimed_at DESC LIMIT 50",
                [userId]
            );
            return res.status(200).json({ history: history.rows });
        }

        // 4. Create Ticket
        if (action === 'create_ticket' && req.method === 'POST') {
            const { userId, subject, description } = req.body;
            if (!userId || !subject || !description) {
                return res.status(400).json({ error: "Missing ticket inputs" });
            }

            const ticketId = `TCK-${Math.floor(10000 + Math.random() * 90000)}`;
            await db.query(
                "INSERT INTO tickets (id, user_id, subject, description, status) VALUES ($1, $2, $3, $4, 'open')",
                [ticketId, userId, subject, description]
            );

            const token = process.env.DISCORD_BOT_TOKEN;
            const channelId = process.env.DISCORD_LOG_CHANNEL_ID;
            if (token && channelId) {
                const payload = {
                    embeds: [{
                        title: `🎟️ تذكرة دعم جديدة: ${ticketId}`,
                        color: 10181046,
                        fields: [
                            { name: "Ticket ID", value: ticketId, inline: true },
                            { name: "User ID", value: userId, inline: true },
                            { name: "Subject", value: subject },
                            { name: "Description", value: description }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                };
                await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                    method: "POST",
                    headers: { "Authorization": `Bot ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            return res.status(200).json({ success: true, ticketId });
        }

        // 5. Tickets List
        if (action === 'tickets_list') {
            const { userId } = req.query;
            let result;
            if (userId) {
                result = await db.query("SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
            } else {
                result = await db.query("SELECT t.*, u.username, u.avatar FROM tickets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC");
            }
            return res.status(200).json({ tickets: result.rows });
        }

        // 6. Submit Review
        if (action === 'submit_review' && req.method === 'POST') {
            const { userId, orderId, rating, comment } = req.body;
            if (!userId || !orderId || !rating || !comment) {
                return res.status(400).json({ error: "Missing review inputs" });
            }

            const orderResult = await db.query(
                "SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = 'paid'",
                [orderId, userId]
            );

            if (orderResult.rows.length === 0) {
                return res.status(403).json({ error: "You can only review services you have purchased and completed! / لا يمكنك تقييم الخدمة إلا بعد شرائها واكتمال الدفع." });
            }

            const existingReview = await db.query("SELECT * FROM reviews WHERE order_id = $1", [orderId]);
            if (existingReview.rows.length > 0) {
                return res.status(400).json({ error: "You have already reviewed this purchase / لقد قمت بتقييم هذا الطلب بالفعل!" });
            }

            const reviewId = `REV-${Math.floor(10000 + Math.random() * 90000)}`;
            await db.query(
                "INSERT INTO reviews (id, user_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)",
                [reviewId, userId, orderId, parseInt(rating), comment]
            );

            return res.status(200).json({ success: true, reviewId });
        }

        // 7. Reviews List
        if (action === 'reviews_list') {
            const result = await db.query(
                "SELECT r.*, u.username, u.avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT 50"
            );
            return res.status(200).json({ reviews: result.rows });
        }

        // 8. Activity Feed
        if (action === 'activity_feed') {
            const queryText = `
                SELECT * FROM (
                    (SELECT 'order' as type, product_name as detail, created_at FROM orders)
                    UNION ALL
                    (SELECT 'claim' as type, reward_type as detail, claimed_at as created_at FROM claims)
                    UNION ALL
                    (SELECT 'ticket' as type, subject as detail, created_at FROM tickets)
                    UNION ALL
                    (SELECT 'review' as type, comment as detail, created_at FROM reviews)
                ) as combined
                ORDER BY created_at DESC 
                LIMIT 10;
            `;
            const result = await db.query(queryText);
            
            const feed = result.rows.map(row => {
                let icon = '🔔';
                let text_ar = '';
                let text_en = '';
                
                if (row.type === 'order') {
                    icon = '🛒';
                    text_ar = \`طلب شراء جديد لـ: \${row.detail}\`;
                    text_en = \`New order placed for: \${row.detail}\`;
                } else if (row.type === 'claim') {
                    icon = '🎁';
                    text_ar = \`مطالبة بجائزة يومية: \${row.detail}\`;
                    text_en = \`Daily reward claimed: \${row.detail}\`;
                } else if (row.type === 'ticket') {
                    icon = '🎟️';
                    text_ar = \`فتح تذكرة دعم جديدة: \${row.detail}\`;
                    text_en = \`New support ticket opened: \${row.detail}\`;
                } else if (row.type === 'review') {
                    icon = '⭐';
                    text_ar = \`تقييم جديد: \${row.detail}\`;
                    text_en = \`New review submitted: \${row.detail}\`;
                }
                
                return { icon, ar: text_ar, en: text_en, timestamp: row.created_at };
            });
            
            return res.status(200).json({ feed });
        }

        // 9. Admin Stats
        if (action === 'admin_stats') {
            const queryText = `
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM orders) as total_orders,
                    (SELECT COUNT(*) FROM tickets) as total_tickets,
                    (SELECT COUNT(*) FROM claims WHERE reward_type = 'Daily Reward') as total_rewards,
                    (SELECT COUNT(*) FROM reviews) as total_reviews,
                    (SELECT COALESCE(SUM(final_price), 0) FROM orders WHERE status = 'paid') as total_revenue;
            `;
            const result = await db.query(queryText);
            const stats = result.rows[0];
            return res.status(200).json({
                success: true,
                stats: {
                    totalUsers: parseInt(stats.total_users),
                    totalOrders: parseInt(stats.total_orders),
                    totalTickets: parseInt(stats.total_tickets),
                    totalRewards: parseInt(stats.total_rewards),
                    totalReviews: parseInt(stats.total_reviews),
                    totalRevenue: parseFloat(stats.total_revenue)
                }
            });
        }

        return res.status(400).json({ error: "Invalid action" });
    } catch (e) {
        console.error("Portal Error:", e);
        return res.status(500).json({ error: "Internal Server Error", details: e.message });
    }
}
