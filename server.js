import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { getDb } from './api/_lib/db.js';
import { Client, GatewayIntentBits, ChannelType, AttachmentBuilder } from 'discord.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Vercel Serverless API handlers
import portalHandler from './api/portal.js';
import checkoutHandler from './api/checkout.js';
import adminOrdersHandler from './api/admin-orders.js';
import discordProfileHandler from './api/discord-profile.js';
import configHandler from './api/config.js';

// Mount Vercel API handlers on Express
app.all('/api/portal', portalHandler);
app.all('/api/checkout', checkoutHandler);
app.all('/api/admin-orders', adminOrdersHandler);
app.all('/api/discord-profile', discordProfileHandler);
app.all('/api/config', configHandler);

// Serve static frontend files
app.use(express.static('.'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CATEGORY_ID = process.env.DISCORD_TICKETS_CATEGORY_ID;

// --- Initialize Discord Bot Client ---
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.on('ready', () => {
    console.log(`[Discord] Connected Successfully as ${discordClient.user.tag}`);
});

// Helper: Ensure a Discord channel is created for this support ticket
async function getOrCreateTicketChannel(db, ticketId, username, userId) {
    let ticketResult = await db.query("SELECT * FROM support_tickets WHERE id = $1", [ticketId]);
    let discordChannelId = null;

    if (ticketResult.rows.length > 0) {
        discordChannelId = ticketResult.rows[0].discord_channel_id;
    }

    if (!discordChannelId) {
        try {
            console.log(`[Ticket] Attempting to create Discord Channel for Ticket #${ticketId}`);
            const guild = await discordClient.guilds.fetch(GUILD_ID);
            const channelName = `tck-${username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)}-${ticketId.substring(4)}`;
            
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID
            });

            discordChannelId = channel.id;

            // Save to DB
            await db.query(
                "INSERT INTO support_tickets (id, user_id, discord_channel_id, status) VALUES ($1, $2, $3, 'open') ON CONFLICT (id) DO UPDATE SET discord_channel_id = $3",
                [ticketId, userId || null, discordChannelId]
            );
            console.log(`[Database] Ticket Saved #${ticketId}`);

            // Fetch user profile from database to get real email, avatar, levels
            let email = "Guest / غير مسجل";
            let discordId = "Guest / غير مسجل";
            let joinDate = "N/A";
            let avatarUrl = null;

            if (userId) {
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
            }

            const embed = {
                title: `🎫 تذكرة دعم جديدة (New Support Ticket): ${ticketId}`,
                color: 3447003,
                thumbnail: avatarUrl ? { url: avatarUrl } : null,
                fields: [
                    { name: "👤 اسم المستخدم (Username)", value: username, inline: true },
                    { name: "🆔 معرف ديسكورد (Discord ID)", value: discordId, inline: true },
                    { name: "📧 البريد الإلكتروني (Email)", value: email, inline: true },
                    { name: "📅 تاريخ الانضمام (Join Date)", value: joinDate, inline: true },
                    { name: "ℹ️ حالة الجلسة (Session)", value: userId ? "🔐 مسجل دخول ديسكورد (Discord Auth)" : "👤 زائر (Guest)", inline: false },
                    { name: "✏️ الإرشادات (Instructions)", value: "الرد هنا سيصل للعميل بالوقت الفعلي. إذا كان العميل يدردش مع الذكاء الاصطناعي، فإن أي رد ترسله هنا سيحول المحادثة فوراً إلى وضع الدعم البشري ويتوقف الذكاء الاصطناعي.\nType your response here to take over and reply to the user instantly.", inline: false }
                ],
                timestamp: new Date().toISOString()
            };

            await channel.send({ embeds: [embed] });
            console.log(`[Discord] Created Ticket #${ticketId} successfully on Discord Server.`);
        } catch (err) {
            console.error(`[Discord] Failure creating ticket channel for #${ticketId}:`, err.message);
        }
    }

    return discordChannelId;
}

// Helper: Fetch OpenRouter AI completions
async function generateAIResponse(message, history = []) {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
        console.warn("[AI] OPENROUTER_API_KEY is not set. Using fallback AI response.");
        return "المساعد الذكي غير متاح حالياً / AI Assistant is currently offline.";
    }

    const systemPrompt = `
You are the official AI Assistant of "3M Studio" (ثري إم ستوديوز).
Your role is to help website visitors, answer questions about our services, and act as a professional sales/support representative.

About 3M Studio:
- We are a professional agency offering custom Roblox game development, Discord Bot integrations, and modern web development.
- Theme & Vibe: Gamer-centric, futuristic, neon-cyan/purple theme, highly professional.

Our Services & Pricing:
1. Roblox Game Development:
   - Full Roblox game creation, custom scripting (Luau), high-quality maps, and responsive user interfaces.
   - Pricing: Custom-quoted. Base prices start at $45 - $90 for UI/Scripting, and $150+ for full game maps (users can see rates in services section and convert to EGP or EUR).
2. Discord Configurations & Bot Development:
   - Professional server setups, custom bots with database integrations (like this website logger), and automated ticket verification systems.
   - Pricing: Custom-quoted. Base rates start at $25 - $45.
3. Web Development:
   - Gamer community websites, custom landing pages, portfolios, and admin dashboards with database connections.
   - Pricing: Custom-quoted. Base rates start at $45 - $120+.

Conversational Guidelines:
- Respond in the language of the user (e.g., if they ask in Arabic, respond in clear, helpful, and friendly Arabic. If in English, respond in English).
- Be polite, direct, concise, and encourage them to order or ask questions.
- If the user wants to talk to a human supporter, has a complex order, or wants custom quotes, tell them:
  - "يمكنك الضغط على زر '👤 تحدث مع الدعم البشري' الموجود في أعلى نافذة الشات للتحويل فوراً إلى موظف بشري في ديسكورد." (or the English equivalent: "You can click the '👤 Talk to Human' button in the chat header to talk to a support representative on Discord.")
  - Or invite them to submit the contact form at the bottom of the page or join the Discord server.

Keep your answers short and conversational (1-3 paragraphs max) as they are displayed inside a small chat widget.
`;

    const messages = [
        { role: "system", content: systemPrompt }
    ];

    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
        messages.push({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text
        });
    });

    messages.push({ role: "user", content: message });

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://3m-store-3.vercel.app",
                "X-Title": "3M Studio Store Support AI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o",
                messages: messages,
                max_tokens: 400,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No reply generated.";
    } catch (err) {
        console.error("[AI] Error fetching completion from OpenRouter:", err.message);
        return "عذرًا، واجهت مشكلة في معالجة طلبك حاليًا. / Sorry, I had trouble processing that request.";
    }
}

// Listener: Staff reply from Discord text channels inside CATEGORY_ID
discordClient.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;

    if (msg.channel.parentId === CATEGORY_ID) {
        try {
            const db = await getDb();
            if (!db) return;

            const ticketResult = await db.query(
                "SELECT * FROM support_tickets WHERE discord_channel_id = $1 AND status = 'open'",
                [msg.channel.id]
            );

            if (ticketResult.rows.length === 0) return;
            const ticket = ticketResult.rows[0];

            const attachments = [];
            msg.attachments.forEach(att => {
                attachments.push({ url: att.url, name: att.name });
            });

            await db.query(
                "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, $2, $3, $4, $5, true)",
                [ticket.id, msg.author.id, msg.member?.displayName || msg.author.username, msg.content, JSON.stringify(attachments)]
            );
            console.log(`[Database] Message Saved from Staff [${msg.author.username}]`);

            // Broadcast message via Socket.IO
            io.to(ticket.id).emit('message', {
                is_staff: true,
                author: msg.member?.displayName || msg.author.username,
                avatar: msg.author.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : null,
                content: msg.content,
                attachments: attachments,
                timestamp: new Date().toISOString()
            });

            console.log(`[Discord] Message Sent Successfully (Staff reply bridged to room [${ticket.id}])`);
        } catch (err) {
            console.error("[Discord] Failure bridging staff reply:", err.message);
        }
    }
});

// --- Initialize Socket.IO Support Connection ---
io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO Support Bridge: ${socket.id}`);

    socket.on('join', async ({ ticketId, username, userId }) => {
        if (!ticketId || !username) return;
        socket.join(ticketId);
        console.log(`👤 Client [${username}] joined support room [${ticketId}]`);

        try {
            const db = await getDb();
            if (!db) return;

            const historyResult = await db.query(
                "SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC LIMIT 100",
                [ticketId]
            );

            const history = historyResult.rows.map(row => ({
                is_staff: row.is_staff,
                author: row.sender_name,
                content: row.content,
                attachments: row.attachments || [],
                timestamp: row.created_at
            }));

            socket.emit('history', history);
        } catch (err) {
            console.error("[Database] Failure fetching message history:", err.message);
        }
    });

    // Event: User chats with the AI Assistant
    socket.on('ai_message', async ({ ticketId, username, userId, message, history }) => {
        if (!ticketId || !username || !message) return;
        console.log(`[AI Message] Received user AI message in Ticket #${ticketId}: "${message}"`);

        try {
            const db = await getDb();
            if (!db) return;

            // 1. Ensure Discord ticket channel and database entry are created
            const discordChannelId = await getOrCreateTicketChannel(db, ticketId, username, userId);

            // 2. Save user message to database
            await db.query(
                "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, $2, $3, $4, '[]'::jsonb, false)",
                [ticketId, userId || null, username, message]
            );

            // 3. Post user message to Discord immediately
            if (discordChannelId) {
                try {
                    const channel = await discordClient.channels.fetch(discordChannelId);
                    if (channel && channel.isTextBased()) {
                        await channel.send({ content: `👤 **${username}** (AI Chat): ${message}` });
                        console.log(`[Discord] Message Sent Successfully (User AI input logged to Discord)`);
                    }
                } catch (err) {
                    console.error("[Discord] Failure posting user AI input to Discord:", err.message);
                }
            }

            // 4. Generate AI Completion
            const reply = await generateAIResponse(message, history);

            // 5. Save AI response to database
            await db.query(
                "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, 'ai-assistant', '3M AI', $2, '[]'::jsonb, true)",
                [ticketId, reply]
            );

            // 6. Post AI response to Discord channel
            if (discordChannelId) {
                try {
                    const channel = await discordClient.channels.fetch(discordChannelId);
                    if (channel && channel.isTextBased()) {
                        await channel.send({ content: `🤖 **3M AI**: ${reply}` });
                        console.log(`[Discord] Message Sent Successfully (AI reply logged to Discord)`);
                    }
                } catch (err) {
                    console.error("[Discord] Failure posting AI response to Discord:", err.message);
                }
            }

            // 7. Emit AI response back to website client
            socket.emit('ai_reply', { reply });

        } catch (err) {
            console.error("[AI Message] Failure processing AI message:", err.message);
        }
    });

    // Event: User chats with human support
    socket.on('message', async ({ ticketId, username, userId, message, attachment }) => {
        if (!ticketId || !username || (!message && !attachment)) return;
        console.log(`[Human Message] Received user human support message in Ticket #${ticketId}: "${message || ''}"`);

        try {
            const db = await getDb();
            if (!db) return;

            // 1. Ensure Discord ticket channel and database entry are created
            const discordChannelId = await getOrCreateTicketChannel(db, ticketId, username, userId);

            // 2. Save user message to database
            const attachmentArray = [];
            if (attachment) {
                attachmentArray.push({ name: attachment.name, data: attachment.data });
            }

            await db.query(
                "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, $2, $3, $4, $5, false)",
                [ticketId, userId || null, username, message || "", JSON.stringify(attachmentArray)]
            );

            // 3. Post user message to Discord channel
            if (discordChannelId) {
                try {
                    const channel = await discordClient.channels.fetch(discordChannelId);
                    if (channel && channel.isTextBased()) {
                        const files = [];
                        if (attachment && attachment.data.includes("base64,")) {
                            const buffer = Buffer.from(attachment.data.split(",")[1], 'base64');
                            files.push(new AttachmentBuilder(buffer, { name: attachment.name }));
                        }
                        
                        await channel.send({
                            content: `👤 **${username}**: ${message || ""}`,
                            files: files
                        });
                        console.log(`[Discord] Message Sent Successfully (User human input logged to Discord)`);
                    }
                } catch (discordErr) {
                    console.error("[Discord] Failure posting user human input to Discord:", discordErr.message);
                }
            }

            // 4. Broadcast message to website client room (e.g. other tabs)
            io.to(ticketId).emit('message', {
                is_staff: false,
                author: username,
                content: message || "",
                attachments: attachmentArray,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error("[Human Message] Failure processing human support message:", err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected from Socket.IO: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 HTTP/Socket.IO Server listening on port ${PORT}`);
    if (BOT_TOKEN) {
        discordClient.login(BOT_TOKEN).catch(err => {
            console.error("❌ [Discord] Failed to log in Discord bot:", err.message);
        });
    } else {
        console.warn("⚠️ DISCORD_BOT_TOKEN environment variable not set. Discord features will be offline.");
    }
});
