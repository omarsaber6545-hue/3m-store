import { getDb } from './_lib/db.js';

async function sendDiscordMessageWithAttachment(token, channelId, content, attachment) {
    const userAgent = "DiscordBot (https://3m-store-3.vercel.app, 1.0.0)";
    
    if (!attachment || !attachment.data) {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${token}`,
                "Content-Type": "application/json",
                "User-Agent": userAgent
            },
            body: JSON.stringify({ content })
        });
        return response.ok;
    }

    try {
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2, 15);
        const metaJson = JSON.stringify({ content });
        
        const base64Data = attachment.data.split(",")[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const parts = [
            `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${metaJson}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${attachment.name}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
            buffer,
            `\r\n--${boundary}--\r\n`
        ];

        const bodyBuffer = Buffer.concat(
            parts.map(part => typeof part === 'string' ? Buffer.from(part) : part)
        );

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${token}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "User-Agent": userAgent
            },
            body: bodyBuffer
        });

        return response.ok;
    } catch (err) {
        console.error("Error sending Discord attachment:", err.message);
        return false;
    }
}

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
    const guildId = process.env.DISCORD_GUILD_ID;
    const categoryId = process.env.DISCORD_TICKETS_CATEGORY_ID;

    if (!token || !guildId || !categoryId) {
        console.error("Missing Discord configurations on Vercel environment");
        return res.status(500).json({ error: "Server Configuration Error: Discord Bot Token, Guild ID, or Category ID is not set." });
    }

    const userAgent = "DiscordBot (https://3m-store-3.vercel.app, 1.0.0)";
    const db = await getDb();

    // --- GET: Fetch support history directly from Discord ---
    if (req.method === 'GET') {
        const { action, ticketId } = req.query;
        if (!ticketId) {
            return res.status(400).json({ error: "Missing ticketId parameter" });
        }

        try {
            let discordChannelId = null;
            if (db) {
                const ticketResult = await db.query("SELECT * FROM support_tickets WHERE id = $1", [ticketId]);
                if (ticketResult.rows.length > 0) {
                    discordChannelId = ticketResult.rows[0].discord_channel_id;
                    if (ticketResult.rows[0].status === 'closed') {
                        return res.status(200).json({ closed: true, messages: [] });
                    }
                }
            }

            if (!discordChannelId) {
                return res.status(404).json({ error: "Ticket not found or channel not linked." });
            }

            const response = await fetch(`https://discord.com/api/v10/channels/${discordChannelId}/messages?limit=100`, {
                headers: {
                    "Authorization": `Bot ${token}`,
                    "User-Agent": userAgent
                }
            });

            if (response.status === 404) {
                if (db) {
                    await db.query("UPDATE support_tickets SET status = 'closed' WHERE id = $1", [ticketId]);
                }
                return res.status(200).json({ closed: true, messages: [] });
            }

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: "Discord API Error", details: errText });
            }

            const messages = await response.json();
            const mapped = [];

            for (const msg of messages) {
                if (msg.embeds && msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes("تذكرة دعم جديدة")) {
                    continue;
                }

                let isStaff = !msg.author.bot;
                let authorName = msg.member?.nick || msg.author.global_name || msg.author.username;
                let content = msg.content;
                let isAI = false;

                if (msg.author.bot) {
                    if (content.startsWith("👤 **")) {
                        const match = content.match(/^👤 \*\*([^\*]+)\*\*: (.*)$/s);
                        if (match) {
                            authorName = match[1];
                            content = match[2];
                            isStaff = false;
                        }
                    } else if (content.startsWith("🤖 **")) {
                        const match = content.match(/^🤖 \*\*([^\*]+)\*\*: (.*)$/s);
                        if (match) {
                            authorName = match[1];
                            content = match[2];
                            isStaff = true;
                            isAI = true;
                        }
                    } else {
                        continue;
                    }
                }

                mapped.push({
                    id: msg.id,
                    is_staff: isStaff,
                    is_ai: isAI,
                    author: authorName,
                    content: content,
                    timestamp: msg.timestamp,
                    attachments: msg.attachments ? msg.attachments.map(att => ({ url: att.url, name: att.name })) : []
                });
            }

            mapped.reverse();
            return res.status(200).json({ success: true, messages: mapped });
        } catch (error) {
            console.error("Error fetching support history:", error);
            return res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }

    // --- POST: Create Ticket or Send Message ---
    if (req.method === 'POST') {
        const { action, ticketId, username, userId, message, attachment } = req.body;

        if (action === 'create') {
            if (!ticketId || !username) {
                return res.status(400).json({ error: "Missing ticketId or username" });
            }

            try {
                const channelResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "Content-Type": "application/json",
                        "User-Agent": userAgent
                    },
                    body: JSON.stringify({
                        name: `tck-${username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)}-${ticketId.substring(4)}`,
                        type: 0,
                        parent_id: categoryId
                    })
                });

                if (!channelResponse.ok) {
                    const errText = await channelResponse.text();
                    return res.status(channelResponse.status).json({ error: "Failed to create channel in Discord", details: errText });
                }

                const channelData = await channelResponse.json();
                const newChannelId = channelData.id;

                let email = "Guest / غير مسجل";
                let discordId = "Guest / غير مسجل";
                let joinDate = "N/A";
                let avatarUrl = null;

                if (userId && db) {
                    try {
                        const userResult = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
                        if (userResult.rows.length > 0) {
                            const user = userResult.rows[0];
                            email = user.email || "No Email Provided";
                            discordId = user.id;
                            joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A";
                            if (user.avatar) {
                                avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
                            }
                        }
                    } catch (dbErr) {
                        console.error("Error fetching user profile:", dbErr.message);
                    }
                }

                const embedPayload = {
                    embeds: [{
                        title: `🎫 تذكرة دعم جديدة (New Support Ticket): ${ticketId}`,
                        color: 3447003,
                        thumbnail: avatarUrl ? { url: avatarUrl } : null,
                        fields: [
                            { name: "👤 اسم المستخدم (Username)", value: username, inline: true },
                            { name: "🆔 معرف ديسكورد (Discord ID)", value: discordId, inline: true },
                            { name: "📧 البريد الإلكتروني (Email)", value: email, inline: true },
                            { name: "📅 تاريخ الانضمام (Join Date)", value: joinDate, inline: true },
                            { name: "ℹ️ حالة الجلسة (Session)", value: userId ? "🔐 مسجل دخول ديسكورد (Discord Auth)" : "👤 زائر (Guest)", inline: false },
                            { name: "✏️ الإرشادات (Instructions)", value: "الرد هنا سيصل للعميل بالوقت الفعلي. اكتب ردك مباشرة في الشات وسيظهر للعميل فوراً.\nType your response here to reply to the user instantly.", inline: false }
                        ],
                        timestamp: new Date().toISOString()
                    }],
                    components: [{
                        type: 1,
                        components: [{
                            type: 2,
                            style: 4,
                            custom_id: "close_ticket",
                            label: "🔒 إغلاق التذكرة (Close Ticket)"
                        }]
                    }]
                };

                await fetch(`https://discord.com/api/v10/channels/${newChannelId}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "Content-Type": "application/json",
                        "User-Agent": userAgent
                    },
                    body: JSON.stringify(embedPayload)
                });

                if (db) {
                    await db.query(
                        "INSERT INTO support_tickets (id, user_id, discord_channel_id, status) VALUES ($1, $2, $3, 'open')",
                        [ticketId, userId || null, newChannelId]
                    );
                    await db.query(
                        "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, is_staff) VALUES ($1, 'system', 'System', 'Support session started.', true)",
                        [ticketId]
                    );
                }

                return res.status(200).json({ success: true, ticketId, discordChannelId: newChannelId });
            } catch (error) {
                console.error("Error creating support ticket:", error);
                return res.status(500).json({ error: "Internal Server Error", details: error.message });
            }
        }

        if (action === 'send') {
            if (!ticketId || !username || (!message && !attachment)) {
                return res.status(400).json({ error: "Missing parameters" });
            }

            try {
                let discordChannelId = null;
                if (db) {
                    const ticketResult = await db.query("SELECT * FROM support_tickets WHERE id = $1", [ticketId]);
                    if (ticketResult.rows.length > 0) {
                        discordChannelId = ticketResult.rows[0].discord_channel_id;
                    }
                }

                if (!discordChannelId) {
                    return res.status(404).json({ error: "Ticket channel not found." });
                }

                const displayContent = `👤 **${username}**: ${message || ""}`;
                const success = await sendDiscordMessageWithAttachment(token, discordChannelId, displayContent, attachment);
                
                if (!success) {
                    return res.status(500).json({ error: "Failed to dispatch message to Discord API" });
                }

                if (db) {
                    const localAtts = attachment ? [{ name: attachment.name, url: "" }] : [];
                    await db.query(
                        "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, $2, $3, $4, $5, false)",
                        [ticketId, userId || null, username, message || "", JSON.stringify(localAtts)]
                    );
                }

                return res.status(200).json({ success: true });
            } catch (error) {
                console.error("Error dispatching message:", error);
                return res.status(500).json({ error: "Internal Server Error", details: error.message });
            }
        }

        return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
