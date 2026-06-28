// api/discord-logger.js
// Vercel serverless function to dispatch logs to Discord Log Channel via Bot REST API

function parseUserAgent(ua) {
    if (!ua) return { browser: "Unknown Browser", device: "Unknown Device" };
    let browser = "Unknown Browser";
    let device = "Unknown Device";

    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Chrome/") && !ua.includes("Edg/") && !ua.includes("OPR/")) browser = "Chrome";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

    if (ua.includes("Windows")) device = "Windows PC";
    else if (ua.includes("Macintosh")) device = "Mac";
    else if (ua.includes("iPhone")) device = "iPhone";
    else if (ua.includes("iPad")) device = "iPad";
    else if (ua.includes("Android")) device = "Android Device";
    else if (ua.includes("Linux")) device = "Linux PC";

    return { browser, device };
}

async function sendToDiscordWithRetry(url, options, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            const text = await response.text();
            console.warn(`Discord API attempt ${attempt} failed with status ${response.status}: ${text}`);
            
            if (response.status === 429) {
                // Rate limited, get wait time from headers
                const retryAfter = response.headers.get("Retry-After");
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * attempt;
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }
        } catch (error) {
            console.error(`Discord API attempt ${attempt} network error:`, error);
        }
        
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, delay * attempt));
        }
    }
    throw new Error("Failed to send message to Discord after multiple attempts");
}

export default async function handler(req, res) {
    // Add CORS headers so local testing and Vercel both work
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { event, title, fields = [], color = 5814770, link } = req.body;

    // Check environment variables
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_LOG_CHANNEL_ID;

    if (!token || !channelId) {
        console.error("Missing Discord Server Environment Variables (DISCORD_BOT_TOKEN / DISCORD_LOG_CHANNEL_ID)");
        return res.status(500).json({ error: "Server Configuration Error: Bot Token or Log Channel is not set." });
    }

    try {
        // Extract client IP and Browser details
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'Unknown IP';
        const userAgentStr = req.headers['user-agent'] || 'Unknown User Agent';
        const { browser, device } = parseUserAgent(userAgentStr);

        // Build Embed Fields
        const embedFields = [...fields];
        embedFields.push({ name: "📍 العنوان الرقمي (IP Address)", value: ip, inline: true });
        embedFields.push({ name: "💻 المتصفح (Browser)", value: browser, inline: true });
        embedFields.push({ name: "📱 الجهاز (Device)", value: device, inline: true });

        const embed = {
            title: title || "تنبيه جديد من الموقع",
            color: parseInt(color) || 5814770,
            fields: embedFields.map(f => ({ name: f.name, value: f.value, inline: !!f.inline })),
            timestamp: new Date().toISOString()
        };

        if (link) {
            embed.url = link;
        }

        const payload = {
            embeds: [embed]
        };

        const discordUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
        const options = {
            method: "POST",
            headers: {
                "Authorization": `Bot ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "DiscordBot (https://3m-store-3.vercel.app, 1.0.0)"
            },
            body: JSON.stringify(payload)
        };

        await sendToDiscordWithRetry(discordUrl, options);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Server-side Error in /api/discord-logger:", error);
        
        // Try fallback plain-text alert to Discord
        try {
            const fallbackPayload = {
                content: `⚠️ **Server Logger Error**: ${error.message}\n` +
                         `*IP*: ${req.headers['x-forwarded-for'] || 'Unknown'}\n` +
                         `*Event*: \`${event || 'unknown'}\``
            };
            await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(fallbackPayload)
            });
        } catch (discordErr) {
            console.error("Failed to send fallback alert to Discord:", discordErr);
        }

        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
