// api/ai-chat.js
// Secure serverless endpoint to handle AI support chat completions via OpenRouter API

export default async function handler(req, res) {
    // Add CORS headers
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

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
        console.error("Missing OPENROUTER_API_KEY in Server Environment Variables");
        return res.status(500).json({ error: "Server Configuration Error: AI API Key is not configured." });
    }

    const { message, history = [] } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Missing message parameter" });
    }

    // System prompt detailing 3M Studio services and info
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

    // Map conversation history to OpenRouter format
    const messages = [
        { role: "system", content: systemPrompt }
    ];

    // Add recent history (up to last 10 messages to save context tokens)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
        messages.push({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text
        });
    });

    // Add current user message
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
            const errText = await response.text();
            console.error("OpenRouter API Error:", errText);
            return res.status(response.status).json({ error: "OpenRouter API Error", details: errText });
        }

        const data = await response.json();
        const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        
        if (!reply) {
            throw new Error("Invalid API response format");
        }

        return res.status(200).json({ reply });
    } catch (error) {
        console.error("Error in AI Chat Serverless function:", error);
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
