// api/discord-chat.js
// Secure serverless endpoint to bridge client-side live chat with Discord Threads

export default async function handler(req, res) {
    // Add CORS headers
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
        return res.status(500).json({ error: "Server Configuration Error: Bot Token or Log Channel is not set." });
    }

    const userAgent = "DiscordBot (https://3m-store-3.vercel.app, 1.0.0)";

    // --- GET: Fetch messages from thread ---
    if (req.method === 'GET') {
        const { threadId } = req.query;
        if (!threadId) {
            return res.status(400).json({ error: "Missing threadId parameter" });
        }

        try {
            const response = await fetch(`https://discord.com/api/v10/channels/${threadId}/messages?limit=50`, {
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

            // Map all messages and include an isBot flag so client can separate them
            const mappedMessages = messages.map(msg => ({
                id: msg.id,
                isBot: msg.author.bot || false,
                author: msg.author.global_name || msg.author.username,
                avatar: msg.author.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : null,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            // Reverse to chronological order (oldest first)
            mappedMessages.reverse();

            return res.status(200).json({ messages: mappedMessages });
        } catch (error) {
            console.error("Error fetching Discord thread messages:", error);
            return res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }

    // --- POST: Create Thread or Send Message ---
    if (req.method === 'POST') {
        const { action, username, message, threadId } = req.body;

        if (action === 'create') {
            if (!username || !message) {
                return res.status(400).json({ error: "Missing username or message for thread creation" });
            }

            try {
                // 1. Create a Public Thread in the log channel
                const threadResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "Content-Type": "application/json",
                        "User-Agent": userAgent
                    },
                    body: JSON.stringify({
                        name: `💬 دعم - ${username}`,
                        auto_archive_duration: 1440,
                        type: 11 // GUILD_PUBLIC_THREAD
                    })
                });

                if (!threadResponse.ok) {
                    const errText = await threadResponse.text();
                    return res.status(threadResponse.status).json({ error: "Failed to create thread", details: errText });
                }

                const threadData = await threadResponse.json();
                const newThreadId = threadData.id;

                // 2. Post the first message in the thread
                const msgResponse = await fetch(`https://discord.com/api/v10/channels/${newThreadId}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "Content-Type": "application/json",
                        "User-Agent": userAgent
                    },
                    body: JSON.stringify({
                        content: `🆕 **بدأت تذكرة دعم مباشر جديدة**\n👤 **الاسم**: ${username}\n💬 **الرسالة الأولى**: ${message}\n\n*الرد داخل هذا الخيط سيصل للعميل على الموقع مباشرة.*`
                    })
                });

                if (!msgResponse.ok) {
                    const errText = await msgResponse.text();
                    console.error("Failed to post initial message in thread:", errText);
                }

                return res.status(200).json({ threadId: newThreadId });
            } catch (error) {
                console.error("Error creating Discord thread:", error);
                return res.status(500).json({ error: "Internal Server Error", details: error.message });
            }
        } 
        
        if (action === 'send') {
            if (!threadId || !username || !message) {
                return res.status(400).json({ error: "Missing threadId, username, or message" });
            }

            try {
                // Post message in existing thread
                const response = await fetch(`https://discord.com/api/v10/channels/${threadId}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "Content-Type": "application/json",
                        "User-Agent": userAgent
                    },
                    body: JSON.stringify({
                        content: `👤 **${username}**: ${message}`
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    return res.status(response.status).json({ error: "Failed to send message to thread", details: errText });
                }

                return res.status(200).json({ success: true });
            } catch (error) {
                console.error("Error sending message to Discord thread:", error);
                return res.status(500).json({ error: "Internal Server Error", details: error.message });
            }
        }

        return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
