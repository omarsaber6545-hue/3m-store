import { getDb } from './_lib/db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ error: "Missing access token" });
    }

    try {
        const response = await fetch("https://discord.com/api/users/@me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: "Discord API Error", details: errText });
        }

        const discordUser = await response.json();
        
        // Connect to PostgreSQL and Upsert User Profile
        const db = await getDb();
        if (db) {
            const queryText = `
                INSERT INTO users (id, username, avatar, last_active)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (id)
                DO UPDATE SET username = $2, avatar = $3, last_active = NOW()
                RETURNING *;
            `;
            const result = await db.query(queryText, [discordUser.id, discordUser.username, discordUser.avatar]);
            const dbUser = result.rows[0];
            
            return res.status(200).json({
                ...discordUser,
                xp: dbUser.xp,
                level: dbUser.level,
                points: dbUser.points,
                streak: dbUser.streak,
                last_daily_claim: dbUser.last_daily_claim,
                join_date: dbUser.join_date
            });
        }

        // Fallback if DB is not configured
        return res.status(200).json({
            ...discordUser,
            xp: 0,
            level: 1,
            points: 0,
            streak: 0,
            last_daily_claim: null,
            join_date: new Date()
        });
    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
