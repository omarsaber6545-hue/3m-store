import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { getDb } from './api/_lib/db.js';
import { Client, GatewayIntentBits, ChannelType, AttachmentBuilder } from 'discord.js';

// Vercel Serverless API handlers
import portalHandler from './api/portal.js';
import checkoutHandler from './api/checkout.js';
import adminOrdersHandler from './api/admin-orders.js';
import discordProfileHandler from './api/discord-profile.js';
import configHandler from './api/config.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

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
    console.log(`🤖 Discord Support Bot logged in as ${discordClient.user.tag}`);
});

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

            io.to(ticket.id).emit('message', {
                is_staff: true,
                author: msg.member?.displayName || msg.author.username,
                avatar: msg.author.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : null,
                content: msg.content,
                attachments: attachments,
                timestamp: new Date().toISOString()
            });

            console.log(`💬 Support Bridge: Broadcasted staff reply to room [${ticket.id}]`);
        } catch (err) {
            console.error("Error processing staff message:", err);
        }
    }
});

// --- Initialize Socket.IO support connection ---
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
            console.error("Error fetching history:", err);
        }
    });

    socket.on('message', async ({ ticketId, username, userId, message, attachment }) => {
        if (!ticketId || !username || (!message && !attachment)) return;

        try {
            const db = await getDb();
            if (!db) return;

            let ticketResult = await db.query("SELECT * FROM support_tickets WHERE id = $1", [ticketId]);
            let discordChannelId = null;

            if (ticketResult.rows.length > 0) {
                discordChannelId = ticketResult.rows[0].discord_channel_id;
            }

            if (!discordChannelId) {
                try {
                    const guild = await discordClient.guilds.fetch(GUILD_ID);
                    const channelName = `tck-${username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)}-${ticketId.substring(4)}`;
                    
                    const channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: CATEGORY_ID
                    });

                    discordChannelId = channel.id;

                    await db.query(
                        "INSERT INTO support_tickets (id, user_id, discord_channel_id, status) VALUES ($1, $2, $3, 'open') ON CONFLICT (id) DO UPDATE SET discord_channel_id = $3",
                        [ticketId, userId || null, discordChannelId]
                    );

                    const embed = {
                        title: `🎟️ تذكرة دعم جديدة: ${ticketId}`,
                        color: 3447003,
                        fields: [
                            { name: "اسم العميل (Client Name)", value: username, inline: true },
                            { name: "معرف العميل (User ID)", value: userId || "N/A", inline: true },
                            { name: "الإرشادات (Instructions)", value: "الرد داخل هذه القناة سيصل للمشترك على الموقع بالوقت الفعلي.\nType your response here to reply to the user instantly." }
                        ],
                        timestamp: new Date().toISOString()
                    };

                    await channel.send({ embeds: [embed] });
                    console.log(`🎟️ Support Bridge: Automatically created Discord channel #${channelName}`);
                } catch (err) {
                    console.error("Failed to automatically create Discord channel:", err);
                }
            }

            const attachmentArray = [];
            if (attachment) {
                attachmentArray.push({ name: attachment.name, data: attachment.data });
            }

            await db.query(
                "INSERT INTO support_messages (ticket_id, sender_id, sender_name, content, attachments, is_staff) VALUES ($1, $2, $3, $4, $5, false)",
                [ticketId, userId || null, username, message || "", JSON.stringify(attachmentArray)]
            );

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
                    }
                } catch (discordErr) {
                    console.error("Failed to post message to Discord channel:", discordErr);
                }
            }

            io.to(ticketId).emit('message', {
                is_staff: false,
                author: username,
                content: message || "",
                attachments: attachmentArray,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error("Error processing user support message:", err);
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
            console.error("❌ Failed to log in Discord bot:", err);
        });
    } else {
        console.warn("⚠️ DISCORD_BOT_TOKEN environment variable not set. Discord features will be offline.");
    }
});
