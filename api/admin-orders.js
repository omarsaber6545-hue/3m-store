// api/admin-orders.js
// Serverless function to manage orders from the admin panel via Discord API

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

    // --- GET: Fetch all orders from Discord ---
    if (req.method === 'GET') {
        try {
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
                // Check if this message is a store purchase embed
                if (embed && (embed.title && embed.title.includes("طلب شراء جديد"))) {
                    const fields = embed.fields || [];
                    
                    const getVal = (labels) => {
                        const field = fields.find(f => labels.some(lbl => f.name.includes(lbl)));
                        return field ? field.value : "";
                    };

                    const order = {
                        id: msg.id, // Discord message ID (database key)
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
                        timestamp: embed.timestamp || msg.timestamp,
                        proofImageUrl: (msg.attachments && msg.attachments[0]) ? msg.attachments[0].url : null
                    };

                    ordersList.push(order);
                }
            });

            return res.status(200).json({ orders: ordersList });
        } catch (error) {
            console.error("Error fetching orders from Discord:", error);
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
            // If action is Delete
            if (action === 'delete') {
                const delResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bot ${token}`,
                        "User-Agent": userAgent
                    }
                });

                if (!delResponse.ok) {
                    const errText = await delResponse.text();
                    return res.status(delResponse.status).json({ error: "Failed to delete message", details: errText });
                }

                return res.status(200).json({ success: true });
            }

            // For Approve or Reject: we must fetch the message first, edit it, and patch it back
            const getResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                headers: {
                    "Authorization": `Bot ${token}`,
                    "User-Agent": userAgent
                }
            });

            if (!getResponse.ok) {
                const errText = await getResponse.text();
                return res.status(getResponse.status).json({ error: "Order not found", details: errText });
            }

            const message = await getResponse.json();
            const embed = message.embeds && message.embeds[0];
            if (!embed) {
                return res.status(400).json({ error: "Invalid order format" });
            }

            let newStatus = "pending_review";
            let newColor = 16761095;

            if (action === 'approve') {
                newStatus = "paid";
                newColor = 3066993; // Green
            } else if (action === 'reject') {
                newStatus = "failed";
                newColor = 15158332; // Red
            }

            // Edit status field in the embed
            const statusFieldIndex = embed.fields.findIndex(f => f.name.includes("حالة الدفع") || f.name.includes("Payment Status"));
            if (statusFieldIndex !== -1) {
                embed.fields[statusFieldIndex].value = newStatus;
            }
            embed.color = newColor;

            // Patch the message on Discord
            const patchResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bot ${token}`,
                    "Content-Type": "application/json",
                    "User-Agent": userAgent
                },
                body: JSON.stringify({
                    embeds: [embed]
                })
            });

            if (!patchResponse.ok) {
                const errText = await patchResponse.text();
                return res.status(patchResponse.status).json({ error: "Failed to update order on Discord", details: errText });
            }

            return res.status(200).json({ success: true, status: newStatus });
        } catch (error) {
            console.error("Error updating order on Discord:", error);
            return res.status(500).json({ error: "Server Error", details: error.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
