// api/discord-profile.js
// Serverless function to proxy Discord profile requests and bypass browser CORS block

export default async function handler(req, res) {
    // Add CORS headers so local testing and Vercel both work
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
