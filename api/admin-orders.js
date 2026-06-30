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

    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_LOG_CHANNEL_ID;

    if (!token || !channelId) {
        console.error("Missing Discord Configuration on Vercel");
        return res.status(500).json({ error: "Server Configuration Error: Bot credentials are not set." });
    }

    const userAgent = "DiscordBot (https://3m-store-3.vercel.app, 1.0.0)";

    // --- GET: Fetch all orders from PostgreSQL ---
    if (req.method === 'GET') {
        try {
            const db = await getDb();
            if (db) {
                const queryText = `
                    SELECT o.*, u.username, u.avatar 
                    FROM orders o 
                    LEFT JOIN users u ON o.user_id = u.id 
                    ORDER BY o.created_at DESC 
                    LIMIT 100;
                `;
                const result = await db.query(queryText);
                const orders = result.rows.map(row => {
                    return {
                        id: row.id,
                        orderCode: `#3M-${row.id.substring(0, 5)}`,
                        name: row.username || "Guest",
                        email: "N/A",
                        discord: row.username || "N/A",
                        userId: row.user_id,
                        service: row.product_name,
                        price: `${row.price} EGP`,
                        discount: `${row.discount} EGP`,
                        finalPrice: `${row.final_price} EGP`,
                        paymentMethod: row.payment_method,
                        transactionId: row.transaction_id || "N/A",
                        senderPhone: "N/A",
                        status: row.status,
                        timestamp: row.created_at
                    };
                });
                return res.status(200).json({ orders });
            }

            // Fallback to Discord API if database isn't configured
            const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=100`, {
                headers: {
                    "Authorization": `Bot ${token}`,
                    "User-Agent": userAgent
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: "Discord API Error", details: errText });
            }

            const messages = await response.json();
            const ordersList = [];

            messages.forEach(msg => {
                const embed = msg.embeds && msg.embeds[0];
                if (embed && (embed.title && embed.title.includes("طلب شراء جديد"))) {
                    const fields = embed.fields || [];
                    const getVal = (labels) => {
                        const field = fields.find(f => labels.some(lbl => f.name.includes(lbl)));
                        return field ? field.value : "";
                    };

                    ordersList.push({
                        id: msg.id,
                        orderCode: getVal(["رقم الطلب", "Order ID"]),
                        name: getVal(["العميل", "Customer"]),
                        email: getVal(["البريد", "Email"]),
                        discord: getVal(["حساب ديسكورد", "Discord"]),
                        service: getVal(["المنتج", "Product"]),
                        price: getVal(["السعر", "Price"]),
                        paymentMethod: getVal(["طريقة الدفع", "Payment Method"]),
                        transactionId: getVal(["رقم العملية", "Transaction ID"]),
                        senderPhone: getVal(["رقم المرسل", "Sender Phone"]),
                        status: getVal(["حالة الدفع", "Payment Status"]),
                        details: getVal(["تفاصيل الطلب", "Details"]),
                        timestamp: embed.timestamp || msg.timestamp
                    });
                }
            });

            return res.status(200).json({ orders: ordersList });
        } catch (error) {
            console.error("Error fetching orders:", error);
            return res.status(500).json({ error: "Server Error", details: error.message });
        }
    }

    // --- POST: Update Order (Approve / Reject / Delete) ---
    if (req.method === 'POST') {
        const { orderId, action } = req.body;
        if (!orderId || !action) {
            return res.status(400).json({ error: "Missing orderId or action" });
        }

        try {
            const db = await getDb();
            let newStatus = "pending_review";
            let newColor = 16761095;

            if (action === 'approve') {
                newStatus = "paid";
                newColor = 3066993;
            } else if (action === 'reject') {
                newStatus = "failed";
                newColor = 15158332;
            }

            // 1. Update/Delete in PostgreSQL
            if (db) {
                if (action === 'delete') {
                    await db.query("DELETE FROM orders WHERE id = $1", [orderId]);
                } else {
                    await db.query("UPDATE orders SET status = $1 WHERE id = $2", [newStatus, orderId]);
                    
                    if (action === 'approve') {
                        const orderRes = await db.query("SELECT user_id, final_price FROM orders WHERE id = $1", [orderId]);
                        if (orderRes.rows.length > 0 && orderRes.rows[0].user_id) {
                            const userId = orderRes.rows[0].user_id;
                            const finalPrice = parseFloat(orderRes.rows[0].final_price);
                            const pointsToAward = Math.floor(finalPrice / 10) || 5;
                            const xpToAward = 100;
                            
                            await db.query(
                                "UPDATE users SET xp = xp + $1, points = points + $2 WHERE id = $3",
                                [xpToAward, pointsToAward, userId]
                            );
                            
                            await db.query(
                                "INSERT INTO claims (user_id, reward_type, amount) VALUES ($1, 'Purchase Reward', $2)",
                                [userId, pointsToAward]
                            );
                        }
                    }
                }
            }

            // 2. Mirror on Discord (Syncing Webhook log)
            if (action === 'delete') {
                await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "User-Agent": userAgent
                    }
                });
            } else {
                const getResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "User-Agent": userAgent
                    }
                });

                if (getResponse.ok) {
                    const message = await getResponse.json();
                    const embed = message.embeds && message.embeds[0];
                    if (embed) {
                        const statusFieldIndex = embed.fields.findIndex(f => f.name.includes("حالة الدفع") || f.name.includes("Payment Status"));
                        if (statusFieldIndex !== -1) {
                            embed.fields[statusFieldIndex].value = newStatus;
                        }
                        embed.color = newColor;

                        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                            method: "PATCH",
                            headers: {
                                "Authorization": `Bot ${token}`,
                                "Content-Type": "application/json",
                                "User-Agent": userAgent
                            },
                            body: JSON.stringify({ embeds: [embed] })
                        });
                    }
                }
            }

            return res.status(200).json({ success: true, status: newStatus });
        } catch (error) {
            console.error("Error updating order:", error);
            return res.status(500).json({ error: "Server Error", details: error.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
