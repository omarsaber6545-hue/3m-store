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

    // --- GET: Fetch order status ---
    if (req.method === 'GET') {
        const { orderId } = req.query;
        if (!orderId) {
            return res.status(400).json({ error: "Missing orderId parameter" });
        }

        try {
            // First check PostgreSQL
            const db = await getDb();
            if (db) {
                const orderResult = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
                if (orderResult.rows.length > 0) {
                    return res.status(200).json({ orderId, status: orderResult.rows[0].status });
                }
            }

            // Fallback to Discord API if database query fails or isn't set
            const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${orderId}`, {
                headers: {
                    "Authorization": `Bot ${token}`,
                    "User-Agent": userAgent
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: "Order not found", details: errText });
            }

            const message = await response.json();
            const embed = message.embeds && message.embeds[0];
            if (!embed) {
                return res.status(400).json({ error: "Invalid order format" });
            }

            const statusField = embed.fields.find(f => f.name.includes("حالة الدفع") || f.name.includes("Payment Status"));
            const status = statusField ? statusField.value : "pending";

            return res.status(200).json({ orderId, status });
        } catch (error) {
            console.error("Error checking order status:", error);
            return res.status(500).json({ error: "Server Error", details: error.message });
        }
    }

    // --- POST: Create Order ---
    if (req.method === 'POST') {
        const {
            clientName,
            clientEmail,
            clientDiscord,
            prodName,
            prodPrice,
            clientDetails,
            paymentMethod,
            transactionId,
            senderPhone,
            proofImage,
            couponCode,
            userId
        } = req.body;

        if (!clientName || !clientEmail || !clientDiscord || !prodName || !prodPrice || !paymentMethod) {
            return res.status(400).json({ error: "Missing required order fields" });
        }

        let discount = 0;
        let finalPrice = parseFloat(prodPrice) || 0;
        
        const db = await getDb();
        if (db && couponCode) {
            try {
                const couponResult = await db.query(
                    "SELECT * FROM coupons WHERE code = $1 AND active = true AND expiry_date > NOW() AND (max_uses = 0 OR current_uses < max_uses)",
                    [couponCode.trim().toUpperCase()]
                );
                if (couponResult.rows.length > 0) {
                    const coupon = couponResult.rows[0];
                    if (finalPrice >= parseFloat(coupon.min_purchase)) {
                        if (coupon.type === "percentage") {
                            discount = (finalPrice * parseFloat(coupon.value)) / 100;
                        } else {
                            discount = parseFloat(coupon.value);
                        }
                        finalPrice = Math.max(0, finalPrice - discount);
                        
                        await db.query(
                            "UPDATE coupons SET current_uses = current_uses + 1 WHERE code = $1",
                            [coupon.code]
                        );
                    }
                }
            } catch (err) {
                console.error("Coupon validation error:", err);
            }
        }

        const orderCode = `#3M-${Math.floor(10000 + Math.random() * 90000)}`;
        
        let initialStatus = "pending_review";
        let statusColor = 16761095;
        
        if (paymentMethod === "paypal") {
            initialStatus = "paid";
            statusColor = 3066993;
        }

        const embed = {
            title: `🛒 طلب شراء جديد ${orderCode}`,
            color: statusColor,
            fields: [
                { name: "رقم الطلب (Order ID)", value: orderCode, inline: true },
                { name: "العميل (Customer)", value: clientName, inline: true },
                { name: "البريد الإلكتروني (Email)", value: clientEmail, inline: true },
                { name: "حساب ديسكورد (Discord)", value: clientDiscord, inline: true },
                { name: "المنتج المطلوب (Product)", value: prodName, inline: true },
                { name: "السعر الأصلي (Base Price)", value: `${prodPrice} EGP`, inline: true },
                { name: "الخصم المطبق (Discount)", value: `${discount} EGP`, inline: true },
                { name: "السعر النهائي (Final Price)", value: `${finalPrice} EGP`, inline: true },
                { name: "طريقة الدفع (Payment Method)", value: paymentMethod.toUpperCase(), inline: true },
                { name: "رقم العملية (Transaction ID)", value: transactionId || "N/A", inline: true },
                { name: "رقم المرسل (Sender Phone)", value: senderPhone || "N/A", inline: true },
                { name: "حالة الدفع (Payment Status)", value: initialStatus, inline: true },
                { name: "تفاصيل الطلب (Details)", value: clientDetails || "لا يوجد / No details" }
            ],
            timestamp: new Date().toISOString()
        };

        let fileBuffer = null;
        let contentType = "image/png";

        if (proofImage && proofImage.includes("base64,")) {
            try {
                const parts = proofImage.split(",");
                const base64Data = parts[1];
                const mimeMatch = parts[0].match(/data:(.*?);/);
                if (mimeMatch) {
                    contentType = mimeMatch[1];
                }
                fileBuffer = Buffer.from(base64Data, 'base64');
                embed.image = { url: "attachment://proof.png" };
            } catch (err) {
                console.error("Error parsing proof image base64:", err);
            }
        }

        try {
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            const payload = { embeds: [embed] };

            let body = Buffer.alloc(0);
            body = Buffer.concat([
                body,
                Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`)
            ]);

            if (fileBuffer) {
                const fileExt = contentType.includes("jpeg") ? "jpg" : "png";
                body = Buffer.concat([
                    body,
                    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="proof.${fileExt}"\r\nContent-Type: ${contentType}\r\n\r\n`),
                    fileBuffer,
                    Buffer.from(`\r\n`)
                ]);
            }

            body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

            const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${token}`,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "User-Agent": userAgent
                },
                body: body
            });

            if (!discordResponse.ok) {
                const errText = await discordResponse.text();
                throw new Error(`Discord API failed: ${errText}`);
            }

            const messageData = await discordResponse.json();
            const messageId = messageData.id;

            // Save to PostgreSQL
            if (db) {
                const queryText = `
                    INSERT INTO orders (id, user_id, product_name, price, discount, final_price, coupon_code, payment_method, transaction_id, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
                `;
                await db.query(queryText, [
                    messageId,
                    userId || null,
                    prodName,
                    parseFloat(prodPrice),
                    discount,
                    finalPrice,
                    couponCode || null,
                    paymentMethod,
                    transactionId || null,
                    initialStatus
                ]);
            }

            return res.status(200).json({
                success: true,
                orderId: messageId,
                orderCode: orderCode,
                status: initialStatus,
                finalPrice: finalPrice
            });
        } catch (error) {
            console.error("Error creating order on Discord:", error);
            return res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
