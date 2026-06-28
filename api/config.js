// api/config.js
// Expose the public Discord Client ID dynamically from environment variables

export default function handler(req, res) {
    // Add CORS headers so local testing and Vercel both work
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    res.status(200).json({
        clientId: process.env.DISCORD_CLIENT_ID || "1519819519193780494"
    });
}
