/* ==========================================================================
   3M STUDIO - PREMIUM WEB ENGINE & VISUAL LIVE EDITOR (LOCALIZED)
   ========================================================================== */

// --- إعدادات الدفع الإلكتروني (Payment Gateway Config) ---
const VODAFONE_CASH_NUMBER = "01067306718"; // رقم فودافون كاش الخاص بك لتلقي التحويلات
const INSTAPAY_ADDRESS = "username@instapay";  // عنوان إنستاباي الخاص بك لتلقي التحويلات

// --- Helpers for Step-by-Step Checkout ---
function setCheckoutActiveStep(stepNum) {
    const stepPane1 = document.getElementById("checkout-step-1");
    const stepPane2 = document.getElementById("checkout-step-2");
    const stepPane3 = document.getElementById("checkout-step-3");

    const stepInd1 = document.getElementById("step-ind-1");
    const stepInd2 = document.getElementById("step-ind-2");
    const stepInd3 = document.getElementById("step-ind-3");

    if (!stepPane1 || !stepPane2 || !stepPane3) return;

    stepPane1.style.display = "none";
    stepPane2.style.display = "none";
    stepPane3.style.display = "none";

    [stepInd1, stepInd2, stepInd3].forEach((ind, index) => {
        if (!ind) return;
        if (index + 1 === stepNum) {
            ind.style.color = "var(--primary-color)";
            ind.style.fontWeight = "bold";
            ind.classList.add("active");
        } else {
            ind.style.color = "";
            ind.style.fontWeight = "";
            ind.classList.remove("active");
        }
    });

    if (stepNum === 1) stepPane1.style.display = "block";
    else if (stepNum === 2) stepPane2.style.display = "block";
    else if (stepNum === 3) stepPane3.style.display = "block";
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showToast(message, type = 'success') {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.style.cssText = `
        background: rgba(10, 10, 15, 0.95);
        border: 1px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Cairo', sans-serif;
        font-size: 0.85rem;
        direction: rtl;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        pointer-events: auto;
    `;
    
    const icon = type === 'success' ? '🏆' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 50);
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateY(-100px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 5000);
}

async function checkLocalOrdersStatus() {
    let localOrders = JSON.parse(localStorage.getItem("3m_local_orders") || "[]");
    let updated = false;

    for (let ord of localOrders) {
        if (ord.status === 'pending_review' || ord.status === 'pending') {
            try {
                const response = await fetch(`/api/checkout?orderId=${ord.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'paid') {
                        ord.status = 'paid';
                        updated = true;
                        const msg = currentLang === 'ar' 
                            ? `تم قبول دفعة طلبك بقيمة ${ord.service} بنجاح! رقم الطلب: ${ord.code}`
                            : `Payment for your order ${ord.service} has been approved! Order ID: ${ord.code}`;
                        showToast(msg, 'success');
                        addAuditLog(`User order ${ord.code} updated to PAID by admin.`);
                    } else if (data.status === 'failed') {
                        ord.status = 'failed';
                        updated = true;
                        const msg = currentLang === 'ar'
                            ? `تم رفض دفعة طلبك بقيمة ${ord.service}. يرجى مراجعة الدعم الفني.`
                            : `Payment for your order ${ord.service} was rejected. Please contact support.`;
                        showToast(msg, 'error');
                    }
                }
            } catch (err) {
                console.error("Error polling order status:", err);
            }
        }
    }

    if (updated) {
        localStorage.setItem("3m_local_orders", JSON.stringify(localOrders));
    }
}

async function fetchOrdersFromServer() {
    try {
        const res = await fetch("/api/admin-orders");
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        orders = data.orders || [];
        localStorage.setItem("3m_studio_orders", JSON.stringify(orders));
        return orders;
    } catch (err) {
        console.error("Error fetching orders:", err);
        const stored = localStorage.getItem("3m_studio_orders");
        orders = stored ? JSON.parse(stored) : [];
        return orders;
    }
}

// --- Default Base State (Multi-lingual & Multi-currency database) ---
const DEFAULT_STATE = {
    theme: {
        primaryColor: "#00f2fe",
        secondaryColor: "#7f00ff",
        bgDark: "#050508",
        discordWebhookUrl: ""
    },
    sectionOrder: ["hero", "services", "portfolio", "why-choose-us", "statistics", "testimonials", "faq", "contact"],
    ar: {
        texts: {
            nav_logo: "3M",
            nav_logo_sub: "STUDIO",
            hero_badge: "وكالة ألعاب احترافية",
            hero_title_p1: "ابنِ مشروع",
            hero_title_p2: "أحلامك مع 3M Studio",
            hero_subtitle: "تطوير روبلوكس احترافي، إعداد سيرفرات ديسكورد وإنشاء مواقع ويب. حوّل أفكارك إلى واقع رقمي.",
            hero_btn_1: "ابدأ الآن",
            hero_btn_2: "عرض الخدمات",
            services_section_title: "ما نتخصص فيه",
            services_section_subtitle: "نقدم إعدادات مجتمعات ألعاب احترافية، سكربتات مخصصة، منتجات متاجر وحلول ويب متكاملة.",
            portfolio_section_title: "معرض أعمالنا الأخيرة",
            portfolio_section_subtitle: "استكشف بعضًا من أحدث خرائط روبلوكس، أنظمة السكربتات، مجتمعات ديسكورد، وتصميمات المواقع.",
            why_section_title: "لماذا تختار وكالتنا؟",
            why_section_subtitle: "نجمع بين ثقافة الألعاب والخبرة التقنية العالية لتقديم حلول لا مثيل لها.",
            testimonials_section_title: "ماذا يقول عملائنا",
            testimonials_section_subtitle: "اقرأ تقييمات موثقة من أصحاب السيرفرات، ومطوري الألعاب، ومدراء المجتمعات الذين يثقون بنا.",
            faq_section_title: "الأسئلة الأكثر شيوعًا",
            faq_section_subtitle: "لديك أسئلة؟ لدينا إجابات. اعثر على إجابات سريعة حول الطلبات، البوتات، مواعيد التسليم والمزيد.",
            contact_section_title: "ابدأ رحلة مشروعك",
            contact_section_subtitle: "هل أنت مستعد لنقل لعبتك أو سيرفرك للمستوى التالي؟ املأ النموذج، وسيتواصل معك فريقنا في أقل من 24 ساعة.",
            contact_email: "contact@3mstudio.gg",
            contact_discord: "discord.gg/3mstudio",
            contact_hours: "دعم متواصل 24/7",
            contact_socials_title: "تابع مجتمعنا",
            footer_logo: "3M",
            footer_logo_sub: "STUDIO",
            footer_pitch: "تطوير روبلوكس احترافي، إعدادات ديسكورد، ومواقع ويب مخصصة لمجتمعات الألعاب.",
            footer_col_1_title: "روابط سريعة",
            footer_col_2_title: "خدماتنا",
            footer_col_3_title: "قانوني",
            footer_copy: "3M Studio"
        },
        whyChooseUs: [
            { id: "why-1", title: "تسليم سريع", desc: "نحن نقدر وقتك. يتم الانتهاء من معظم الإعدادات والسكربتات في غضون 3-5 أيام.", icon: "zap" },
            { id: "why-2", title: "فريق عمل محترف", desc: "مطورون ذوو خبرة في تطوير ألعاب روبلوكس ومبرمجو ويب ومهندسو ديسكورد.", icon: "users" },
            { id: "why-3", title: "أسعار مناسبة", desc: "خدمات ألعاب متميزة وعالية الجودة بأسعار تتناسب مع ميزانية مشروعك.", icon: "dollar-sign" },
            { id: "why-4", title: "دعم على مدار الساعة", desc: "فريق الدعم الفني وبوتات المساعدة متاحة دائمًا للإجابة على استفساراتك.", icon: "help-circle" },
            { id: "why-5", title: "دفع آمن وموثوق", desc: "ضمان أمني كامل من خلال بوابات دفع موثقة أو المعاملات الآمنة.", icon: "shield" }
        ],
        testimonials: [
            { id: "test-1", rating: 5, comment: "قام فريق 3M Studio بتصميم خريطة السيمولاتور ونظام السكربتات الخاص بنا. كان التسليم سريعًا والسكربتات تعمل بدون أي لاج! أنصح بهم بشدة.", name: "TofuuGamer", sub: "منتج ألعاب" },
            { id: "test-2", rating: 5, comment: "احتاج مجتمع الرياضات الإلكترونية الخاص بنا إلى بوت مخصص لربط حسابات روبلوكس وتتبع الفوز. بوت 3M يعمل بكفاءة ودون انقطاع.", name: "Xenon_PVP", sub: "قائد مجتمع ألعاب" },
            { id: "test-3", rating: 5, comment: "موقع ويب مذهل حقًا! التصميم الزجاجي العصري والأنيميشن الممتاز أعطى شركتنا مظهرًا احترافيًا ضاعف مبيعاتنا بشكل ملحوظ.", name: "Vortex Gaming", sub: "مدير استوديو" }
        ],
        faqs: [
            { id: "faq-1", question: "كيف يمكنني تقديم طلب مخصص؟", answer: "يمكنك استخدام نموذج الاتصال في أسفل الصفحة أو الانضمام إلى سيرفر ديسكورد الخاص بنا. سيقوم مدير المشروع بمراجعة التفاصيل، وتقدير الميزانية، وإصدار الفاتورة." },
            { id: "faq-2", question: "ما هي طرق الدفع المقبولة لديكم؟", answer: "نحن نقبل الدفع عبر بايبال (PayPal)، والبطاقات البنكية عبر سترايب (Stripe)، بالإضافة إلى الدفع بعملة روبوكس (مع تغطية ضريبة روبلوكس)." },
            { id: "faq-3", question: "هل تقدمون دعمًا فنيًا بعد التسليم؟", answer: "نعم! جميع السكربتات المخصصة ومواقع الويب تأتي مع فترة ضمان مدتها 14 يومًا ضد الأخطاء والمشاكل البرمجية مجانًا." },
            { id: "faq-4", question: "هل يمكنني تعديل الموقع بعد النشر؟", answer: "بالتأكيد. من خلال لوحة التحكم المرئية الذكية والمخفية (والتي تفتح بالبحث عن '3m studio admin' وإدخال رمز المرور 'maloka')، يمكنك تعديل كل شيء مباشرة." }
        ],
        services: [
            {
                id: "srv-roblox-1",
                category: "roblox-dev",
                name: "ألعاب روبلوكس متكاملة",
                priceBase: 499,
                desc: "تصميم وتطوير ألعاب روبلوكس كاملة من الفكرة والخرائط إلى السكربتات النهائية وتجهيز أنظمة الشراء.",
                features: ["تصميم هيكلية اللعبة كاملة", "سكربتات طريقة اللعب (Gameplay)", "ربط قواعد البيانات (DataStore)", "تجهيز خيارات تحقيق الأرباح"]
            },
            {
                id: "srv-roblox-2",
                category: "roblox-dev",
                name: "أنظمة وسكربتات مخصصة",
                priceBase: 99,
                desc: "أنظمة قتال متطورة، حقائب لاعبين (Inventory)، أنظمة مقايضة، وسكربتات حماية مخصصة.",
                features: ["برمجة سكربتات مرنة ومنظمة", "نظام حماية ضد الغش والتهكير", "حفظ بيانات متقدم وآمن", "تحسين السكربتات لمنع التعليق"]
            },
            {
                id: "srv-roblox-3",
                category: "roblox-dev",
                name: "خرائط وبناء مجسمات",
                priceBase: 199,
                desc: "بناء خرائط ألعاب بجودة عالية، ساحات انتظار (Lobbies)، وبيئات ألعاب سيمولاتور مذهلة.",
                features: ["تصميم بيئات مستقبلية وخيالية", "أنماط بناء منخفضة ومحسنة (Low-Poly)", "تجميع وتجهيز المجسمات الفريدة", "إضاءة وتأثيرات بصرية احترافية"]
            },
            {
                id: "srv-roblox-4",
                category: "roblox-dev",
                name: "تصميم واجهات المستخدم UI",
                priceBase: 79,
                desc: "واجهات مستخدم (GUI) حديثة، جذابة، ومتوافقة بالكامل مع شاشات الجوال، الكمبيوتر، والكونسول.",
                features: ["أيقونات ورسومات مخصصة", "أبعاد متجاوبة مع كافة الشاشات", "تأثيرات حركية عند الضغط", "تصميم نوافذ المتجر والقوائم"]
            },
            {
                id: "srv-store-1",
                category: "roblox-store",
                name: "خريطة سيمولاتور Aero",
                priceBase: 49.99,
                desc: "خريطة سيمولاتور جزر طائرة جاهزة ومصممة بجودة عالية مع مناطق مخصصة للمتاجر والسباون.",
                features: ["منطقة سباون جاهزة ومثيرة", "منصات للمتاجر والتبادل", "بوابات نيون سحرية", "هندسة معمارية خفيفة ومحسنة"]
            },
            {
                id: "srv-store-2",
                category: "roblox-store",
                name: "حزمة قيمباس VIP جاهزة",
                priceBase: 19.99,
                desc: "سكربت VIP قيمباس سهل التركيب يمنح المشترين تاغ فوق الرأس، سرعة مضاعفة، وجوائز يومية.",
                features: ["عنوان VIP مضيء فوق رأس اللاعب", "بوابة خاصة لا يدخلها إلا الـ VIP", "سكربت زيادة السرعة والقفز", "مضاعفة العملات اليومية تلقائيًا"]
            },
            {
                id: "srv-store-3",
                category: "roblox-store",
                name: "نظام تجارة وتبادل متطور",
                priceBase: 39.99,
                desc: "نظام مقايضة آمن بين اللاعبين لتبادل الحيوانات الأليفة، الأدوات، والعملات مع منع الثغرات.",
                features: ["منع ثغرات نسخ العناصر (Duping)", "واجهة مقايضة متطورة وبسيطة", "إمكانية فرض عمولة روبوكس", "سجل لتوثيق جميع العمليات"]
            },
            {
                id: "srv-discord-1",
                category: "discord-services",
                name: "إعداد وتصميم السيرفرات",
                priceBase: 49,
                desc: "إعداد سيرفرات ديسكورد احترافية مع ترتيب الرتب، الغرف، وبوتات الترحيب والترويج التلقائي.",
                features: ["ترتيب الرتب والغرف بشكل جذاب", "إعداد أنظمة التعديل والرقابة التلقائية", "تصميم فواصل ورموز نيون مميزة", "ربط وبوتات الترحيب التلقائي"]
            },
            {
                id: "srv-discord-2",
                category: "discord-services",
                name: "بوتات ديسكورد مخصصة",
                priceBase: 149,
                desc: "برمجة وتصميم بوتات ديسكورد خاصة بلغة JS مع قواعد بيانات ومميزات فريدة لسيرفرك.",
                features: ["متوافقة للعمل 24/7 دون انقطاع", "إمكانية التحقق من حسابات روبلوكس", "أوامر مخصصة (Slash Commands)", "ربط قاعدة بيانات MongoDB"]
            },
            {
                id: "srv-discord-3",
                category: "discord-services",
                name: "أنظمة التذاكر والتحقق",
                priceBase: 29,
                desc: "إعداد بوابات تحقق لمنع البوتات (عبر كابتشا أو ديسكورد) وتجهيز تذاكر دعم فني بالأزرار.",
                features: ["حماية السيرفر من هجمات البوتات", "تذاكر دعم فني سريعة بالأزرار", "تسجيل وحفظ سجل التذاكر تلقائيًا", "إدارة وتوزيع التذاكر على الإدارة"]
            },
            {
                id: "srv-web-1",
                category: "website-dev",
                name: "مواقع مجتمعات الألعاب",
                priceBase: 299,
                desc: "مواقع ويب متكاملة لمجتمعات الألعاب والكلانات تشمل لوحات تحكم، ترتيب متصدرين، ومتجر.",
                features: ["ثيم ألعاب داكن وتفاعلي", "لوحة تحكم لأعضاء الكلان والكلد", "عرض متصدري ألعاب روبلوكس", "واجهة متجر لعرض المنتجات"]
            },
            {
                id: "srv-web-2",
                category: "website-dev",
                name: "صفحات الهبوط والمعارض",
                priceBase: 129,
                desc: "صفحة هبوط مذهلة واحترافية لعرض سيرتك الذاتية، أعمالك، أو ألعاب استوديو التطوير الخاص بك.",
                features: ["سرعة تحميل خارقة وخفيفة", "متوافقة تمامًا مع محركات البحث (SEO)", "نموذج اتصال متطور وذكي", "شبكة معرض أعمال تفاعلية"]
            },
            {
                id: "srv-web-3",
                category: "website-dev",
                name: "لوحات تحكم الإدارة المخصصة",
                priceBase: 499,
                desc: "لوحات ويب خاصة لتتبع إحصائيات لاعبيك داخل روبلوكس، البلاغات، والمبيعات بشكل حي ومباشر.",
                features: ["خلفية برمجية قوية بلغة NodeJS", "رسوم بيانية وإحصائيات حية", "تعديل إعدادات اللعبة من الويب", "ربط مباشر وآمن بقواعد البيانات"]
            }
        ]
    },
    en: {
        texts: {
            nav_logo: "3M",
            nav_logo_sub: "STUDIO",
            hero_badge: "PREMIUM GAMING AGENCY",
            hero_title_p1: "Build Your Dream",
            hero_title_p2: "Project With 3M Studio",
            hero_subtitle: "Professional Roblox Development, Discord Services and Website Creation. Turn your ideas into digital reality.",
            hero_btn_1: "Get Started",
            hero_btn_2: "View Services",
            services_section_title: "What We Specialize In",
            services_section_subtitle: "We deliver premium-grade gaming community setups, custom scripts, store products, and professional web solutions.",
            portfolio_section_title: "Showcase of Our Works",
            portfolio_section_subtitle: "Explore some of our latest Roblox builds, scripting systems, Discord communities, and sleek website layouts.",
            why_section_title: "Why Choose Our Agency?",
            why_section_subtitle: "We combine gaming culture expertise with high-level technical development to craft unbeatable solutions.",
            testimonials_section_title: "What Clients Say",
            testimonials_section_subtitle: "Read verified testimonials from server owners, game creators, and community managers who trust 3M Studio.",
            faq_section_title: "Frequently Asked Questions",
            faq_section_subtitle: "Got questions? We have answers. Find quick answers about ordering, custom bots, delivery times, and more.",
            contact_section_title: "Start Your Project Journey",
            contact_section_subtitle: "Ready to take your game or server to the next level? Fill out the form, and our representatives will reach out in less than 24 hours.",
            contact_email: "contact@3mstudio.gg",
            contact_discord: "discord.gg/3mstudio",
            contact_hours: "24/7 Response Time",
            contact_socials_title: "Follow Our Community",
            footer_logo: "3M",
            footer_logo_sub: "STUDIO",
            footer_pitch: "Professional Roblox development, Discord configurations, and web apps tailored for gaming communities.",
            footer_col_1_title: "Quick Links",
            footer_col_2_title: "Services",
            footer_col_3_title: "Legal",
            footer_copy: "3M Studio"
        },
        whyChooseUs: [
            { id: "why-1", title: "Fast Delivery", desc: "We value your time. Most setups and scripts are completed in 3-5 days.", icon: "zap" },
            { id: "why-2", title: "Professional Team", desc: "Experienced Roblox developers, web programmers, and Discord engineers.", icon: "users" },
            { id: "why-3", title: "Affordable Prices", desc: "Premium quality gaming services priced to fit your project budget.", icon: "dollar-sign" },
            { id: "why-4", title: "24/7 Support", desc: "Our ticket operators and support bots are available round the clock.", icon: "help-circle" },
            { id: "why-5", title: "Secure Payments", desc: "Full safety assurance through reliable escrow, Stripe, or Robux payments.", icon: "shield" }
        ],
        testimonials: [
            { id: "test-1", rating: 5, comment: "3M Studio built our simulator map and scripting system. The delivery was fast, and the code runs with zero lag! Highly recommend their Roblox team.", name: "TofuuGamer", sub: "Game Producer" },
            { id: "test-2", rating: 5, comment: "Our esports community needed a custom bot to verify Roblox accounts and track match wins. The 3M Discord Bot works flawlessly 24/7.", name: "Xenon_PVP", sub: "Guild Leader" },
            { id: "test-3", rating: 5, comment: "Aesthetically outstanding website. The glassmorphism cards and smooth animations gave our studio a premium look that doubled our lead conversions.", name: "Vortex Gaming", sub: "Studio Manager" }
        ],
        faqs: [
            { id: "faq-1", question: "How do I place a custom order?", answer: "You can use the contact form at the bottom of the page or join our Discord server. A project manager will review details, establish a budget/timeline, and issue an order invoice." },
            { id: "faq-2", question: "What payment methods do you accept?", answer: "We accept PayPal, Credit/Debit Cards via Stripe, and Robux payments (with tax coverage). All transactions are fully secured." },
            { id: "faq-3", question: "Do you offer post-delivery support?", answer: "Yes! Every custom script or website comes with a 14-day warranty for bugs. We also offer extended hosting and bot management subscriptions." },
            { id: "faq-4", question: "Can you edit the website after it is published?", answer: "Absolutely. With our visual edit panel (accessible via the secure access command '3m studio admin' in the search bar and password 'maloka'), administrators can modify all titles, prices, descriptions, and section arrangements directly." }
        ],
        services: [
            {
                id: "srv-roblox-1",
                category: "roblox-dev",
                name: "Custom Roblox Games",
                priceBase: 499,
                desc: "Full-scale game creation from design concept to final scripts, optimizing for player retention.",
                features: ["Full Game Architecture", "Custom Gameplay Loops", "DataStore Configurations", "Monetization Setup"]
            },
            {
                id: "srv-roblox-2",
                category: "roblox-dev",
                name: "Systems & Scripts",
                priceBase: 99,
                desc: "Custom combat mechanics, inventories, trade systems, and backend frameworks.",
                features: ["Robust Scripting API", "Anti-Cheat Protection", "Datastore Systems", "Lag-Free Optimization"]
            },
            {
                id: "srv-roblox-3",
                category: "roblox-dev",
                name: "Maps & Builds",
                priceBase: 199,
                desc: "High-quality, immersive game maps, lobbies, and simulator environments.",
                features: ["Futuristic & Sci-Fi Builds", "Low-Poly & Realistic Styles", "Prop Assemblies", "Custom Lighting Layouts"]
            },
            {
                id: "srv-roblox-4",
                category: "roblox-dev",
                name: "UI Design",
                priceBase: 79,
                desc: "Clean, modern, and fully responsive user interfaces tailored for console, PC, and mobile.",
                features: ["Custom Icons & Layouts", "Scale-Responsive Scaling", "Button Hover Animations", "Shop & HUD Interfaces"]
            },
            {
                id: "srv-store-1",
                category: "roblox-store",
                name: "Aero Sim Lobby Map",
                priceBase: 49.99,
                desc: "A stunning, pre-built high-quality sky islands simulator lobby with customizable areas.",
                features: ["Pre-configured Spawn Zone", "Shop & Trade Stands", "Beautiful Neon Portals", "Optimized Geometry"]
            },
            {
                id: "srv-store-2",
                category: "roblox-store",
                name: "VIP System Gamepass Pack",
                priceBase: 19.99,
                desc: "VIP pass script with tag titles, speed boosts, and daily rewards.",
                features: ["In-game Overhead Title", "Custom VIP Room Gate", "Speed & Jump Boost Scripts", "Daily Coin Bonus System"]
            },
            {
                id: "srv-store-3",
                category: "roblox-store",
                name: "Advanced Trading System",
                priceBase: 39.99,
                desc: "A fully secured peer-to-peer player trading system supporting pets, tools, and cash.",
                features: ["Secure Duping Prevention", "Interactive User UI", "Robux Commission Options", "Transaction Ledger System"]
            },
            {
                id: "srv-discord-1",
                category: "discord-services",
                name: "Server Setup & Design",
                priceBase: 49,
                desc: "Professional discord layouts with role hierarchies, auto-moderation, and custom channels.",
                features: ["Role & Channel Hierarchy", "Auto-Mod Configuration", "Clean Vector Layouts", "Aesthetic Fonts & Symbols"]
            },
            {
                id: "srv-discord-2",
                category: "discord-services",
                name: "Custom Discord Bots",
                priceBase: 149,
                desc: "Tailored NodeJS Discord bots with database integrations, dashboard links, and game APIs.",
                features: ["24/7 Hosting Compatible", "Roblox Link Verification", "Command Slash Configs", "Database (MongoDB) Sync"]
            },
            {
                id: "srv-discord-3",
                category: "discord-services",
                name: "Ticket & Verification Systems",
                priceBase: 29,
                desc: "Secure verification gates (Bloxlink/custom) and user support ticket panels.",
                features: ["Secure Captcha Gates", "Interactive Button Panels", "Support Transcript Loggers", "Staff Queue Management"]
            },
            {
                id: "srv-web-1",
                category: "website-dev",
                name: "Gaming Communities Websites",
                priceBase: 299,
                desc: "Premium websites with guilds dashboards, forums, rankings integration, and shop pages.",
                features: ["Tailored Dark Aesthetic", "Dynamic Guild Forums", "Roblox API Leaderboards", "Animated UI/UX Panels"]
            },
            {
                id: "srv-web-2",
                category: "website-dev",
                name: "Landing Pages & Portfolios",
                priceBase: 129,
                desc: "Stunning single-page sites to showcase your games, designs, or streaming career.",
                features: ["High-speed Loading", "SEO Optimized Coding", "Interactive Contact Hubs", "Dynamic Work Grid Layouts"]
            },
            {
                id: "srv-web-3",
                category: "website-dev",
                name: "Custom Admin Dashboards",
                priceBase: 499,
                desc: "Web panels to track in-game purchases, player reports, and server analytics in real time.",
                features: ["ExpressJS/NodeJS Backend", "Live Analytics Charts", "Staff Management Toggles", "API Database Integrations"]
            }
        ]
    },
    coupons: [
        {
            id: "coup-welcome",
            code: "WELCOME10",
            type: "percentage",
            value: 10,
            minPurchase: 0,
            maxUses: 100,
            maxPerUser: 1,
            currentUses: 0,
            usedBy: [],
            startDate: "2025-01-01",
            expiryDate: "2027-12-31",
            desc_ar: "خصم 10% على أول طلب لك",
            desc_en: "10% off your first order",
            active: true,
            featured: true,
            public: true,
            firstOrder: false,
            vipOnly: false,
            referral: false,
            seasonalTag: ""
        },
        {
            id: "coup-summer",
            code: "SUMMER20",
            type: "percentage",
            value: 20,
            minPurchase: 50,
            maxUses: 50,
            maxPerUser: 1,
            currentUses: 5,
            usedBy: [],
            startDate: "2025-06-01",
            expiryDate: "2025-09-30",
            desc_ar: "خصم 20% على الطلبات فوق 50$",
            desc_en: "20% off orders over $50",
            active: true,
            featured: true,
            public: true,
            firstOrder: false,
            vipOnly: false,
            referral: false,
            seasonalTag: "summer"
        },
        {
            id: "coup-vip",
            code: "VIPONLY",
            type: "fixed",
            value: 25,
            minPurchase: 0,
            maxUses: 20,
            maxPerUser: 1,
            currentUses: 2,
            usedBy: [],
            startDate: "2025-01-01",
            expiryDate: "2027-12-31",
            desc_ar: "خصم 25$ حصري لأعضاء VIP",
            desc_en: "$25 off exclusive for VIP members",
            active: true,
            featured: false,
            public: false,
            firstOrder: false,
            vipOnly: true,
            referral: false,
            seasonalTag: ""
        }
    ],
    portfolio: [
        { id: "port-1", category: "roblox", title_ar: "خريطة سيمولاتور خيال علمي", title_en: "Sci-Fi Simulator Map", desc_ar: "بيئة سيمولاتور عالية التفاصيل مع شوارع مضيئة نيون وسيارات طائرة متحركة.", desc_en: "High-detail simulator environment with glowing neon streets and animated hovercars.", img: "assets/images/roblox_dev.png", tag_ar: "بناء خريطة روبلوكس", tag_en: "Roblox Map Build" },
        { id: "port-2", category: "roblox", title_ar: "نظام حقيبة لاعب RPG", title_en: "RPG Inventory System", desc_ar: "واجهة حقيبة لاعب (Inventory) متجاوبة لتركيب المعدات، صناعة الأسلحة، وترتيب العناصر.", desc_en: "A sleek, responsive inventory GUI featuring pet equip, weapon crafting, and sorting.", img: "assets/images/roblox_store.png", tag_ar: "برمجة روبلوكس", tag_en: "Roblox Scripting" },
        { id: "port-3", category: "discord", title_ar: "سيرفر Nexus Esports", title_en: "Nexus Esports Server Setup", desc_ar: "إعداد كامل لسيرفر بطولة ألعاب إلكترونية يتضمن غرف التشكيلات وبوتات التسجيل.", desc_en: "Full-scale server template for an esports league including bracket bots and team channels.", img: "assets/images/discord_setup.png", tag_ar: "إعداد ديسكورد", tag_en: "Discord Setup" },
        { id: "port-4", category: "web", title_ar: "لوحة تحكم استوديو 3M", title_en: "3M Game Studio Dashboard", desc_ar: "لوحة تحكم متطورة لعرض إحصائيات لاعبيك النشطين، المبيعات وسجلات التبادل الفورية.", desc_en: "Premium admin dashboard for game analytics, active player maps, and real-time trade logs.", img: "assets/images/gaming_web.png", tag_ar: "تصميم موقع ويب", tag_en: "Website Design" }
    ],
    statistics: [
        { id: "stat-1", value: 120, suffix: "+", label_ar: "طلبات مكتملة", label_en: "Completed Orders" },
        { id: "stat-2", value: 65, suffix: "+", label_ar: "عميل سعيد", label_en: "Happy Clients" },
        { id: "stat-3", value: 35, suffix: "+", label_ar: "مشروع مطور", label_en: "Projects Developed" },
        { id: "stat-4", value: 24, suffix: "/7", label_ar: "ساعات الدعم", label_en: "Support Hours" }
    ]
};

// --- App Control Variables ---
let draftState = {};
let liveState = {};
let historyStack = [];
let discordClientId = "1519819519193780494"; // Fallback Client ID
let historyIndex = -1;
let adminMode = false;
let autoSaveTimer = null;
let auditLogs = [];
let leads = []; // Inbound Contact submissions
let orders = []; // Inbound Store Purchase submissions
let smtpLogs = []; // Outgoing mail simulations
let currentLang = "ar"; // 'ar' default
let currentCurrency = "EGP"; // 'EGP' default

// Exchange rates (USD based)
const CURRENCY_CONVERSIONS = {
    USD: { rate: 1.0, symbol: "$", arLabel: "دولار أمريكي", enLabel: "USD" },
    EGP: { rate: 48.0, symbol: "جنيه مصري", enLabel: "EGP" },
    EUR: { rate: 0.92, symbol: "€", arLabel: "يورو", enLabel: "EUR" }
};

// --- Helper: Convert HEX to RGB ---
function hexToRgb(hex) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(', ');
    }
    return "0, 0, 0";
}

// --- Log audit activities ---
function addAuditLog(msg, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    auditLogs.push({ time: timestamp, msg: msg, isError: isError });
    
    const logConsole = document.getElementById("logs-console-container");
    if (logConsole) {
        const line = document.createElement("div");
        line.className = `log-line ${isError ? 'log-error' : ''}`;
        line.innerHTML = `<span class="log-time">[${timestamp}]</span><span class="log-msg">${msg}</span>`;
        logConsole.appendChild(line);
        logConsole.scrollTop = logConsole.scrollHeight;
    }
}

// --- SMTP Mail Simulator Outbox Logger ---
function triggerSMTPSimulation(toEmail, subject, bodyContent) {
    const timestamp = new Date().toLocaleString();
    
    // Save locally
    smtpLogs.unshift({ time: timestamp, to: toEmail, subject: subject, body: bodyContent });
    localStorage.setItem("3m_studio_smtp_logs", JSON.stringify(smtpLogs));

    // Update SMTP outbox tab UI
    renderSMTPLogs();
}

// --- Real Email Dispatcher via FormSubmit API ---
let lastEmailSentTime = 0;
function sendRealEmailViaFormSubmit(subject, data) {
    const now = Date.now();
    if (now - lastEmailSentTime < 10000) {
        console.warn("Anti-spam block: Email rate limit exceeded. Skipping email send.");
        return;
    }
    lastEmailSentTime = now;

    fetch("https://formsubmit.co/ajax/omarsaber6545@gmail.com", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            "_subject": subject,
            ...data
        })
    })
    .then(res => res.json())
    .then(d => console.log("Real Email Dispatched via FormSubmit:", d))
    .catch(err => console.error("Error sending real email:", err));
}

// --- Discord Bot API Logger Service ---
function sendDiscordWebhookNotification(type, title, fields, customColor = null, customLink = null) {
    let color = 5814770; // Blurple default (0x5865F2)
    if (type === "purchase" || type === "payment_success" || type === "order_create") color = 3066993; // Green (0x2ECC71)
    else if (type === "payment_fail" || type === "error") color = 15158332; // Red (0xE74C3C)
    else if (type === "contact" || type === "ticket") color = 10182117; // Purple (0x9B59B6)
    else if (type === "admin_action") color = 15105570; // Orange (0xE67E22)
    else if (type === "logout") color = 9807270; // Grey (0x95A5A6)
    
    if (customColor !== null) {
        color = customColor;
    }

    const payload = {
        event: type,
        title: title,
        fields: fields,
        color: color,
        link: customLink || window.location.href
    };

    fetch("/api/discord-logger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) console.error("Discord Bot Log status error:", res.status);
    })
    .catch(err => console.error("Discord Bot Log network error:", err));
}

function renderSMTPLogs() {
    const container = document.getElementById("smtp-logs-container");
    if (!container) return;

    if (smtpLogs.length === 0) {
        container.innerHTML = `<div class="no-leads" style="color:var(--text-dark);">No emails in SMTP outbox.</div>`;
        return;
    }

    container.innerHTML = smtpLogs.map(l => `
        <div class="log-line" style="margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:8px;">
            <span class="log-time">[${l.time}]</span>
            <span class="log-msg">
                <strong style="color:var(--admin-color);">Sent to: ${l.to}</strong><br>
                <strong>Subject: ${l.subject}</strong><br>
                <span style="color:var(--text-muted); font-size:0.75rem;">${l.body.substring(0, 150)}...</span>
            </span>
        </div>
    `).join("");
}

// --- Format prices based on selected Currency & Language ---
function getFormattedPrice(basePriceUSD, currency = currentCurrency, lang = currentLang) {
    const config = CURRENCY_CONVERSIONS[currency];
    if (!config) return basePriceUSD;

    const converted = Math.round(basePriceUSD * config.rate * 100) / 100;
    
    if (currency === "USD") {
        return lang === "ar" ? `${converted} دولار أمريكي` : `${converted}`;
    } else if (currency === "EUR") {
        return lang === "ar" ? `${converted} يورو` : `€${converted}`;
    } else { // EGP default
        return lang === "ar" ? `${converted} جنيه مصري` : `${converted} EGP`;
    }
}

// --- Initialize / Sync State ---
function initStates() {
    // Fetch Discord Client ID configuration from server
    fetch("/api/config")
        .then(res => res.json())
        .then(data => {
            if (data.clientId) {
                discordClientId = data.clientId;
            }
        })
        .catch(err => console.error("Error loading server config:", err));

    // 1. Get Live State
    const storedLive = localStorage.getItem("3m_studio_live_state");
    if (storedLive) {
        liveState = JSON.parse(storedLive);
    } else {
        liveState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        localStorage.setItem("3m_studio_live_state", JSON.stringify(liveState));
    }

    // 2. Check if admin is currently logged in session
    const isLoggedIn = sessionStorage.getItem("admin_logged_in") === "true";
    
    // 3. Load Draft State
    const storedDraft = localStorage.getItem("3m_studio_draft_state");
    if (storedDraft) {
        draftState = JSON.parse(storedDraft);
    } else {
        draftState = JSON.parse(JSON.stringify(liveState));
        localStorage.setItem("3m_studio_draft_state", JSON.stringify(draftState));
    }

    // Ensure coupons array exists in state
    if (!draftState.coupons) { draftState.coupons = JSON.parse(JSON.stringify(DEFAULT_STATE.coupons)); }
    if (!liveState.coupons) { liveState.coupons = JSON.parse(JSON.stringify(DEFAULT_STATE.coupons)); }

    // Load Inquiries/Messages
    const storedLeads = localStorage.getItem("3m_studio_leads");
    leads = storedLeads ? JSON.parse(storedLeads) : [];

    // Load Store Orders
    const storedOrders = localStorage.getItem("3m_studio_orders");
    orders = storedOrders ? JSON.parse(storedOrders) : [];

    // Load SMTP Logs
    const storedSMTP = localStorage.getItem("3m_studio_smtp_logs");
    smtpLogs = storedSMTP ? JSON.parse(storedSMTP) : [];

    // Check saved language & currency settings
    const savedLang = localStorage.getItem("3m_studio_lang");
    if (savedLang) currentLang = savedLang;
    
    const savedCurr = localStorage.getItem("3m_studio_currency");
    if (savedCurr) currentCurrency = savedCurr;

    // Apply language flags and status in UI buttons
    updateLangUIIndicators();
    updateCurrencyUIIndicators();

    // Push initial history state
    pushToHistory(JSON.parse(JSON.stringify(draftState)), "Initialized site state");

    // Enable admin mode if logged in
    if (isLoggedIn) {
        enableAdminMode(false);
    } else {
        applyState(liveState);
    }

    // Fetch live counters stats from PostgreSQL database to keep it 100% real
    fetch("/api/portal?action=admin_stats")
        .then(res => res.json())
        .then(data => {
            if (data.success && data.stats) {
                liveState.statistics[0].value = data.stats.totalOrders;
                liveState.statistics[1].value = data.stats.totalUsers;
                liveState.statistics[2].value = data.stats.totalOrders;
                renderStatistics(liveState.statistics);
            }
        })
        .catch(err => console.error("Error loading live stats from database:", err));

    // Fetch live reviews from database
    fetch("/api/portal?action=reviews_list")
        .then(res => res.json())
        .then(data => {
            if (data.reviews && data.reviews.length > 0) {
                const dbTestimonials = data.reviews.map(rev => {
                    return {
                        id: rev.id,
                        name: rev.username || "Client / عميل",
                        avatar: rev.avatar ? `https://cdn.discordapp.com/avatars/${rev.user_id}/${rev.avatar}.png` : null,
                        role_ar: "عميل مستقل",
                        role_en: "Independent Client",
                        rating: rev.rating,
                        comment_ar: rev.comment,
                        comment_en: rev.comment
                    };
                });
                liveState.testimonials = dbTestimonials;
                if (typeof langDatabase !== 'undefined') {
                    langDatabase.testimonials = dbTestimonials;
                }
                renderTestimonials(dbTestimonials);
            }
        })
        .catch(err => console.error("Error loading reviews from database:", err));

    // Check if user is logged in with Discord
    const discordUser = localStorage.getItem("discord_user");
    if (discordUser) {
        const user = JSON.parse(discordUser);
        applyDiscordLoginState(user);
        
        // Fetch latest stats from PostgreSQL to keep it real and synchronized
        fetch(`/api/portal?action=profile&userId=${user.id}`)
        .then(res => res.json())
        .then(dbData => {
            if (!dbData.error) {
                user.xp = dbData.xp;
                user.level = dbData.level;
                user.points = dbData.points;
                user.streak = dbData.streak;
                user.last_daily_claim = dbData.last_daily_claim;
                userXP = dbData.xp;
                userLevel = dbData.level;
                localStorage.setItem("discord_user", JSON.stringify(user));
                initAchievements();
            }
        })
        .catch(err => console.error("Error syncing stats:", err));
    }

    // Check for real Discord OAuth2 token in URL fragment (Implicit Grant)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
        // Clear hash from URL instantly
        window.history.replaceState({}, document.title, window.location.pathname);
        addAuditLog("Verifying Discord authorization...");
        
        const apiEndpoint = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? `https://3m-store-3.vercel.app/api/discord-profile?token=${accessToken}`
            : `/api/discord-profile?token=${accessToken}`;

        fetch(apiEndpoint)
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch Discord profile");
            return res.json();
        })
        .then(data => {
            const userObj = {
                id: data.id,
                username: data.discriminator && data.discriminator !== "0" ? `${data.username}#${data.discriminator}` : data.username,
                avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null,
                avatarLetter: data.username.charAt(0).toUpperCase(),
                xp: data.xp || 0,
                level: data.level || 1,
                points: data.points || 0,
                streak: data.streak || 0,
                last_daily_claim: data.last_daily_claim || null
            };
            userXP = userObj.xp;
            userLevel = userObj.level;
            localStorage.setItem("discord_user", JSON.stringify(userObj));
            applyDiscordLoginState(userObj);
            initAchievements();
            addAuditLog(`Discord login validated. Welcome, ${userObj.username}!`);

            // Dispatch Discord Webhook log for registration / login
            const knownUsers = JSON.parse(localStorage.getItem("3m_known_users") || "[]");
            const isNew = !knownUsers.includes(userObj.id);
            if (isNew) {
                knownUsers.push(userObj.id);
                localStorage.setItem("3m_known_users", JSON.stringify(knownUsers));
                sendDiscordWebhookNotification("registration", "👤 تسجيل مستخدم جديد للموقع", [
                    { name: "اسم المستخدم (Username)", value: userObj.username, inline: true },
                    { name: "معرف الحساب (User ID)", value: userObj.id, inline: true }
                ]);
            }

            sendDiscordWebhookNotification("login", "🔑 تسجيل دخول جديد للموقع", [
                { name: "اسم المستخدم (Username)", value: userObj.username, inline: true },
                { name: "معرف الحساب (User ID)", value: userObj.id, inline: true }
            ]);
        })
        .catch(err => {
            console.error("Discord Auth Error:", err);
            addAuditLog("Discord verification failed or token expired.", true);
        });
    }

    // Startup check and periodic polling for user orders payment status
    setInterval(checkLocalOrdersStatus, 20000);
    setTimeout(checkLocalOrdersStatus, 3000);
}

// --- Push history for Undo/Redo ---
function pushToHistory(stateCopy, description = "Action completed") {
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }
    
    historyStack.push(stateCopy);
    historyIndex = historyStack.length - 1;
    
    updateUndoRedoButtons();
    addAuditLog(description);
}

function updateUndoRedoButtons() {
    const btnUndo = document.getElementById("tb-undo");
    const btnRedo = document.getElementById("tb-redo");
    
    if (btnUndo && btnRedo) {
        btnUndo.disabled = (historyIndex <= 0);
        btnRedo.disabled = (historyIndex >= historyStack.length - 1);
    }
}

// --- Apply State object properties to the entire DOM ---
function applyState(state) {
    if (!state) return;
    
    // Set direction and lang
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = currentLang;

    // Apply Theme Colors
    if (state.theme) {
        document.documentElement.style.setProperty('--primary-color', state.theme.primaryColor);
        document.documentElement.style.setProperty('--primary-rgb', hexToRgb(state.theme.primaryColor));
        document.documentElement.style.setProperty('--secondary-color', state.theme.secondaryColor);
        document.documentElement.style.setProperty('--secondary-rgb', hexToRgb(state.theme.secondaryColor));
        document.documentElement.style.setProperty('--bg-dark', state.theme.bgDark);
        
        // Update picker fields in Side Panel
        const pickPrimary = document.getElementById("color-primary");
        const textPrimary = document.getElementById("color-primary-text");
        const pickSecondary = document.getElementById("color-secondary");
        const textSecondary = document.getElementById("color-secondary-text");
        const pickBg = document.getElementById("color-bg");
        const textBg = document.getElementById("color-bg-text");
        
        if (pickPrimary) { pickPrimary.value = state.theme.primaryColor; textPrimary.value = state.theme.primaryColor; }
        if (pickSecondary) { pickSecondary.value = state.theme.secondaryColor; textSecondary.value = state.theme.secondaryColor; }
        if (pickBg) { pickBg.value = state.theme.bgDark; textBg.value = state.theme.bgDark; }
        
        const webhookInput = document.getElementById("admin-webhook-url");
        if (webhookInput) { webhookInput.value = state.theme.discordWebhookUrl || ""; }
    }

    // Apply texts depending on active language
    const langDatabase = state[currentLang] || state["ar"];

    // static texts
    if (langDatabase && langDatabase.texts) {
        for (const [id, value] of Object.entries(langDatabase.texts)) {
            const elements = document.querySelectorAll(`[data-edit-id="${id}"]`);
            elements.forEach(el => {
                if (el.innerHTML !== value) {
                    el.innerHTML = value;
                }
            });
        }
    }

    // Apply Section positions / Order
    if (state.sectionOrder) {
        const container = document.getElementById("sections-container");
        if (container) {
            state.sectionOrder.forEach(secName => {
                const secEl = document.getElementById(secName);
                if (secEl) {
                    container.appendChild(secEl);
                }
            });
        }
    }

    // Redraw collection structures
    renderServices(langDatabase.services);
    renderPortfolio(state.portfolio);
    renderFAQ(langDatabase.faqs);
    renderWhyChooseUs(langDatabase.whyChooseUs);
    renderStatistics(state.statistics);
    renderTestimonials(langDatabase.testimonials);
    renderFeaturedCoupons();
    renderCouponsPage();

    // Apply editable outlines if in visual admin mode
    if (adminMode) {
        enableContentEditable();
    }
}

// --- Render Services Cards ---
function renderServices(servicesList) {
    const grids = {
        "roblox-dev": document.getElementById("roblox-dev-grid"),
        "roblox-store": document.getElementById("roblox-store-grid"),
        "discord-services": document.getElementById("discord-services-grid"),
        "website-dev": document.getElementById("website-dev-grid")
    };
    
    for (const key in grids) {
        if (grids[key]) grids[key].innerHTML = "";
    }

    servicesList.forEach(srv => {
        const grid = grids[srv.category];
        if (!grid) return;

        const card = document.createElement("div");
        card.className = "service-card";
        card.setAttribute("data-card-id", srv.id);

        let iconSvg = "";
        if (srv.category === "roblox-dev") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4" ry="4"></rect><path d="M12 6v12M6 12h12"></path></svg>`;
        } else if (srv.category === "roblox-store") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
        } else if (srv.category === "discord-services") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
        } else {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
        }

        const featuresHtml = srv.features.map(f => `<li>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${f}</span>
        </li>`).join("");

        const formattedPrice = getFormattedPrice(srv.priceBase);
        const buyNowLbl = currentLang === "ar" ? "شراء الآن" : "Buy Now";

        card.innerHTML = `
            <div class="card-icon">${iconSvg}</div>
            <span class="card-price" data-price-base="${srv.priceBase}">${formattedPrice}</span>
            <h3 class="card-title" data-edit-id="services.${srv.id}.name">${srv.name}</h3>
            <p class="card-desc" data-edit-id="services.${srv.id}.desc">${srv.desc}</p>
            <ul class="card-features">${featuresHtml}</ul>
            <button class="btn btn-primary btn-glow btn-buy-now" data-product-id="${srv.id}">${buyNowLbl}</button>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll(".service-card").forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--x", `${x}px`);
            card.style.setProperty("--y", `${y}px`);
        });
    });

    document.querySelectorAll(".btn-buy-now").forEach(btn => {
        btn.onclick = () => {
            const prodId = btn.getAttribute("data-product-id");
            openPurchaseModal(prodId);
        };
    });
}

// --- Render Portfolio Grid Showcase ---
function renderPortfolio(portfolioList) {
    const grid = document.getElementById("portfolio-grid");
    if (!grid) return;
    grid.innerHTML = "";

    portfolioList.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = `portfolio-item-wrapper ${item.category}`;
        
        let imgHtml = "";
        if (adminMode) {
            imgHtml = `
                <div class="editable-img-wrapper">
                    <img class="portfolio-img" src="${item.img}" alt="${item.title_en}">
                    <div class="img-edit-overlay" data-img-target="portfolio.${item.id}.img">
                        <button class="img-edit-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            ${currentLang === "ar" ? 'تعديل الصورة' : 'Change Image'}
                        </button>
                    </div>
                </div>
            `;
        } else {
            imgHtml = `<img class="portfolio-img" src="${item.img}" alt="${item.title_en}">`;
        }

        const title = currentLang === "ar" ? item.title_ar : item.title_en;
        const desc = currentLang === "ar" ? item.desc_ar : item.desc_en;
        const tag = currentLang === "ar" ? item.tag_ar : item.tag_en;

        wrapper.innerHTML = `
            <div class="portfolio-item">
                ${imgHtml}
                <div class="portfolio-overlay">
                    <span class="portfolio-tag" data-edit-id="portfolio.${item.id}.tag_${currentLang}">${tag}</span>
                    <h3 class="portfolio-title" data-edit-id="portfolio.${item.id}.title_${currentLang}">${title}</h3>
                    <p class="portfolio-desc" data-edit-id="portfolio.${item.id}.desc_${currentLang}">${desc}</p>
                </div>
            </div>
        `;
        grid.appendChild(wrapper);
    });
}

// --- Render FAQ Accordions ---
function renderFAQ(faqList) {
    const accordion = document.getElementById("faq-accordion");
    if (!accordion) return;
    accordion.innerHTML = "";

    faqList.forEach(faq => {
        const item = document.createElement("div");
        item.className = "faq-item";
        item.innerHTML = `
            <button class="faq-header" aria-expanded="false">
                <span class="faq-question" data-edit-id="faqs.${faq.id}.question">${faq.question}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="faq-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="faq-body">
                <div class="faq-content" data-edit-id="faqs.${faq.id}.answer">${faq.answer}</div>
            </div>
        `;
        accordion.appendChild(item);
    });

    document.querySelectorAll(".faq-header").forEach(btn => {
        btn.onclick = () => {
            const item = btn.parentElement;
            const body = btn.nextElementSibling;
            const isActive = item.classList.contains("active");

            document.querySelectorAll(".faq-item").forEach(other => {
                other.classList.remove("active");
                other.querySelector(".faq-header").setAttribute("aria-expanded", "false");
                other.querySelector(".faq-body").style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add("active");
                btn.setAttribute("aria-expanded", "true");
                body.style.maxHeight = body.scrollHeight + "px";
            }
        };
    });
}

// --- Render Why Choose Us Cards ---
function renderWhyChooseUs(whyList) {
    const grid = document.getElementById("why-us-grid");
    if (!grid) return;
    grid.innerHTML = "";

    whyList.forEach(item => {
        let svgIcon = "";
        switch (item.icon) {
            case "zap":
                svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
                break;
            case "users":
                svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
                break;
            case "dollar-sign":
                svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
                break;
            case "help-circle":
                svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
                break;
            case "shield":
                svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
                break;
        }

        const card = document.createElement("div");
        card.className = "why-card";
        card.innerHTML = `
            <div class="why-icon">${svgIcon}</div>
            <h3 class="why-title" data-edit-id="whyChooseUs.${item.id}.title">${item.title}</h3>
            <p class="why-desc" data-edit-id="whyChooseUs.${item.id}.desc">${item.desc}</p>
        `;
        grid.appendChild(card);
    });
}

// --- Render Statistics counters ---
function renderStatistics(statsList) {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;
    grid.innerHTML = "";

    statsList.forEach(item => {
        const box = document.createElement("div");
        box.className = "stat-item";
        
        const label = currentLang === "ar" ? item.label_ar : item.label_en;

        box.innerHTML = `
            <div class="stat-number" data-stat-target="${item.value}">
                <span class="count-val">${item.value}</span><span class="count-suffix">${item.suffix}</span>
            </div>
            <div class="stat-label" data-edit-id="statistics.${item.id}.label_${currentLang}">${label}</div>
        `;
        grid.appendChild(box);
    });
}

// --- Render Testimonials ---
function renderTestimonials(testList) {
    const grid = document.getElementById("testimonials-grid");
    if (!grid) return;
    grid.innerHTML = "";

    testList.forEach(item => {
        let stars = "";
        for (let i = 0; i < item.rating; i++) {
            stars += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }

        const card = document.createElement("div");
        card.className = "testimonial-card";
        card.innerHTML = `
            <div class="client-rating">${stars}</div>
            <p class="client-comment" data-edit-id="testimonials.${item.id}.comment">"${item.comment}"</p>
            <div class="client-profile">
                <div class="client-avatar">${item.name.charAt(0)}</div>
                <div class="client-info">
                    <h4 data-edit-id="testimonials.${item.id}.name">${item.name}</h4>
                    <span data-edit-id="testimonials.${item.id}.sub">${item.sub}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Direct contenteditable triggers ---
function enableContentEditable() {
    const elements = document.querySelectorAll("[data-edit-id]");
    elements.forEach(el => {
        el.setAttribute("contenteditable", "true");
        
        el.onblur = null;
        el.onblur = () => {
            const rawVal = el.innerHTML.trim();
            const editId = el.getAttribute("data-edit-id");
            updateStateFromTextEdit(editId, rawVal);
        };

        el.onkeydown = (e) => {
            if (e.key === "Enter" && !el.classList.contains("hero-subtitle") && !el.classList.contains("client-comment") && !el.classList.contains("faq-content")) {
                e.preventDefault();
                el.blur();
            }
        };
    });
}

function disableContentEditable() {
    const elements = document.querySelectorAll("[data-edit-id]");
    elements.forEach(el => {
        el.removeAttribute("contenteditable");
        el.onblur = null;
        el.onkeydown = null;
    });
}

// --- Update draft state from text editor inputs ---
function updateStateFromTextEdit(editId, newVal) {
    if (editId.includes(".")) {
        const parts = editId.split(".");
        if (parts.length === 3) {
            const [collection, itemId, field] = parts;
            
            if (collection === "portfolio" || collection === "statistics") {
                const item = draftState[collection].find(x => x.id === itemId);
                if (item && item[field] !== newVal) {
                    item[field] = newVal;
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Updated ${collection} [${itemId}] - ${field}`);
                    saveDraft();
                }
            } else {
                const item = draftState[currentLang][collection].find(x => x.id === itemId);
                if (item && item[field] !== newVal) {
                    item[field] = newVal;
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Updated ${currentLang}.${collection} [${itemId}] - ${field}`);
                    saveDraft();
                }
            }
        }
    } else {
        const oldVal = draftState[currentLang].texts[editId];
        if (oldVal !== newVal) {
            draftState[currentLang].texts[editId] = newVal;
            pushToHistory(JSON.parse(JSON.stringify(draftState)), `Edited ${currentLang} website text: "${editId}"`);
            saveDraft();
        }
    }
}

// --- Save Draft state ---
function saveDraft() {
    localStorage.setItem("3m_studio_draft_state", JSON.stringify(draftState));
    
    const statusOrb = document.getElementById("tb-save-status-orb");
    const statusText = document.getElementById("tb-save-status-text");
    
    if (statusOrb && statusText) {
        statusOrb.style.backgroundColor = "#f59e0b";
        statusText.innerText = "Saving draft...";
        
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            statusOrb.style.backgroundColor = "#10b981";
            statusText.innerText = "Draft Synced";
        }, 1200);
    }
}

// --- Enable Admin panel ---
function enableAdminMode(showLogs = true) {
    adminMode = true;
    sessionStorage.setItem("admin_logged_in", "true");
    document.body.classList.add("admin-edit-mode");
    
    applyState(draftState);

    const toolbar = document.getElementById("admin-toolbar");
    if (toolbar) toolbar.classList.add("active");

    wireImageEditOverlays();
    updateMsgCountBadge();

    if (showLogs) {
        addAuditLog("Admin session initialized.");
    }
}

// --- Disable Admin edit modes ---
function disableAdminMode() {
    adminMode = false;
    sessionStorage.setItem("admin_logged_in", "false");
    document.body.classList.remove("admin-edit-mode");
    document.body.classList.remove("admin-layout-mode");
    
    const toolbar = document.getElementById("admin-toolbar");
    if (toolbar) toolbar.classList.remove("active");
    
    const sidePanel = document.getElementById("admin-side-panel");
    if (sidePanel) sidePanel.classList.remove("active");

    disableContentEditable();
    applyState(liveState);
    
    addAuditLog("Admin session terminated.");
}

// --- Wire Click handlers for editable images ---
function wireImageEditOverlays() {
    document.querySelectorAll(".img-edit-overlay").forEach(overlay => {
        overlay.onclick = () => {
            const targetId = overlay.getAttribute("data-img-target");
            const modal = document.getElementById("admin-image-modal");
            const inputUrl = document.getElementById("img-source-url");
            const inputTarget = document.getElementById("img-target-id");
            const preview = document.getElementById("img-upload-preview");
            const previewContainer = document.getElementById("img-upload-preview-container");
            const fileName = document.getElementById("img-upload-name");

            if (modal) {
                let currentVal = "";
                if (targetId.includes(".")) {
                    const [collection, itemId, field] = targetId.split(".");
                    const item = draftState[collection].find(x => x.id === itemId);
                    if (item) currentVal = item[field];
                }
                
                inputUrl.value = currentVal.startsWith("data:") ? "" : currentVal;
                inputTarget.value = targetId;
                
                preview.src = currentVal;
                previewContainer.style.display = currentVal ? "flex" : "none";
                fileName.innerText = currentVal.startsWith("data:") ? "Local File Data" : "Asset Link";

                modal.classList.add("active");
            }
        };
    });
}

// --- Render drag-and-drop sections in Side Panel ---
function renderSidePanelSectionsList() {
    const listContainer = document.getElementById("admin-sections-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    draftState.sectionOrder.forEach((secName, index) => {
        const item = document.createElement("div");
        item.className = "section-list-item";
        item.setAttribute("draggable", "true");
        item.setAttribute("data-section-name", secName);
        item.setAttribute("data-index", index);

        const displayTitle = currentLang === "ar" ? getSectionArabicTitle(secName) : secName.replace(/-/g, ' ');

        item.innerHTML = `
            <div class="section-item-info">
                <span class="section-drag-dots">☰</span>
                <span class="section-item-name">${displayTitle}</span>
            </div>
            <div class="section-item-actions">
                <button class="reorder-btn sec-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button class="reorder-btn sec-down" title="Move Down" ${index === draftState.sectionOrder.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
        `;
        listContainer.appendChild(item);
    });

    listContainer.querySelectorAll(".sec-up").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const item = btn.closest(".section-list-item");
            const index = parseInt(item.getAttribute("data-index"));
            swapSections(index, index - 1);
        };
    });
    listContainer.querySelectorAll(".sec-down").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const item = btn.closest(".section-list-item");
            const index = parseInt(item.getAttribute("data-index"));
            swapSections(index, index + 1);
        };
    });

    let dragEl = null;
    listContainer.querySelectorAll(".section-list-item").forEach(item => {
        item.ondragstart = (e) => {
            dragEl = item;
            item.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        };
        item.ondragend = () => {
            dragEl = null;
            item.classList.remove("dragging");
        };
        item.ondragover = (e) => {
            e.preventDefault();
            return false;
        };
        item.ondrop = (e) => {
            e.preventDefault();
            if (dragEl && dragEl !== item) {
                const dragIndex = parseInt(dragEl.getAttribute("data-index"));
                const dropIndex = parseInt(item.getAttribute("data-index"));
                
                const arr = [...draftState.sectionOrder];
                const [removed] = arr.splice(dragIndex, 1);
                arr.splice(dropIndex, 0, removed);
                
                draftState.sectionOrder = arr;
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Reordered sections via layout panel`);
                applyState(draftState);
                renderSidePanelSectionsList();
                saveDraft();
            }
        };
    });
}

function getSectionArabicTitle(secName) {
    const maps = {
        "hero": "شاشة الترحيب الرئيسية",
        "services": "كتالوج خدماتنا",
        "portfolio": "معرض أعمال الوكالة",
        "why-choose-us": "لماذا تختار 3M Studio",
        "statistics": "لوحة الإحصائيات والأرقام",
        "testimonials": "تقييمات مجتمع الألعاب",
        "faq": "الأسئلة والأجوبة الشائعة",
        "contact": "قسم اتصل بنا"
    };
    return maps[secName] || secName;
}

function swapSections(idx1, idx2) {
    if (idx1 < 0 || idx1 >= draftState.sectionOrder.length || idx2 < 0 || idx2 >= draftState.sectionOrder.length) return;
    
    const arr = [...draftState.sectionOrder];
    const temp = arr[idx1];
    arr[idx1] = arr[idx2];
    arr[idx2] = temp;
    
    draftState.sectionOrder = arr;
    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Moved section ${temp} to index ${idx2}`);
    applyState(draftState);
    renderSidePanelSectionsList();
    saveDraft();
}

// --- Dynamic Switchers Click Triggers ---
function updateLangUIIndicators() {
    const langBtn = document.getElementById("lang-toggle-btn");
    if (langBtn) {
        langBtn.innerHTML = currentLang === "ar" ? 
            `<span class="flag-icon">🇪🇬</span> <span class="lang-name">العربية</span>` : 
            `<span class="flag-icon">🇺🇸</span> <span class="lang-name">English</span>`;
    }
    
    document.querySelectorAll(".lang-option-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
    });
}

function updateCurrencyUIIndicators() {
    const currBtn = document.getElementById("currency-toggle-btn");
    if (currBtn) {
        currBtn.innerHTML = `<span class="currency-name">${currentCurrency}</span>`;
    }

    document.querySelectorAll(".currency-option-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-currency") === currentCurrency);
    });
}

// --- Toggle active language ---
function setLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem("3m_studio_lang", currentLang);

    updateLangUIIndicators();
    applyState(adminMode ? draftState : liveState);
    
    addAuditLog(`Language switched to ${lang.toUpperCase()}`);
}

// --- Toggle active currency ---
function setCurrency(currency) {
    if (currency === currentCurrency) return;
    currentCurrency = currency;
    localStorage.setItem("3m_studio_currency", currentCurrency);

    updateCurrencyUIIndicators();
    
    const langDatabase = adminMode ? draftState[currentLang] : liveState[currentLang];
    renderServices(langDatabase.services);

    addAuditLog(`Currency switched to ${currency}`);
}

// --- Discord OAuth2 Authorization Logic ---
function triggerDiscordRealOAuth() {
    const clientId = "1519819519193780494";
    
    // Discord OAuth2 requires running the website through a web server (http/https protocol)
    if (window.location.protocol === "file:") {
        alert(currentLang === "ar" ? 
            "عذرًا! تسجيل دخول ديسكورد يتطلب تشغيل الموقع عبر سيرفر محلي (مثل Live Server في VS Code) وليس كملف مباشر (file://). سيتم فتح نافذة تسجيل الدخول التجريبي كبديل." : 
            "Discord login requires running the site through a local web server (like VS Code Live Server) and not directly as a local file (file://). Opening mock login as fallback."
        );
        const modal = document.getElementById("discord-auth-modal");
        if (modal) modal.classList.add("active");
        return;
    }

    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify`;
    
    window.location.href = authUrl;
}

function triggerDiscordMockOAuth() {
    const modal = document.getElementById("discord-auth-modal");
    if (modal) {
        modal.classList.add("active");
    }
}

function applyDiscordLoginState(user) {
    const authArea = document.getElementById("discord-auth-area");
    const nameLabel = document.getElementById("user-display-name");
    const initialLabel = document.getElementById("user-avatar-initial");
    const profileWrapper = document.getElementById("logged-user-profile");
    const loginBtn = document.getElementById("discord-login-btn");

    if (authArea && nameLabel && initialLabel) {
        nameLabel.innerText = user.username;
        
        if (user.avatar) {
            initialLabel.innerText = "";
            initialLabel.style.backgroundImage = `url(${user.avatar})`;
            initialLabel.style.backgroundSize = "cover";
            initialLabel.style.backgroundPosition = "center";
            initialLabel.style.border = "2px solid var(--primary-color)";
        } else {
            initialLabel.innerText = user.avatarLetter;
            initialLabel.style.backgroundImage = "none";
            initialLabel.style.border = "none";
        }
        
        authArea.classList.add("logged-in");
        if (profileWrapper) profileWrapper.classList.add("active");
        if (loginBtn) loginBtn.style.display = "none";
        
        const purchaseDiscord = document.getElementById("purchase-discord");
        if (purchaseDiscord) purchaseDiscord.value = user.username;
    }
}

function handleDiscordLogout() {
    localStorage.removeItem("discord_user");
    const authArea = document.getElementById("discord-auth-area");
    const profileWrapper = document.getElementById("logged-user-profile");
    const loginBtn = document.getElementById("discord-login-btn");

    if (authArea) {
        authArea.classList.remove("logged-in");
    }
    if (profileWrapper) {
        profileWrapper.classList.remove("active");
    }
    if (loginBtn) {
        loginBtn.style.display = "flex";
    }
    
    const initialLabel = document.getElementById("user-avatar-initial");
    if (initialLabel) {
        initialLabel.style.backgroundImage = "none";
        initialLabel.style.border = "none";
        initialLabel.innerText = "G";
    }
    
    const userOrdersModal = document.getElementById("user-orders-modal");
    if (userOrdersModal) userOrdersModal.classList.remove("active");
    
    addAuditLog("Discord account logged out.");
}

// --- Store Purchase Request modal handlers ---
function openPurchaseModal(prodId) {
    const user = localStorage.getItem("discord_user");
    if (!user) {
        const msg = currentLang === "ar" 
            ? "لإتمام عملية الشراء، يجب تسجيل الدخول باستخدام حسابك في ديسكورد أولاً.\n\nهل تريد تسجيل الدخول الآن؟"
            : "To complete your purchase, you must log in with Discord first.\n\nDo you want to log in now?";
            
        if (confirm(msg)) {
            triggerDiscordRealOAuth();
        }
        return;
    }

    const srv = (adminMode ? draftState[currentLang] : liveState[currentLang]).services.find(x => x.id === prodId);
    if (!srv) return;

    const modal = document.getElementById("purchase-modal");
    const title = document.getElementById("purchase-product-name");
    const price = document.getElementById("purchase-product-price");
    
    const nameInput = document.getElementById("purchase-name");
    const emailInput = document.getElementById("purchase-email");
    const discordInput = document.getElementById("purchase-discord");
    const detailsInput = document.getElementById("purchase-details");
    
    const form = document.getElementById("purchase-request-form");
    const successMsg = document.getElementById("purchase-success-msg");

    if (modal && title && price) {
        title.innerText = srv.name;
        title.setAttribute("data-target-prod-id", prodId);
        price.innerText = getFormattedPrice(srv.priceBase);
        
        const user = localStorage.getItem("discord_user");
        if (user) {
            discordInput.value = JSON.parse(user).username;
        } else {
            discordInput.value = "";
        }
        
        // Populate Merchant Payment Config values
        const vCashNumEl = document.getElementById("checkout-vodafone-num");
        const iPayAddrEl = document.getElementById("checkout-instapay-address");
        if (vCashNumEl) vCashNumEl.innerText = VODAFONE_CASH_NUMBER;
        if (iPayAddrEl) iPayAddrEl.innerText = INSTAPAY_ADDRESS;

        // Reset step 3 fields
        const vPhone = document.getElementById("checkout-v-phone-input");
        const vTxid = document.getElementById("checkout-v-txid-input");
        const vFile = document.getElementById("checkout-v-file-input");
        const iTxid = document.getElementById("checkout-i-txid-input");
        const iFile = document.getElementById("checkout-i-file-input");
        if (vPhone) vPhone.value = "";
        if (vTxid) vTxid.value = "";
        if (vFile) vFile.value = "";
        if (iTxid) iTxid.value = "";
        if (iFile) iFile.value = "";

        // Reset step state to Step 1
        setCheckoutActiveStep(1);
        
        form.style.display = "flex";
        successMsg.classList.remove("active");
        
        modal.classList.add("active");
    }
}

// --- Search and filter Orders in Admin Panel ---
// --- Search and filter Orders in Admin Panel ---
async function updateOrderStatusOnServer(orderId, action) {
    try {
        const response = await fetch("/api/admin-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, action })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to update order status");
        }
        return await response.json();
    } catch (err) {
        console.error("Error updating order status:", err);
        alert(`حدث خطأ أثناء تحديث حالة الطلب: ${err.message}`);
        return null;
    }
}

function renderOrdersList(filterQuery = "") {
    const container = document.getElementById("orders-list-container");
    if (!container) return;

    const q = filterQuery.toLowerCase().trim();
    const filteredOrders = orders.filter(o => 
        (o.id && o.id.toLowerCase().includes(q)) || 
        (o.orderCode && o.orderCode.toLowerCase().includes(q)) ||
        (o.name && o.name.toLowerCase().includes(q)) || 
        (o.email && o.email.toLowerCase().includes(q)) || 
        (o.discord && o.discord.toLowerCase().includes(q)) || 
        (o.service && o.service.toLowerCase().includes(q))
    );

    if (filteredOrders.length === 0) {
        container.innerHTML = `<div class="no-leads">لا يوجد طلبات شراء مطابقة حاليًا.</div>`;
        return;
    }

    container.innerHTML = filteredOrders.map(o => {
        let paymentBadge = '';
        const method = (o.paymentMethod || "").toLowerCase();
        if (method === 'paypal') {
            paymentBadge = `<span style="background:#003087; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">PayPal 💳</span>`;
        } else if (method === 'vodafone_cash') {
            paymentBadge = `<span style="background:#e60000; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">Vodafone Cash 📱</span>`;
        } else if (method === 'instapay') {
            paymentBadge = `<span style="background:#8e44ad; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">InstaPay ⚡</span>`;
        } else {
            paymentBadge = `<span style="background:rgba(255,255,255,0.1); color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem;">${o.paymentMethod || "غير محدد"}</span>`;
        }

        let statusText = o.status;
        let statusClass = o.status || 'pending';
        if (o.status === 'pending_review') { statusText = 'بانتظار المراجعة'; }
        else if (o.status === 'paid') { statusText = 'مدفوع'; }
        else if (o.status === 'failed') { statusText = 'فشل الدفع / مرفوض'; }
        else if (o.status === 'pending') { statusText = 'معلق'; }
        else if (o.status === 'progress') { statusText = 'قيد التنفيذ'; }
        else if (o.status === 'completed') { statusText = 'مكتمل'; }
        else if (o.status === 'cancelled') { statusText = 'ملغي'; }

        const proofHtml = o.proofImageUrl ? `
            <div style="margin-top:10px;">
                <span style="font-size:0.75rem; color:var(--text-dark); display:block; margin-bottom:5px;">إثبات التحويل (Proof of Payment):</span>
                <div class="proof-thumbnail-wrapper" style="position:relative; width:80px; height:80px; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                    <img src="${o.proofImageUrl}" class="proof-thumbnail" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s;" alt="Proof">
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;" class="proof-overlay">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M15 3h6v6h-2V6.41L12.41 13 11 11.59 17.59 5H15V3zM9 5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4h-2v4H5V7h4V5z"/></svg>
                    </div>
                </div>
            </div>
        ` : '';

        // Quick Approve/Reject buttons for review state
        let quickActionsHtml = '';
        if (o.status === 'pending_review') {
            quickActionsHtml = `
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn-primary btn-sm btn-approve" data-ord-id="${o.id}" style="background:#2ecc71; border-color:#2ecc71; padding:6px 12px; font-size:0.75rem; color:white; cursor:pointer;">✓ قبول الدفع</button>
                    <button class="btn btn-danger btn-sm btn-reject" data-ord-id="${o.id}" style="background:#e74c3c; border-color:#e74c3c; padding:6px 12px; font-size:0.75rem; color:white; cursor:pointer;">✗ رفض الدفع</button>
                </div>
            `;
        }

        return `
        <div class="lead-card" data-order-id="${o.id}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:15px; margin-bottom:15px; position:relative; transition:all 0.3s ease;">
            <div class="lead-card-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:10px; margin-bottom:10px;">
                <div class="lead-name">
                    <h5 style="color:white; margin:0; font-size:0.95rem;">${o.name} <span style="font-family:monospace; color:var(--primary-color); margin:0 8px; font-size:0.8rem;">${o.orderCode || o.id}</span></h5>
                    <span class="lead-email" style="font-size:0.7rem; color:var(--text-dark); display:block; margin-top:4px;">
                        📧 ${o.email} | 🎮 ديسكورد: ${o.discord} | 📅 ${new Date(o.timestamp).toLocaleString('ar-EG')}
                    </span>
                </div>
                <div class="lead-card-actions" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span class="lead-tag" style="background:rgba(0,242,254,0.1); color:var(--primary-color); padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${o.price}</span>
                    <select class="order-status-selector ${statusClass}" data-ord-id="${o.id}" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                        <option value="pending_review" ${o.status === 'pending_review' ? 'selected' : ''}>بانتظار المراجعة</option>
                        <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>مدفوع</option>
                        <option value="failed" ${o.status === 'failed' ? 'selected' : ''}>مرفوض / Failed</option>
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>معلق</option>
                        <option value="progress" ${o.status === 'progress' ? 'selected' : ''}>قيد التنفيذ</option>
                        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                    </select>
                    <button class="table-btn table-btn-delete btn-del-ord" data-ord-id="${o.id}" style="padding:5px 10px; background:#ff3333; color:white; border:none; border-radius:6px; font-size:0.75rem; cursor:pointer; transition:0.2s;">حذف</button>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:10px;">
                <div>
                    <strong style="font-size:0.8rem; color:#ffffff; display:block; margin-bottom:4px;">📦 المنتج المطلوب:</strong>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${o.service}</span>
                </div>
                <div>
                    <strong style="font-size:0.8rem; color:#ffffff; display:block; margin-bottom:4px;">💳 تفاصيل الدفع:</strong>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <div>طريقة الدفع: ${paymentBadge}</div>
                        ${o.transactionId ? `<div style="font-size:0.75rem;">رقم العملية: <code style="color:var(--secondary-color); font-family:monospace;">${o.transactionId}</code></div>` : ''}
                        ${o.senderPhone ? `<div style="font-size:0.75rem;">رقم المرسل: <code style="color:var(--primary-color); font-family:monospace;">${o.senderPhone}</code></div>` : ''}
                    </div>
                </div>
            </div>

            <div style="background:rgba(255,255,255,0.01); border-radius:6px; padding:10px; border:1px solid rgba(255,255,255,0.02); margin-top:5px;">
                <strong style="font-size:0.8rem; color:#ffffff; display:block; margin-bottom:4px;">💬 متطلبات وتفاصيل العميل:</strong>
                <p class="lead-message" style="margin:0; font-size:0.8rem; color:var(--text-muted); white-space:pre-wrap;">"${o.details}"</p>
            </div>

            ${proofHtml}
            ${quickActionsHtml}
        </div>
        `;
    }).join("");

    // Lightbox modal functionality
    container.querySelectorAll(".proof-thumbnail-wrapper").forEach(wrapper => {
        wrapper.onclick = () => {
            const imgEl = wrapper.querySelector(".proof-thumbnail");
            const lightbox = document.getElementById("proof-image-modal");
            const lightboxImg = document.getElementById("proof-image-display");
            if (lightbox && lightboxImg && imgEl) {
                lightboxImg.src = imgEl.src;
                lightbox.classList.add("active");
            }
        };
    });

    // Approve Button
    container.querySelectorAll(".btn-approve").forEach(btn => {
        btn.onclick = async () => {
            const ordId = btn.getAttribute("data-ord-id");
            btn.disabled = true;
            btn.innerText = "⏳ جاري القبول...";
            const res = await updateOrderStatusOnServer(ordId, 'approve');
            if (res) {
                const ord = orders.find(x => x.id === ordId);
                if (ord) ord.status = 'paid';
                addAuditLog(`Admin APPROVED payment for order [${ordId}]`);
                renderOrdersList(filterQuery);
            } else {
                btn.disabled = false;
                btn.innerText = "✓ قبول الدفع";
            }
        };
    });

    // Reject Button
    container.querySelectorAll(".btn-reject").forEach(btn => {
        btn.onclick = async () => {
            const ordId = btn.getAttribute("data-ord-id");
            if (confirm("هل تود رفض هذا التحويل؟")) {
                btn.disabled = true;
                btn.innerText = "⏳ جاري الرفض...";
                const res = await updateOrderStatusOnServer(ordId, 'reject');
                if (res) {
                    const ord = orders.find(x => x.id === ordId);
                    if (ord) ord.status = 'failed';
                    addAuditLog(`Admin REJECTED payment for order [${ordId}]`);
                    renderOrdersList(filterQuery);
                } else {
                    btn.disabled = false;
                    btn.innerText = "✗ رفض الدفع";
                }
            }
        };
    });

    // Select input status change handler
    container.querySelectorAll(".order-status-selector").forEach(sel => {
        sel.onchange = async () => {
            const ordId = sel.getAttribute("data-ord-id");
            const newStatus = sel.value;
            sel.disabled = true;
            
            let action = 'reject'; // fallback
            if (newStatus === 'paid') action = 'approve';
            else if (newStatus === 'pending_review') action = 'pending_review';
            
            const res = await updateOrderStatusOnServer(ordId, action);
            if (res) {
                sel.className = `order-status-selector ${newStatus}`;
                const ord = orders.find(x => x.id === ordId);
                if (ord) {
                    ord.status = newStatus;
                    localStorage.setItem("3m_studio_orders", JSON.stringify(orders));
                    addAuditLog(`Updated order status [${ordId}] to ${newStatus.toUpperCase()}`);
                }
            }
            sel.disabled = false;
        };
    });

    // Delete Button
    container.querySelectorAll(".btn-del-ord").forEach(btn => {
        btn.onclick = async () => {
            const ordId = btn.getAttribute("data-ord-id");
            if (confirm("هل أنت متأكد من رغبتك بحذف طلب الشراء هذا نهائيًا؟")) {
                btn.disabled = true;
                btn.innerText = "⏳ جاري الحذف...";
                const res = await updateOrderStatusOnServer(ordId, 'delete');
                if (res) {
                    const idx = orders.findIndex(x => x.id === ordId);
                    if (idx > -1) {
                        orders.splice(idx, 1);
                        localStorage.setItem("3m_studio_orders", JSON.stringify(orders));
                        renderOrdersList(filterQuery);
                        addAuditLog(`Deleted order request code [${ordId}] from Discord and local cache.`);
                    }
                } else {
                    btn.disabled = false;
                    btn.innerText = "حذف";
                }
            }
        };
    });
}

// --- Render Logged User specific order history ---
function renderUserOrdersHistory(discordUsername) {
    const list = document.getElementById("user-orders-list");
    if (!list) return;

    const loggedUser = JSON.parse(localStorage.getItem("discord_user"));
    const userOrders = orders.filter(o => {
        if (loggedUser && loggedUser.id && o.userId === loggedUser.id) return true;
        return o.discord && o.discord.toLowerCase() === discordUsername.toLowerCase();
    });

    const avatarLarge = document.getElementById("user-orders-avatar");
    const usernameLabel = document.getElementById("user-orders-username");

    if (avatarLarge && usernameLabel) {
        usernameLabel.innerText = discordUsername;
        avatarLarge.innerText = discordUsername.charAt(0).toUpperCase();
    }

    if (userOrders.length === 0) {
        list.innerHTML = `
            <div class="no-history">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px; height:48px; color:var(--text-dark); margin-bottom:12px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>${currentLang === 'ar' ? 'لا يوجد طلبات شراء مسجلة لهذا الحساب حاليًا.' : 'No purchases found for this Discord user account yet.'}</p>
            </div>
        `;
        return;
    }

    list.innerHTML = userOrders.map(o => {
        const showReviewBtn = (o.status === 'paid' || o.status === 'completed' || o.status === 'paid_review') 
            ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px; display:inline-block;" onclick="promptLeaveReview('${o.id}')">⭐ تقييم / Rate</button>`
            : '';
        return `
        <div class="history-order-card">
            <div class="history-order-header">
                <span class="history-order-title">${o.service}</span>
                <span class="history-order-id">${o.id}</span>
            </div>
            <div class="history-order-meta" style="flex-direction:column; align-items:flex-start;">
                <span class="history-order-price">${o.price}</span>
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:5px;">
                    <span class="order-status-badge ${o.status || 'pending'}">${o.status === 'pending' ? 'معلق' : o.status === 'progress' ? 'قيد التنفيذ' : o.status === 'paid' || o.status === 'completed' ? 'مكتمل' : 'ملغي'}</span>
                    ${showReviewBtn}
                </div>
            </div>
        </div>
        `;
    }).join("");
}

window.promptLeaveReview = function(orderId) {
    const loggedUser = JSON.parse(localStorage.getItem("discord_user"));
    if (!loggedUser || !loggedUser.id) {
        showToast("يرجى تسجيل الدخول أولاً للمطالبة بالتقييم", "warning");
        return;
    }
    
    const ratingStr = prompt("أدخل التقييم من 1 إلى 5 نجوم (Enter rating 1-5):", "5");
    if (!ratingStr) return;
    
    const rating = parseInt(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        showToast("تقييم غير صالح / Invalid rating", "warning");
        return;
    }
    
    const comment = prompt("اكتب تعليقك على الخدمة (Write your comment):", "");
    if (!comment) return;
    
    fetch("/api/portal?action=submit_review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: loggedUser.id,
            orderId: orderId,
            rating: rating,
            comment: comment
        })
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Failed to submit review", "error");
        } else {
            showToast("تم إضافة تقييمك بنجاح! شكرًا لك.", "success");
            location.reload();
        }
    })
    .catch(err => {
        console.error("Error submitting review:", err);
        showToast("Error connecting to server", "error");
    });
};

// --- Export Orders database to CSV file download ---
function exportOrdersToCSV() {
    if (orders.length === 0) {
        alert("لا يوجد طلبات شراء حالية لتصديرها.");
        return;
    }

    const headers = ["Order ID", "Customer Name", "Email Address", "Discord Username", "Service Title", "Amount Paid", "Order Status", "Timestamp"];
    const rows = orders.map(o => [
        o.id,
        o.name.replace(/,/g, ' '),
        o.email,
        o.discord,
        o.service.replace(/,/g, ' '),
        o.price.replace(/,/g, ' '),
        o.status || 'pending',
        o.timestamp
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `3m_studio_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addAuditLog("Exported purchase requests log as CSV.");

    // Log export operation
    sendDiscordWebhookNotification("admin_action", "📥 تصدير سجل المبيعات والطلبات (CSV Export)", [
        { name: "العملية (Operation)", value: "تصدير كافة الطلبات والمبيعات الحالية بصيغة ملف CSV", inline: true },
        { name: "عدد السجلات (Records Count)", value: `${orders.length} طلب شراء`, inline: true }
    ]);
}

// --- Wire all UI interactive events ---
function wireEvents() {
    const langBtn = document.getElementById("lang-toggle-btn");
    const langDropdown = document.getElementById("lang-dropdown");
    if (langBtn && langDropdown) {
        langBtn.onclick = (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle("active");
            document.getElementById("currency-dropdown").classList.remove("active");
        };

        langDropdown.querySelectorAll(".lang-option-btn").forEach(btn => {
            btn.onclick = () => {
                const targetLang = btn.getAttribute("data-lang");
                setLanguage(targetLang);
                langDropdown.classList.remove("active");
            };
        });
    }

    const currBtn = document.getElementById("currency-toggle-btn");
    const currDropdown = document.getElementById("currency-dropdown");
    if (currBtn && currDropdown) {
        currBtn.onclick = (e) => {
            e.stopPropagation();
            currDropdown.classList.toggle("active");
            langDropdown.classList.remove("active");
        };

        currDropdown.querySelectorAll(".currency-option-btn").forEach(btn => {
            btn.onclick = () => {
                const targetCurr = btn.getAttribute("data-currency");
                setCurrency(targetCurr);
                currDropdown.classList.remove("active");
            };
        });
    }

    document.addEventListener("click", () => {
        if (langDropdown) langDropdown.classList.remove("active");
        if (currDropdown) currDropdown.classList.remove("active");
    });

    const discordLoginBtn = document.getElementById("discord-login-btn");
    const discordAuthModal = document.getElementById("discord-auth-modal");
    const discordCancel = document.getElementById("discord-oauth-cancel");
    const discordAuth = document.getElementById("discord-oauth-auth");

    if (discordLoginBtn) {
        discordLoginBtn.onclick = triggerDiscordRealOAuth;
    }
    if (discordCancel) {
        discordCancel.onclick = () => discordAuthModal.classList.remove("active");
    }
    if (discordAuth) {
        discordAuth.onclick = () => {
            const inputName = document.getElementById("discord-input-username").value.trim() || "GamerPro#1337";
            const mockUser = {
                id: `disc-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                username: inputName,
                avatarLetter: inputName.charAt(0).toUpperCase()
            };
            
            localStorage.setItem("discord_user", JSON.stringify(mockUser));
            applyDiscordLoginState(mockUser);
            
            addAuditLog(`Discord Login simulated: Authorized as ${mockUser.username}`);
            
            // Dispatch Discord Webhook log for registration / login
            const knownUsers = JSON.parse(localStorage.getItem("3m_known_users") || "[]");
            const isNew = !knownUsers.includes(mockUser.id);
            if (isNew) {
                knownUsers.push(mockUser.id);
                localStorage.setItem("3m_known_users", JSON.stringify(knownUsers));
                sendDiscordWebhookNotification("registration", "👤 تسجيل مستخدم جديد للموقع (تجريبي)", [
                    { name: "اسم المستخدم (Username)", value: mockUser.username, inline: true },
                    { name: "معرف الحساب (User ID)", value: mockUser.id, inline: true }
                ]);
            }

            sendDiscordWebhookNotification("login", "🔑 تسجيل دخول جديد للموقع (تجريبي)", [
                { name: "اسم المستخدم (Username)", value: mockUser.username, inline: true },
                { name: "معرف الحساب (User ID)", value: mockUser.id, inline: true }
            ]);
            
            discordAuthModal.classList.remove("active");
        };
    }

    const btnLogout = document.getElementById("btn-discord-logout");
    if (btnLogout) {
        btnLogout.onclick = handleDiscordLogout;
    }

    const btnEditProfile = document.getElementById("btn-discord-edit-profile");
    if (btnEditProfile) {
        btnEditProfile.onclick = () => {
            const userStr = localStorage.getItem("discord_user");
            if (userStr) {
                const userObj = JSON.parse(userStr);
                const newUsername = prompt(
                    currentLang === 'ar' ? 'أدخل اسم المستخدم الجديد:' : 'Enter new username:', 
                    userObj.username
                );
                if (newUsername && newUsername.trim() !== "" && newUsername.trim() !== userObj.username) {
                    const oldUsername = userObj.username;
                    userObj.username = newUsername.trim();
                    userObj.avatarLetter = userObj.username.charAt(0).toUpperCase();
                    
                    localStorage.setItem("discord_user", JSON.stringify(userObj));
                    applyDiscordLoginState(userObj);
                    
                    addAuditLog(`User profile updated: ${oldUsername} -> ${newUsername}`);
                    
                    // Log to Discord
                    sendDiscordWebhookNotification("profile_edit", "📝 تعديل بيانات الحساب (Profile Edit)", [
                        { name: "اسم المستخدم القديم (Old Username)", value: oldUsername, inline: true },
                        { name: "اسم المستخدم الجديد (New Username)", value: userObj.username, inline: true },
                        { name: "معرف الحساب (User ID)", value: userObj.id, inline: true }
                    ]);
                }
            }
        };
    }

    const btnDeleteAccount = document.getElementById("btn-discord-delete-account");
    if (btnDeleteAccount) {
        btnDeleteAccount.onclick = () => {
            const userStr = localStorage.getItem("discord_user");
            if (userStr) {
                const userObj = JSON.parse(userStr);
                const confirmDelete = confirm(
                    currentLang === 'ar' ? 'هل أنت متأكد من حذف الحساب ومسح كافة بياناتك المحلية؟' : 'Are you sure you want to delete your account and clear all local data?'
                );
                if (confirmDelete) {
                    // Send delete log first
                    sendDiscordWebhookNotification("account_delete", "🗑️ حذف حساب مستخدم (Account Deleted)", [
                        { name: "اسم المستخدم (Username)", value: userObj.username, inline: true },
                        { name: "معرف الحساب (User ID)", value: userObj.id, inline: true }
                    ]);

                    handleDiscordLogout();
                    
                    localStorage.removeItem("discord_user");
                    addAuditLog("User account deleted.");
                    alert(currentLang === 'ar' ? 'تم حذف حسابك ومسح كافة البيانات بنجاح.' : 'Account deleted successfully.');
                }
            }
        };
    }

    const btnHistory = document.getElementById("btn-show-orders-history");
    const userOrdersModal = document.getElementById("user-orders-modal");
    const userOrdersClose = document.getElementById("user-orders-close");

    if (btnHistory && userOrdersModal) {
        btnHistory.onclick = () => {
            const user = localStorage.getItem("discord_user");
            if (user) {
                const parsedUser = JSON.parse(user);
                renderUserOrdersHistory(parsedUser.username);
                userOrdersModal.classList.add("active");
            }
        };
    }
    if (userOrdersClose) {
        userOrdersClose.onclick = () => userOrdersModal.classList.remove("active");
    }

    const contactForm = document.getElementById("contact-form");
    const successMsg = document.getElementById("form-success-msg");
    const resetFormBtn = document.getElementById("form-reset-btn");

    if (contactForm && successMsg) {
        contactForm.onsubmit = (e) => {
            e.preventDefault();
            
            const newLead = {
                id: `lead-${Date.now()}`,
                name: document.getElementById("form-name").value.trim(),
                email: document.getElementById("form-email").value.trim(),
                discord: document.getElementById("form-discord").value.trim(),
                service: document.getElementById("form-service").value,
                message: document.getElementById("form-message").value.trim(),
                timestamp: new Date().toLocaleString()
            };

            leads.unshift(newLead);
            localStorage.setItem("3m_studio_leads", JSON.stringify(leads));
            updateMsgCountBadge();

            const adminEmailBody = `
                New Contact Form Inquiry!
                ------------------------
                Client Name: ${newLead.name}
                Client Email: ${newLead.email}
                Discord ID: ${newLead.discord}
                Service Chosen: ${newLead.service}
                Message Content:
                "${newLead.message}"
            `;
            triggerSMTPSimulation("omarsaber6545@gmail.com", `Inquiry: ${newLead.service} - ${newLead.name}`, adminEmailBody);
            
            const clientEmailBody = `
                Dear ${newLead.name},
                
                Thank you for contacting 3M Studio! This is an automated email receipt to confirm we have received your request for: "${newLead.service}".
                
                One of our representatives will contact you shortly on Discord (${newLead.discord}) or via email.
                
                Best Regards,
                3M Studio Technical Team
            `;
            triggerSMTPSimulation(newLead.email, "Inquiry Received | 3M Studio", clientEmailBody);

            // Send real email notification to administrator
            sendRealEmailViaFormSubmit(`3M Studio - رسالة تواصل جديدة من ${newLead.name}`, {
                "Name / الاسم": newLead.name,
                "Email / البريد": newLead.email,
                "Discord / ديسكورد": newLead.discord,
                "Service / الخدمة": newLead.service,
                "Message / الرسالة": newLead.message
            });

            // Dispatch Discord Webhook log
            if (newLead.service === "فتح تذكرة دعم فني") {
                sendDiscordWebhookNotification("ticket", "🎟️ إنشاء تذكرة دعم جديدة", [
                    { name: "الاسم (Name)", value: newLead.name, inline: true },
                    { name: "البريد (Email)", value: newLead.email, inline: true },
                    { name: "ديسكورد (Discord)", value: newLead.discord, inline: true },
                    { name: "الموضوع (Service)", value: newLead.service, inline: true },
                    { name: "تفاصيل التذكرة (Details)", value: newLead.message }
                ]);
            } else {
                sendDiscordWebhookNotification("contact", "✉️ رسالة تواصل جديدة", [
                    { name: "الاسم (Name)", value: newLead.name, inline: true },
                    { name: "البريد (Email)", value: newLead.email, inline: true },
                    { name: "ديسكورد (Discord)", value: newLead.discord, inline: true },
                    { name: "الخدمة المطلوبة (Service)", value: newLead.service, inline: true },
                    { name: "الرسالة (Message)", value: newLead.message }
                ]);
            }

            addAuditLog(`Contact Message submitted by ${newLead.name}. Real, simulated emails, and Discord Webhook dispatched.`);
            
            contactForm.reset();
            contactForm.style.display = "none";
            successMsg.classList.add("active");
        };

        if (resetFormBtn) {
            resetFormBtn.onclick = () => {
                successMsg.classList.remove("active");
                contactForm.style.display = "flex";
            };
        }
    }

    const purchaseModal = document.getElementById("purchase-modal");
    const purchaseClose = document.getElementById("purchase-modal-close");
    const purchaseForm = document.getElementById("purchase-request-form");
    const purchaseSuccess = document.getElementById("purchase-success-msg");
    const purchaseSuccessCloseBtn = document.getElementById("purchase-success-close");

    if (purchaseClose) purchaseClose.onclick = () => purchaseModal.classList.remove("active");

    if (purchaseForm && purchaseSuccess) {
        // Step buttons event listeners
        const gotoStep2Btn = document.getElementById("checkout-goto-step2");
        const gotoStep3Btn = document.getElementById("checkout-goto-step3");
        const backToStep1Btn = document.getElementById("checkout-back-to-step1");
        const backToStep2Btn = document.getElementById("checkout-back-to-step2");

        if (gotoStep2Btn) {
            gotoStep2Btn.onclick = () => {
                const name = document.getElementById("purchase-name").value.trim();
                const email = document.getElementById("purchase-email").value.trim();
                const discord = document.getElementById("purchase-discord").value.trim();
                const details = document.getElementById("purchase-details").value.trim();

                if (!name || !email || !discord || !details) {
                    alert(currentLang === 'ar' ? "يرجى ملء جميع الحقول المطلوبة!" : "Please fill in all required fields!");
                    return;
                }
                setCheckoutActiveStep(2);
            };
        }

        if (backToStep1Btn) {
            backToStep1Btn.onclick = () => {
                setCheckoutActiveStep(1);
            };
        }

        if (gotoStep3Btn) {
            gotoStep3Btn.onclick = () => {
                const paymentMethodInput = document.querySelector('input[name="payment_method"]:checked');
                if (!paymentMethodInput) {
                    alert(currentLang === 'ar' ? "يرجى اختيار طريقة الدفع!" : "Please select a payment method!");
                    return;
                }

                const method = paymentMethodInput.value;
                const paypalArea = document.getElementById("checkout-paypal-area");
                const vodafoneArea = document.getElementById("checkout-vodafone-area");
                const instapayArea = document.getElementById("checkout-instapay-area");

                if (paypalArea) paypalArea.style.display = "none";
                if (vodafoneArea) vodafoneArea.style.display = "none";
                if (instapayArea) instapayArea.style.display = "none";

                if (method === "paypal") {
                    if (paypalArea) paypalArea.style.display = "block";
                } else if (method === "vodafone_cash") {
                    if (vodafoneArea) vodafoneArea.style.display = "block";
                } else if (method === "instapay") {
                    if (instapayArea) instapayArea.style.display = "block";
                }

                setCheckoutActiveStep(3);
            };
        }

        if (backToStep2Btn) {
            backToStep2Btn.onclick = () => {
                setCheckoutActiveStep(2);
            };
        }

        // Mock PayPal Sandbox Button
        const mockPaypalBtn = document.getElementById("checkout-mock-paypal-btn");
        if (mockPaypalBtn) {
            mockPaypalBtn.onclick = () => {
                const name = document.getElementById("purchase-name").value.trim();
                const email = document.getElementById("purchase-email").value.trim();
                const discord = document.getElementById("purchase-discord").value.trim();
                const details = document.getElementById("purchase-details").value.trim();
                const prodName = document.getElementById("purchase-product-name").innerText;
                const prodPrice = document.getElementById("purchase-product-price").innerText;

                mockPaypalBtn.disabled = true;
                const origText = mockPaypalBtn.innerText;
                mockPaypalBtn.innerText = currentLang === 'ar' ? "🔄 جاري الاتصال ببوابة PayPal..." : "🔄 Connecting to PayPal...";

                setTimeout(() => {
                    mockPaypalBtn.innerText = currentLang === 'ar' ? "🔒 جاري تفويض العملية..." : "🔒 Authorizing transaction...";
                    
                    setTimeout(() => {
                        const dummyTx = "PAYID-MOCK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                        
                        fetch("/api/checkout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                clientName: name,
                                clientEmail: email,
                                clientDiscord: discord,
                                prodName,
                                prodPrice,
                                clientDetails: details,
                                paymentMethod: "paypal",
                                transactionId: dummyTx
                            })
                        })
                        .then(res => {
                            if (!res.ok) throw new Error("API failed");
                            return res.json();
                        })
                        .then(data => {
                            if (data.success) {
                                const localOrders = JSON.parse(localStorage.getItem("3m_local_orders") || "[]");
                                localOrders.push({
                                    id: data.orderId,
                                    code: data.orderCode,
                                    service: prodName,
                                    status: data.status
                                });
                                localStorage.setItem("3m_local_orders", JSON.stringify(localOrders));

                                const newOrder = {
                                    id: data.orderId,
                                    orderCode: data.orderCode,
                                    name,
                                    email,
                                    discord,
                                    service: prodName,
                                    details,
                                    price: prodPrice,
                                    paymentMethod: "paypal",
                                    transactionId: dummyTx,
                                    senderPhone: "N/A",
                                    status: data.status,
                                    timestamp: new Date().toISOString(),
                                    proofImageUrl: null
                                };
                                orders.unshift(newOrder);
                                localStorage.setItem("3m_studio_orders", JSON.stringify(orders));

                                // Simulated emails
                                const adminOrderBody = `
                                    Urgent: New Purchase Request ${data.orderCode} (Paid via PayPal)!
                                    -------------------------------------------------------------
                                    Customer Name: ${name}
                                    Customer Email: ${email}
                                    Discord Username: ${discord}
                                    Product Selected: ${prodName}
                                    Agreed price: ${prodPrice}
                                    Payment Method: PAYPAL
                                    Transaction ID: ${dummyTx}
                                    Additional Instructions:
                                    "${details}"
                                `;
                                triggerSMTPSimulation("omarsaber6545@gmail.com", `Order Alert ${data.orderCode} (PAID) - ${prodName}`, adminOrderBody);

                                sendRealEmailViaFormSubmit(`3M Studio - طلب شراء مدفوع بايبال ${data.orderCode} (${prodName})`, {
                                    "Order ID / رقم الطلب": data.orderCode,
                                    "Customer / العميل": name,
                                    "Email / البريد": email,
                                    "Discord / ديسكورد": discord,
                                    "Product / المنتج": prodName,
                                    "Price / السعر": prodPrice,
                                    "Payment Method / طريقة الدفع": "PAYPAL",
                                    "Transaction ID / رقم العملية": dummyTx,
                                    "Status / الحالة": "PAID",
                                    "Details / التفاصيل": details
                                });

                                document.getElementById("purchase-order-id").innerText = data.orderCode;
                                const descEl = document.getElementById("purchase-success-desc");
                                if (descEl) {
                                    descEl.innerText = currentLang === 'ar'
                                        ? "شكرًا لتعاملك مع 3M Studio. تم تأكيد الدفع عبر PayPal وتنشيط طلبك بنجاح! تم إرسال رسالة تأكيد إلى بريدك الإلكتروني."
                                        : "Thank you for choosing 3M Studio. Your payment via PayPal has been confirmed and your order activated successfully! A confirmation has been sent to your email.";
                                }

                                purchaseForm.style.display = "none";
                                purchaseSuccess.classList.add("active");
                            }
                        })
                        .catch(err => {
                            console.error("PayPal mock transaction failed:", err);
                            alert(currentLang === 'ar' ? "فشل تأكيد عملية PayPal. يرجى المحاولة مجدداً." : "PayPal authorization failed. Please try again.");
                        })
                        .finally(() => {
                            mockPaypalBtn.disabled = false;
                            mockPaypalBtn.innerText = origText;
                        });

                    }, 1000);
                }, 1000);
            };
        }

        // Form Submit Handler
        purchaseForm.onsubmit = async (e) => {
            e.preventDefault();

            const prodName = document.getElementById("purchase-product-name").innerText;
            const prodPrice = document.getElementById("purchase-product-price").innerText;
            const clientName = document.getElementById("purchase-name").value.trim();
            const clientEmail = document.getElementById("purchase-email").value.trim();
            const clientDiscord = document.getElementById("purchase-discord").value.trim();
            const clientDetails = document.getElementById("purchase-details").value.trim();

            const paymentMethodInput = document.querySelector('input[name="payment_method"]:checked');
            const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'paypal';

            let transactionId = "";
            let senderPhone = "";
            let proofImage = "";

            if (paymentMethod === "paypal") {
                transactionId = "PAYID-MOCK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
            } else if (paymentMethod === "vodafone_cash") {
                senderPhone = document.getElementById("checkout-v-phone-input").value.trim();
                transactionId = document.getElementById("checkout-v-txid-input").value.trim();
                const fileInput = document.getElementById("checkout-v-file-input");
                if (!senderPhone || !transactionId) {
                    alert(currentLang === 'ar' ? "يرجى إدخال رقم المحمول ورقم العملية!" : "Please enter your phone number and transaction ID!");
                    return;
                }
                if (fileInput && fileInput.files.length > 0) {
                    try {
                        proofImage = await getBase64(fileInput.files[0]);
                    } catch (e) {
                        console.error("Error reading file:", e);
                    }
                }
            } else if (paymentMethod === "instapay") {
                transactionId = document.getElementById("checkout-i-txid-input").value.trim();
                const fileInput = document.getElementById("checkout-i-file-input");
                if (!transactionId) {
                    alert(currentLang === 'ar' ? "يرجى إدخال رقم العملية!" : "Please enter the transaction ID!");
                    return;
                }
                if (fileInput && fileInput.files.length > 0) {
                    try {
                        proofImage = await getBase64(fileInput.files[0]);
                    } catch (e) {
                        console.error("Error reading file:", e);
                    }
                }
            }

            const submitBtn = document.getElementById("checkout-btn-submit");
            const originalBtnText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = currentLang === 'ar' ? "🔄 جاري إرسال الطلب..." : "🔄 Submitting order...";

            try {
                const response = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        clientName,
                        clientEmail,
                        clientDiscord,
                        prodName,
                        prodPrice,
                        clientDetails,
                        paymentMethod,
                        transactionId,
                        senderPhone,
                        proofImage
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(errText);
                }

                const data = await response.json();
                if (data.success) {
                    const localOrders = JSON.parse(localStorage.getItem("3m_local_orders") || "[]");
                    localOrders.push({
                        id: data.orderId,
                        code: data.orderCode,
                        service: prodName,
                        status: data.status
                    });
                    localStorage.setItem("3m_local_orders", JSON.stringify(localOrders));

                    const newOrder = {
                        id: data.orderId,
                        orderCode: data.orderCode,
                        name: clientName,
                        email: clientEmail,
                        discord: clientDiscord,
                        service: prodName,
                        details: clientDetails,
                        price: prodPrice,
                        paymentMethod: paymentMethod,
                        transactionId: transactionId || "N/A",
                        senderPhone: senderPhone || "N/A",
                        status: data.status,
                        timestamp: new Date().toISOString(),
                        proofImageUrl: proofImage || null
                    };
                    orders.unshift(newOrder);
                    localStorage.setItem("3m_studio_orders", JSON.stringify(orders));

                    // SMTP simulated emails
                    const adminOrderBody = `
                        Urgent: New Purchase Request ${data.orderCode}!
                        --------------------------------------
                        Customer Name: ${clientName}
                        Customer Email: ${clientEmail}
                        Discord Username: ${clientDiscord}
                        Product Selected: ${prodName}
                        Agreed price: ${prodPrice}
                        Payment Method: ${paymentMethod.toUpperCase()}
                        Transaction ID: ${transactionId || 'N/A'}
                        Sender Phone: ${senderPhone || 'N/A'}
                        Additional Instructions:
                        "${clientDetails}"
                    `;
                    triggerSMTPSimulation("omarsaber6545@gmail.com", `Order Alert ${data.orderCode} - ${prodName}`, adminOrderBody);
                    
                    const clientOrderBody = `
                        Dear ${clientName},
                        
                        Thank you for your order! This email confirms your purchase request for: "${prodName}" has been received.
                        
                        Your Unique Order Code is: ${data.orderCode}
                        Product Price: ${prodPrice}
                        Payment Method: ${paymentMethod.toUpperCase()}
                        
                        Our technical team will review your payment and reach out shortly.
                        
                        Best Regards,
                        3M Studio Billing
                    `;
                    triggerSMTPSimulation(clientEmail, `Order Confirmation ${data.orderCode} | 3M Studio`, clientOrderBody);

                    // Send FormSubmit email
                    sendRealEmailViaFormSubmit(`3M Studio - طلب شراء جديد ${data.orderCode} (${prodName})`, {
                        "Order ID / رقم الطلب": data.orderCode,
                        "Customer / العميل": clientName,
                        "Email / البريد": clientEmail,
                        "Discord / ديسكورد": clientDiscord,
                        "Product / المنتج": prodName,
                        "Price / السعر": prodPrice,
                        "Payment Method / طريقة الدفع": paymentMethod.toUpperCase(),
                        "Transaction ID / رقم العملية": transactionId || "N/A",
                        "Sender Phone / رقم المرسل": senderPhone || "N/A",
                        "Details / التفاصيل": clientDetails
                    });

                    addAuditLog(`Purchase Request order created on server: [${data.orderCode}] for ${prodName}.`);

                    document.getElementById("purchase-order-id").innerText = data.orderCode;
                    const descEl = document.getElementById("purchase-success-desc");
                    if (descEl) {
                        if (paymentMethod === "paypal") {
                            descEl.innerText = currentLang === 'ar'
                                ? "شكرًا لتعاملك مع 3M Studio. تم تأكيد الدفع عبر PayPal وتنشيط طلبك بنجاح! تم إرسال رسالة تأكيد إلى بريدك الإلكتروني."
                                : "Thank you for choosing 3M Studio. Your payment via PayPal has been confirmed and your order activated successfully! A confirmation has been sent to your email.";
                        } else {
                            descEl.innerText = currentLang === 'ar'
                                ? "شكرًا لتعاملك مع 3M Studio. تم تسجيل الطلب بنجاح. سيقوم الدعم بمراجعة إثبات التحويل وتفعيل الطلب فور تأكيده. تم إرسال رسالة تأكيد لبريدك الإلكتروني."
                                : "Thank you for choosing 3M Studio. Your order has been placed successfully. Support will verify your transfer and activate the order once confirmed. A confirmation has been sent to your email.";
                        }
                    }

                    purchaseForm.style.display = "none";
                    purchaseSuccess.classList.add("active");
                }
            } catch (err) {
                console.error("Checkout failed:", err);
                alert(currentLang === 'ar' ? "فشل إرسال الطلب. يرجى التحقق من الاتصال والمحاولة لاحقاً." : "Failed to submit checkout request. Please try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        };

        if (purchaseSuccessCloseBtn) {
            purchaseSuccessCloseBtn.onclick = () => purchaseModal.classList.remove("active");
        }
    }

    const searchBar = document.getElementById("search-bar");
    const searchBtn = document.getElementById("search-btn");
    const searchDropdown = document.getElementById("search-results-dropdown");

    if (searchBtn && searchBar) {
        searchBtn.onclick = (e) => {
            e.stopPropagation();
            const container = searchBar.parentElement;
            container.classList.toggle("active");
            if (container.classList.contains("active")) {
                searchBar.focus();
            } else {
                searchDropdown.classList.remove("active");
            }
        };

        searchBar.oninput = () => {
            const val = searchBar.value.trim().toLowerCase();
            if (val === "3m studio admin") {
                searchBar.value = "";
                searchBar.parentElement.classList.remove("active");
                searchDropdown.classList.remove("active");
                
                const modal = document.getElementById("admin-login-modal");
                if (modal) modal.classList.add("active");
                const passwordInput = document.getElementById("admin-password");
                if (passwordInput) {
                    passwordInput.value = "";
                    passwordInput.focus();
                }
            } else if (val.length >= 2) {
                const langDatabase = draftState[currentLang] || draftState["ar"];
                const matches = langDatabase.services.filter(s => 
                    s.name.toLowerCase().includes(val) || 
                    s.desc.toLowerCase().includes(val)
                );
                
                if (matches.length > 0) {
                    searchDropdown.innerHTML = matches.map(m => `
                        <a href="#services" class="search-result-item" data-tab-link="${m.category}">
                            <strong>${m.name}</strong>
                            <span>${getFormattedPrice(m.priceBase)} - ${m.desc.substring(0, 50)}...</span>
                        </a>
                    `).join("");
                    searchDropdown.classList.add("active");

                    searchDropdown.querySelectorAll(".search-result-item").forEach(item => {
                        item.onclick = () => {
                            const tabCat = item.getAttribute("data-tab-link");
                            const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabCat}"]`);
                            if (tabBtn) tabBtn.click();
                            searchDropdown.classList.remove("active");
                            searchBar.parentElement.classList.remove("active");
                            searchBar.value = "";
                        };
                    });
                } else {
                    searchDropdown.innerHTML = `<div class="search-result-item">${currentLang === 'ar' ? 'لا يوجد نتائج مطابقة' : 'No matches found'}</div>`;
                    searchDropdown.classList.add("active");
                }
            } else {
                searchDropdown.classList.remove("active");
            }
        };
    }

    const modalLogin = document.getElementById("admin-login-modal");
    const closeLogin = document.getElementById("admin-login-close");
    const submitLogin = document.getElementById("admin-login-submit");
    const passwordLogin = document.getElementById("admin-password");
    const errorLogin = document.getElementById("admin-error-text");

    if (closeLogin) closeLogin.onclick = () => modalLogin.classList.remove("active");

    if (submitLogin && passwordLogin) {
        const verifyPassword = () => {
            const currentPass = localStorage.getItem("3m_admin_password") || "maloka";
            if (passwordLogin.value === currentPass) {
                errorLogin.style.display = "none";
                modalLogin.classList.remove("active");
                enableAdminMode(true);
                
                // Log successful admin login to Discord
                sendDiscordWebhookNotification("admin_action", "🔑 تسجيل دخول ناجح للأدمن (Admin Login)", [
                    { name: "العملية (Operation)", value: "تسجيل دخول إلى لوحة التحكم الأدمن", inline: true },
                    { name: "الحالة (Status)", value: "ناجح (Authorized)", inline: true }
                ]);
            } else {
                errorLogin.style.display = "block";
                passwordLogin.select();
                addAuditLog("Access Denied - incorrect password attempt.", true);
                
                // Log failed admin login attempt to Discord
                sendDiscordWebhookNotification("admin_action", "❌ محاولة دخول فاشلة للأدمن (Admin Login Failed)", [
                    { name: "العملية (Operation)", value: "محاولة تسجيل دخول لوحة التحكم للأدمن", inline: true },
                    { name: "الحالة (Status)", value: "فشل (Unauthorized - Wrong Password)", inline: true },
                    { name: "المحاولة (Attempted Value)", value: passwordLogin.value || "Empty", inline: true }
                ]);
            }
        };

        submitLogin.onclick = verifyPassword;
        passwordLogin.onkeydown = (e) => {
            if (e.key === "Enter") verifyPassword();
        };
    }

    const headerEl = document.getElementById("main-header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            headerEl.classList.add("scrolled");
        } else {
            headerEl.classList.remove("scrolled");
        }
    });

    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    if (hamburger && navMenu) {
        hamburger.onclick = () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        };
        navMenu.querySelectorAll(".nav-link").forEach(link => {
            link.onclick = () => {
                hamburger.classList.remove("active");
                navMenu.classList.remove("active");
            };
        });
    }

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            const pane = document.getElementById(tabId);
            if (pane) pane.classList.add("active");
        };
    });

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const filter = btn.getAttribute("data-filter");
            const items = document.querySelectorAll(".portfolio-item-wrapper");
            
            items.forEach(item => {
                if (filter === "all" || item.classList.contains(filter)) {
                    item.style.display = "block";
                } else {
                    item.style.display = "none";
                }
            });
        };
    });

    const tbUndo = document.getElementById("tb-undo");
    const tbRedo = document.getElementById("tb-redo");
    const tbText = document.getElementById("tb-toggle-text");
    const tbLayout = document.getElementById("tb-toggle-layout");
    const tbProducts = document.getElementById("tb-toggle-products");
    const tbLeads = document.getElementById("tb-toggle-leads");
    const tbLogs = document.getElementById("tb-toggle-logs");
    
    const tbDiscard = document.getElementById("tb-discard");
    const tbPublish = document.getElementById("tb-publish");
    const tbExit = document.getElementById("tb-exit");

    if (tbUndo) {
        tbUndo.onclick = () => {
            if (historyIndex > 0) {
                historyIndex--;
                draftState = JSON.parse(JSON.stringify(historyStack[historyIndex]));
                applyState(draftState);
                updateUndoRedoButtons();
                saveDraft();
                addAuditLog("Action undone.");
            }
        };
    }
    if (tbRedo) {
        tbRedo.onclick = () => {
            if (historyIndex < historyStack.length - 1) {
                historyIndex++;
                draftState = JSON.parse(JSON.stringify(historyStack[historyIndex]));
                applyState(draftState);
                updateUndoRedoButtons();
                saveDraft();
                addAuditLog("Action redone.");
            }
        };
    }

    if (tbText) {
        tbText.onclick = () => {
            document.body.classList.remove("admin-layout-mode");
            tbLayout.classList.remove("active-mode");
            tbText.classList.add("active-mode");
            addAuditLog("Visual editing mode selected.");
        };
    }

    if (tbLayout) {
        tbLayout.onclick = () => {
            const sidePanel = document.getElementById("admin-side-panel");
            if (sidePanel) {
                sidePanel.classList.add("active");
                renderSidePanelSectionsList();
            }
            tbText.classList.remove("active-mode");
            tbLayout.classList.add("active-mode");
            document.body.classList.add("admin-layout-mode");
            addAuditLog("Theme customizer panel toggled.");
        };
    }

    const sidePanelClose = document.getElementById("side-panel-close");
    if (sidePanelClose) {
        sidePanelClose.onclick = () => {
            document.getElementById("admin-side-panel").classList.remove("active");
            document.body.classList.remove("admin-layout-mode");
            tbLayout.classList.remove("active-mode");
            tbText.classList.add("active-mode");
        };
    }

    if (tbProducts) {
        tbProducts.onclick = () => {
            const modal = document.getElementById("admin-products-modal");
            if (modal) {
                modal.classList.add("active");
                renderServicesManagerTable();
                renderPortfolioManagerTable();
                renderFAQManagerTable();
                renderCouponsManagerTable();
                updateCouponStats();
                addAuditLog("Catalog manager modals opened.");
            }
        };
    }
    document.getElementById("admin-products-close").onclick = () => {
        document.getElementById("admin-products-modal").classList.remove("active");
    };

    if (tbLeads) {
        tbLeads.onclick = async () => {
            const modal = document.getElementById("admin-leads-modal");
            if (modal) {
                modal.classList.add("active");
                renderLeadsList();
                renderSMTPLogs();
                
                // Show loading message in orders list
                const container = document.getElementById("orders-list-container");
                if (container) {
                    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dark);">🔄 جاري تحميل الطلبات والمرفقات بالوقت الفعلي من ديسكورد...</div>`;
                }

                await fetchOrdersFromServer();
                renderOrdersList();
                addAuditLog("Inbound requests dashboard opened and synced with Discord.");
            }
        };
    }
    document.getElementById("admin-leads-close").onclick = () => {
        document.getElementById("admin-leads-modal").classList.remove("active");
    };

    if (tbLogs) {
        tbLogs.onclick = () => {
            const modal = document.getElementById("admin-logs-modal");
            if (modal) {
                modal.classList.add("active");
                
                const logConsole = document.getElementById("logs-console-container");
                if (logConsole) {
                    logConsole.innerHTML = auditLogs.map(l => `
                        <div class="log-line ${l.isError ? 'log-error' : ''}">
                            <span class="log-time">[${l.time}]</span>
                            <span class="log-msg">${l.msg}</span>
                        </div>
                    `).join("");
                    logConsole.scrollTop = logConsole.scrollHeight;
                }
                addAuditLog("Audit reports console accessed.");
            }
        };
    }
    document.getElementById("admin-logs-close").onclick = () => {
        document.getElementById("admin-logs-modal").classList.remove("active");
    };

    if (tbDiscard) {
        tbDiscard.onclick = () => {
            if (confirm("هل تود بالتأكيد التراجع عن كافة التغييرات الحالية واستعادة النسخة المنشورة؟")) {
                draftState = JSON.parse(JSON.stringify(liveState));
                localStorage.setItem("3m_studio_draft_state", JSON.stringify(draftState));
                
                historyStack = [JSON.parse(JSON.stringify(draftState))];
                historyIndex = 0;
                updateUndoRedoButtons();

                applyState(draftState);
                addAuditLog("Draft discarded. Reloaded last published state.");
                alert("تم تجاهل التعديلات بنجاح.");
            }
        };
    }

    if (tbPublish) {
        tbPublish.onclick = () => {
            // Check for password change
            const passInput = document.getElementById("admin-change-password");
            let passChanged = false;
            if (passInput && passInput.value.trim() !== "") {
                const oldPass = localStorage.getItem("3m_admin_password") || "maloka";
                const newPass = passInput.value.trim();
                if (newPass !== oldPass) {
                    localStorage.setItem("3m_admin_password", newPass);
                    passChanged = true;
                    passInput.value = "";
                }
            }

            liveState = JSON.parse(JSON.stringify(draftState));
            localStorage.setItem("3m_studio_live_state", JSON.stringify(liveState));
            addAuditLog("Site Published. Changes are now visible to everyone.");
            alert("تم نشر كافة التعديلات بنجاح وأصبحت مرئية الآن لزوار موقعك.");

            // Log password change
            if (passChanged) {
                sendDiscordWebhookNotification("admin_action", "🔒 تغيير كلمة مرور الأدمن (Admin Password Changed)", [
                    { name: "العملية (Operation)", value: "تغيير كلمة المرور الخاصة بلوحة تحكم المدير", inline: true },
                    { name: "الحالة (Status)", value: "تمت بنجاح وحفظها محلياً", inline: true }
                ]);
            }

            // Log publish action
            sendDiscordWebhookNotification("admin_action", "🚀 نشر تعديلات الموقع (Site Published)", [
                { name: "العملية (Operation)", value: "تم نشر التغييرات وحفظ التعديلات الجديدة للعامة", inline: true },
                { name: "اللون الرئيسي (Primary)", value: liveState.theme.primaryColor || "#00f2fe", inline: true },
                { name: "اللون الثانوي (Secondary)", value: liveState.theme.secondaryColor || "#7f00ff", inline: true },
                { name: "الخلفية (Background)", value: liveState.theme.bgDark || "#050508", inline: true }
            ]);
        };
    }

    if (tbExit) {
        tbExit.onclick = () => {
            if (confirm("هل ترغب بالخروج من لوحة التحكم؟")) {
                disableAdminMode();
            }
        };
    }

    const colorPrimary = document.getElementById("color-primary");
    const textPrimary = document.getElementById("color-primary-text");
    const colorSecondary = document.getElementById("color-secondary");
    const textSecondary = document.getElementById("color-secondary-text");
    const colorBg = document.getElementById("color-bg");
    const textBg = document.getElementById("color-bg-text");

    const updatePrimary = (hex) => {
        draftState.theme.primaryColor = hex;
        applyState(draftState);
        saveDraft();
    };
    const updateSecondary = (hex) => {
        draftState.theme.secondaryColor = hex;
        applyState(draftState);
        saveDraft();
    };
    const updateBg = (hex) => {
        draftState.theme.bgDark = hex;
        applyState(draftState);
        saveDraft();
    };

    if (colorPrimary) {
        colorPrimary.oninput = () => { textPrimary.value = colorPrimary.value; updatePrimary(colorPrimary.value); };
        textPrimary.onchange = () => { if (/^#[0-9A-F]{6}$/i.test(textPrimary.value)) { colorPrimary.value = textPrimary.value; updatePrimary(textPrimary.value); } };
        colorPrimary.onchange = () => pushToHistory(JSON.parse(JSON.stringify(draftState)), `Primary theme color changed to ${colorPrimary.value}`);
    }
    if (colorSecondary) {
        colorSecondary.oninput = () => { textSecondary.value = colorSecondary.value; updateSecondary(colorSecondary.value); };
        textSecondary.onchange = () => { if (/^#[0-9A-F]{6}$/i.test(textSecondary.value)) { colorSecondary.value = textSecondary.value; updateSecondary(textSecondary.value); } };
        colorSecondary.onchange = () => pushToHistory(JSON.parse(JSON.stringify(draftState)), `Secondary theme color changed to ${colorSecondary.value}`);
    }
    if (colorBg) {
        colorBg.oninput = () => { textBg.value = colorBg.value; updateBg(colorBg.value); };
        textBg.onchange = () => { if (/^#[0-9A-F]{6}$/i.test(textBg.value)) { colorBg.value = textBg.value; updateBg(textBg.value); } };
        colorBg.onchange = () => pushToHistory(JSON.parse(JSON.stringify(draftState)), `Theme background color changed to ${colorBg.value}`);
    }

    const adminWebhookInput = document.getElementById("admin-webhook-url");
    if (adminWebhookInput) {
        adminWebhookInput.onchange = () => {
            draftState.theme.discordWebhookUrl = adminWebhookInput.value.trim();
            saveDraft();
            pushToHistory(JSON.parse(JSON.stringify(draftState)), "Updated Discord Webhook URL config");
        };
    }

    const imgModal = document.getElementById("admin-image-modal");
    const imgClose = document.getElementById("admin-image-close");
    const imgSubmit = document.getElementById("admin-image-submit");
    const imgFile = document.getElementById("img-file-upload");
    const imgPreview = document.getElementById("img-upload-preview");
    const imgPreviewContainer = document.getElementById("img-upload-preview-container");
    const imgFileName = document.getElementById("img-upload-name");

    if (imgClose) imgClose.onclick = () => imgModal.classList.remove("active");

    if (imgFile) {
        imgFile.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imgPreview.src = event.target.result;
                    imgPreviewContainer.style.display = "flex";
                    imgFileName.innerText = file.name;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (imgSubmit) {
        imgSubmit.onclick = () => {
            const targetId = document.getElementById("img-target-id").value;
            const inputUrl = document.getElementById("img-source-url").value.trim();
            const localSrc = imgPreview.src;
            
            let finalSrc = (imgFile.files && imgFile.files.length > 0) ? localSrc : inputUrl;

            if (!finalSrc) {
                alert("يرجى اختيار ملف صورة أو تزويدنا برابط إلكتروني.");
                return;
            }

            if (targetId.includes(".")) {
                const [collection, itemId, field] = targetId.split(".");
                const item = draftState[collection].find(x => x.id === itemId);
                if (item) {
                    item[field] = finalSrc;
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Updated showcase image asset for [${itemId}]`);
                    applyState(draftState);
                    saveDraft();
                }
            }

            imgFile.value = "";
            document.getElementById("img-source-url").value = "";
            imgModal.classList.remove("active");
        };
    }

    const btnAddService = document.getElementById("btn-add-service");
    const serviceFormModal = document.getElementById("admin-service-edit-modal");
    const serviceFormClose = document.getElementById("admin-service-form-close");
    const serviceForm = document.getElementById("service-item-form");

    if (btnAddService) {
        btnAddService.onclick = () => {
            document.getElementById("service-modal-title").innerText = "إضافة خدمة جديدة للكتالوج";
            document.getElementById("service-form-id").value = "";
            serviceForm.reset();
            serviceFormModal.classList.add("active");
        };
    }
    if (serviceFormClose) serviceFormClose.onclick = () => serviceFormModal.classList.remove("active");

    if (serviceForm) {
        serviceForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById("service-form-id").value;
            const category = document.getElementById("service-form-category").value;
            const name = document.getElementById("service-form-name").value.trim();
            const priceVal = parseFloat(document.getElementById("service-form-price").value) || 0;
            const desc = document.getElementById("service-form-desc").value.trim();
            const features = document.getElementById("service-form-features").value.trim().split("\n").map(f => f.trim()).filter(Boolean);

            if (id) {
                const srvAr = draftState.ar.services.find(x => x.id === id);
                if (srvAr) {
                    srvAr.category = category;
                    srvAr.name = currentLang === 'ar' ? name : srvAr.name;
                    srvAr.priceBase = priceVal;
                    srvAr.desc = currentLang === 'ar' ? desc : srvAr.desc;
                    srvAr.features = currentLang === 'ar' ? features : srvAr.features;
                }
                const srvEn = draftState.en.services.find(x => x.id === id);
                if (srvEn) {
                    srvEn.category = category;
                    srvEn.name = currentLang === 'en' ? name : srvEn.name;
                    srvEn.priceBase = priceVal;
                    srvEn.desc = currentLang === 'en' ? desc : srvEn.desc;
                    srvEn.features = currentLang === 'en' ? features : srvEn.features;
                }
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Modified service item base properties [${id}]`);
            } else {
                const newId = `srv-custom-${Date.now()}`;
                const newSrvAr = { id: newId, category: category, name: name, priceBase: priceVal, desc: desc, features: features };
                const newSrvEn = { id: newId, category: category, name: name, priceBase: priceVal, desc: desc, features: features };
                
                draftState.ar.services.push(newSrvAr);
                draftState.en.services.push(newSrvEn);
                
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Added new service: "${name}"`);
            }

            applyState(draftState);
            renderServicesManagerTable();
            saveDraft();
            serviceFormModal.classList.remove("active");
        };
    }

    const btnAddPortfolio = document.getElementById("btn-add-portfolio");
    const portfolioFormModal = document.getElementById("admin-portfolio-edit-modal");
    const portfolioFormClose = document.getElementById("admin-portfolio-form-close");
    const portfolioForm = document.getElementById("portfolio-item-form");

    if (btnAddPortfolio) {
        btnAddPortfolio.onclick = () => {
            document.getElementById("portfolio-modal-title").innerText = "إضافة عمل معرض جديد";
            document.getElementById("portfolio-form-id").value = "";
            portfolioForm.reset();
            portfolioFormModal.classList.add("active");
        };
    }
    if (portfolioFormClose) portfolioFormClose.onclick = () => portfolioFormModal.classList.remove("active");

    if (portfolioForm) {
        portfolioForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById("portfolio-form-id").value;
            const category = document.getElementById("portfolio-form-category").value;
            const title = document.getElementById("portfolio-form-title").value.trim();
            const desc = document.getElementById("portfolio-form-desc").value.trim();
            const img = document.getElementById("portfolio-form-image").value.trim();
            const tag = document.getElementById("portfolio-form-tag").value.trim();

            if (id) {
                const port = draftState.portfolio.find(x => x.id === id);
                if (port) {
                    port.category = category;
                    port.img = img;
                    
                    if (currentLang === 'ar') {
                        port.title_ar = title;
                        port.desc_ar = desc;
                        port.tag_ar = tag;
                    } else {
                        port.title_en = title;
                        port.desc_en = desc;
                        port.tag_en = tag;
                    }
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Modified portfolio item details [${id}]`);
                }
            } else {
                const newId = `port-custom-${Date.now()}`;
                const newPort = {
                    id: newId,
                    category: category,
                    img: img,
                    title_ar: currentLang === 'ar' ? title : "مشروع جديد",
                    title_en: currentLang === 'en' ? title : "New Project",
                    desc_ar: currentLang === 'ar' ? desc : "تطوير مخصص...",
                    desc_en: currentLang === 'en' ? desc : "Custom details...",
                    tag_ar: currentLang === 'ar' ? tag : "تطوير",
                    tag_en: currentLang === 'en' ? tag : "Development"
                };
                draftState.portfolio.push(newPort);
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Added new portfolio work: "${title}"`);
            }

            applyState(draftState);
            renderPortfolioManagerTable();
            saveDraft();
            portfolioFormModal.classList.remove("active");
        };
    }

    const btnAddFaq = document.getElementById("btn-add-faq");
    const faqFormModal = document.getElementById("admin-faq-edit-modal");
    const faqFormClose = document.getElementById("admin-faq-form-close");
    const faqForm = document.getElementById("faq-item-form");

    if (btnAddFaq) {
        btnAddFaq.onclick = () => {
            document.getElementById("faq-modal-title").innerText = "إضافة سؤال فني جديد";
            document.getElementById("faq-form-id").value = "";
            faqForm.reset();
            faqFormModal.classList.add("active");
        };
    }
    if (faqFormClose) faqFormClose.onclick = () => faqFormModal.classList.remove("active");

    if (faqForm) {
        faqForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById("faq-form-id").value;
            const question = document.getElementById("faq-form-question").value.trim();
            const answer = document.getElementById("faq-form-answer").value.trim();

            if (id) {
                const faqAr = draftState.ar.faqs.find(x => x.id === id);
                if (faqAr && currentLang === 'ar') { faqAr.question = question; faqAr.answer = answer; }
                
                const faqEn = draftState.en.faqs.find(x => x.id === id);
                if (faqEn && currentLang === 'en') { faqEn.question = question; faqEn.answer = answer; }

                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Modified FAQ item details [${id}]`);
            } else {
                const newId = `faq-custom-${Date.now()}`;
                const newFaqAr = { id: newId, question: currentLang === 'ar' ? question : "سؤال جديد؟", answer: currentLang === 'ar' ? answer : "إجابة..." };
                const newFaqEn = { id: newId, question: currentLang === 'en' ? question : "New Question?", answer: currentLang === 'en' ? answer : "Answer details..." };
                
                draftState.ar.faqs.push(newFaqAr);
                draftState.en.faqs.push(newFaqEn);
                
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Added new FAQ question: "${question}"`);
            }

            applyState(draftState);
            renderFAQManagerTable();
            saveDraft();
            faqFormModal.classList.remove("active");
        };
    }

    // --- Coupon CRUD Event Listeners ---
    const btnAddCoupon = document.getElementById("btn-add-coupon");
    const couponFormModal = document.getElementById("admin-coupon-edit-modal");
    const couponFormClose = document.getElementById("admin-coupon-form-close");
    const couponForm = document.getElementById("coupon-item-form");

    if (btnAddCoupon) {
        btnAddCoupon.onclick = () => openCouponForm(null);
    }
    if (couponFormClose) couponFormClose.onclick = () => couponFormModal.classList.remove("active");

    if (couponForm) {
        couponForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById("coupon-form-id").value;
            const code = document.getElementById("coupon-form-code").value.trim().toUpperCase();
            const type = document.getElementById("coupon-form-type").value;
            const value = parseFloat(document.getElementById("coupon-form-value").value) || 0;
            const minPurchase = parseFloat(document.getElementById("coupon-form-min-purchase").value) || 0;
            const maxUses = parseInt(document.getElementById("coupon-form-max-uses").value) || 0;
            const maxPerUser = parseInt(document.getElementById("coupon-form-max-per-user").value) || 1;
            const startDate = document.getElementById("coupon-form-start-date").value;
            const expiryDate = document.getElementById("coupon-form-expiry-date").value;
            const desc_ar = document.getElementById("coupon-form-desc-ar").value.trim();
            const desc_en = document.getElementById("coupon-form-desc-en").value.trim();
            const active = document.getElementById("coupon-form-active").checked;
            const featured = document.getElementById("coupon-form-featured").checked;
            const public_ = document.getElementById("coupon-form-public").checked;
            const firstOrder = document.getElementById("coupon-form-first-order").checked;
            const vipOnly = document.getElementById("coupon-form-vip-only").checked;
            const referral = document.getElementById("coupon-form-referral").checked;
            const seasonalTag = document.getElementById("coupon-form-seasonal-tag").value.trim();

            if (!code || !value || !startDate || !expiryDate) {
                alert("يرجى ملء جميع الحقول المطلوبة");
                return;
            }

            if (id) {
                const idx = (adminMode ? draftState : liveState).coupons.findIndex(x => x.id === id);
                if (idx > -1) {
                    const src = adminMode ? draftState : liveState;
                    src.coupons[idx] = { ...src.coupons[idx], code, type, value, minPurchase, maxUses, maxPerUser, startDate, expiryDate, desc_ar, desc_en, active, featured, public: public_, firstOrder, vipOnly, referral, seasonalTag };
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Modified coupon [${code}]`);
                }
            } else {
                const newId = `coup-${Date.now()}`;
                const newCoupon = { id: newId, code, type, value, minPurchase, maxUses, maxPerUser, currentUses: 0, usedBy: [], startDate, expiryDate, desc_ar, desc_en, active, featured, public: public_, firstOrder, vipOnly, referral, seasonalTag };
                const src = adminMode ? draftState : liveState;
                src.coupons.push(newCoupon);
                if (adminMode) {
                    draftState.coupons.push(JSON.parse(JSON.stringify(newCoupon)));
                }
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Added new coupon: "${code}"`);
            }

            applyState(draftState);
            renderCouponsManagerTable();
            updateCouponStats();
            saveDraft();
            couponFormModal.classList.remove("active");
        };
    }

    // --- Checkout Coupon Apply Handler ---
    const btnApplyCoupon = document.getElementById("btn-apply-coupon");
    const checkoutCouponInput = document.getElementById("checkout-coupon-input");
    const couponMsg = document.getElementById("coupon-msg");
    const couponDiscountLine = document.getElementById("coupon-discount-line");
    const couponDiscountAmount = document.getElementById("coupon-discount-amount");
    const removeCouponBtn = document.getElementById("remove-coupon-btn");
    let appliedCoupon = null;

    if (btnApplyCoupon && checkoutCouponInput) {
        btnApplyCoupon.onclick = () => {
            const code = checkoutCouponInput.value.trim().toUpperCase();
            if (!code) return;

            const prodPriceEl = document.getElementById("purchase-product-price");
            const totalStr = prodPriceEl ? prodPriceEl.innerText : "0";
            const totalMatch = totalStr.match(/[\d.]+/);
            const total = totalMatch ? parseFloat(totalMatch[0]) : 0;

            const userId = (() => {
                try { return JSON.parse(localStorage.getItem("discord_user") || "{}").id || "anonymous"; } catch { return "anonymous"; }
            })();

            const result = validateCoupon(code, total, userId);
            if (result.valid) {
                appliedCoupon = result.coupon;
                const discountText = result.coupon.type === "percentage" ? `${result.coupon.value}%` : `${result.coupon.value} USD`;
                couponDiscountAmount.innerText = discountText;
                couponDiscountLine.style.display = "flex";
                couponMsg.innerHTML = `<span style="color:#2ecc71;">✓ ${result.message}</span>`;
                checkoutCouponInput.value = "";
                updateCheckoutPriceWithDiscount(total, result.coupon);
            } else {
                appliedCoupon = null;
                couponDiscountLine.style.display = "none";
                couponMsg.innerHTML = `<span style="color:#e74c3c;">✗ ${result.message}</span>`;
            }
        };
    }

    if (removeCouponBtn) {
        removeCouponBtn.onclick = () => {
            appliedCoupon = null;
            couponDiscountLine.style.display = "none";
            couponMsg.innerHTML = "";
            const prodPriceEl = document.getElementById("purchase-product-price");
            const srvId = document.getElementById("purchase-product-name").getAttribute("data-target-prod-id");
            if (srvId && prodPriceEl) {
                const srv = (adminMode ? draftState[currentLang] : liveState[currentLang]).services.find(x => x.id === srvId);
                if (srv) prodPriceEl.innerText = getFormattedPrice(srv.priceBase);
            }
        };
    }

    // Reset coupon on modal close (purchase modal)
    if (purchaseModal) {
        purchaseModal.addEventListener("click", (e) => {
            if (e.target === purchaseModal) {
                appliedCoupon = null;
                couponDiscountLine.style.display = "none";
                couponMsg.innerHTML = "";
                if (checkoutCouponInput) checkoutCouponInput.value = "";
            }
        });
    }

    // --- Coupon Search/Filter on Public Page ---
    const couponSearchInput = document.getElementById("coupons-search-input");
    if (couponSearchInput) {
        couponSearchInput.oninput = () => {
            renderCouponsPage(couponSearchInput.value.trim().toLowerCase());
        };
    }

    document.querySelectorAll(".m-tab-btn").forEach(btn => {
        btn.onclick = () => {
            const parent = btn.closest(".modal-body");
            parent.querySelectorAll(".m-tab-btn").forEach(b => b.classList.remove("active"));
            parent.querySelectorAll(".m-tab-pane").forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            const targetPane = btn.getAttribute("data-mtab");
            const paneEl = document.getElementById(targetPane);
            if (paneEl) paneEl.classList.add("active");
        };
    });

    const btnClearLeads = document.getElementById("btn-clear-leads");
    if (btnClearLeads) {
        btnClearLeads.onclick = () => {
            if (confirm("هل تود بالتأكيد مسح جميع الرسائل الواردة؟")) {
                leads = [];
                localStorage.setItem("3m_studio_leads", JSON.stringify(leads));
                updateMsgCountBadge();
                renderLeadsList();
                addAuditLog("Cleared all inbound contact messages.");
            }
        };
    }

    const btnClearOrders = document.getElementById("btn-clear-orders");
    if (btnClearOrders) {
        btnClearOrders.onclick = () => {
            if (confirm("هل تود بالتأكيد حذف كافة طلبات الشراء الواردة نهائيًا؟")) {
                orders = [];
                localStorage.setItem("3m_studio_orders", JSON.stringify(orders));
                renderOrdersList();
                addAuditLog("Cleared all store order logs.");
            }
        };
    }

    const orderSearch = document.getElementById("order-search-input");
    if (orderSearch) {
        orderSearch.oninput = () => {
            renderOrdersList(orderSearch.value);
        };
    }

    const btnExportCSV = document.getElementById("btn-export-orders-csv");
    if (btnExportCSV) {
        btnExportCSV.onclick = exportOrdersToCSV;
    }

    // Lightbox modal close listeners
    const proofClose = document.getElementById("proof-image-close");
    if (proofClose) {
        proofClose.onclick = () => {
            document.getElementById("proof-image-modal").classList.remove("active");
        };
    }
    const proofModal = document.getElementById("proof-image-modal");
    if (proofModal) {
        proofModal.onclick = (e) => {
            if (e.target === proofModal) {
                proofModal.classList.remove("active");
            }
        };
    }
}

// --- Dynamic Services Table ---
function renderServicesManagerTable() {
    const list = document.getElementById("services-manager-list");
    if (!list) return;
    list.innerHTML = "";

    const services = draftState[currentLang].services;

    services.forEach(srv => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${srv.name}</strong></td>
            <td><span class="table-badge">${srv.category}</span></td>
            <td><code>${srv.priceBase} USD</code></td>
            <td><span class="table-desc-preview" title="${srv.desc}">${srv.desc.substring(0, 45)}...</span></td>
            <td class="table-actions">
                <button class="table-btn table-btn-edit btn-edit-srv" data-srv-id="${srv.id}">Edit</button>
                <button class="table-btn table-btn-delete btn-del-srv" data-srv-id="${srv.id}">Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });

    list.querySelectorAll(".btn-edit-srv").forEach(btn => {
        btn.onclick = () => {
            const srvId = btn.getAttribute("data-srv-id");
            const srv = draftState[currentLang].services.find(x => x.id === srvId);
            if (srv) {
                document.getElementById("service-modal-title").innerText = "تعديل تفاصيل الخدمة";
                document.getElementById("service-form-id").value = srv.id;
                document.getElementById("service-form-name").value = srv.name;
                document.getElementById("service-form-category").value = srv.category;
                document.getElementById("service-form-price").value = srv.priceBase;
                document.getElementById("service-form-desc").value = srv.desc;
                document.getElementById("service-form-features").value = srv.features.join("\n");
                
                document.getElementById("admin-service-edit-modal").classList.add("active");
            }
        };
    });

    list.querySelectorAll(".btn-del-srv").forEach(btn => {
        btn.onclick = () => {
            const srvId = btn.getAttribute("data-srv-id");
            if (confirm("هل تود بالتأكيد حذف هذه الخدمة نهائيًا؟")) {
                const idxAr = draftState.ar.services.findIndex(x => x.id === srvId);
                if (idxAr > -1) draftState.ar.services.splice(idxAr, 1);
                
                const idxEn = draftState.en.services.findIndex(x => x.id === srvId);
                if (idxEn > -1) draftState.en.services.splice(idxEn, 1);

                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Deleted service offering catalog item [${srvId}]`);
                applyState(draftState);
                renderServicesManagerTable();
                saveDraft();
            }
        };
    });
}

// --- Dynamic Portfolio Table ---
function renderPortfolioManagerTable() {
    const list = document.getElementById("portfolio-manager-list");
    if (!list) return;
    list.innerHTML = "";

    draftState.portfolio.forEach(item => {
        const title = currentLang === 'ar' ? item.title_ar : item.title_en;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${title}</strong></td>
            <td><span class="table-badge">${item.category}</span></td>
            <td><code>${item.img.substring(0, 30)}...</code></td>
            <td class="table-actions">
                <button class="table-btn table-btn-edit btn-edit-port" data-port-id="${item.id}">Edit</button>
                <button class="table-btn table-btn-delete btn-del-port" data-port-id="${item.id}">Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });

    list.querySelectorAll(".btn-edit-port").forEach(btn => {
        btn.onclick = () => {
            const portId = btn.getAttribute("data-port-id");
            const port = draftState.portfolio.find(x => x.id === portId);
            if (port) {
                document.getElementById("portfolio-modal-title").innerText = "تعديل تفاصيل العمل الفني";
                document.getElementById("portfolio-form-id").value = port.id;
                document.getElementById("portfolio-form-title").value = currentLang === 'ar' ? port.title_ar : port.title_en;
                document.getElementById("portfolio-form-category").value = port.category;
                document.getElementById("portfolio-form-desc").value = currentLang === 'ar' ? port.desc_ar : port.desc_en;
                document.getElementById("portfolio-form-image").value = port.img;
                document.getElementById("portfolio-form-tag").value = currentLang === 'ar' ? port.tag_ar : port.tag_en;

                document.getElementById("admin-portfolio-edit-modal").classList.add("active");
            }
        };
    });

    list.querySelectorAll(".btn-del-port").forEach(btn => {
        btn.onclick = () => {
            const portId = btn.getAttribute("data-port-id");
            if (confirm("هل تود بالتأكيد حذف هذا العمل الفني؟")) {
                const idx = draftState.portfolio.findIndex(x => x.id === portId);
                if (idx > -1) {
                    const name = draftState.portfolio[idx].title_en;
                    draftState.portfolio.splice(idx, 1);
                    pushToHistory(JSON.parse(JSON.stringify(draftState)), `Deleted portfolio work showcase item: "${name}"`);
                    applyState(draftState);
                    renderPortfolioManagerTable();
                    saveDraft();
                }
            }
        };
    });
}

// --- Dynamic FAQ Table ---
function renderFAQManagerTable() {
    const list = document.getElementById("faqs-manager-list");
    if (!list) return;
    list.innerHTML = "";

    draftState[currentLang].faqs.forEach(faq => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${faq.question}</strong></td>
            <td><span>${faq.answer.substring(0, 50)}...</span></td>
            <td class="table-actions">
                <button class="table-btn table-btn-edit btn-edit-faq" data-faq-id="${faq.id}">Edit</button>
                <button class="table-btn table-btn-delete btn-del-faq" data-faq-id="${faq.id}">Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });

    list.querySelectorAll(".btn-edit-faq").forEach(btn => {
        btn.onclick = () => {
            const faqId = btn.getAttribute("data-faq-id");
            const faq = draftState[currentLang].faqs.find(x => x.id === faqId);
            if (faq) {
                document.getElementById("faq-modal-title").innerText = "تعديل السؤال والجواب";
                document.getElementById("faq-form-id").value = faq.id;
                document.getElementById("faq-form-question").value = faq.question;
                document.getElementById("faq-form-answer").value = faq.answer;

                document.getElementById("admin-faq-edit-modal").classList.add("active");
            }
        };
    });

    list.querySelectorAll(".btn-del-faq").forEach(btn => {
        btn.onclick = () => {
            const faqId = btn.getAttribute("data-faq-id");
            if (confirm("هل تود بالتأكيد حذف هذا السؤال؟")) {
                const idxAr = draftState.ar.faqs.findIndex(x => x.id === faqId);
                if (idxAr > -1) draftState.ar.faqs.splice(idxAr, 1);
                
                const idxEn = draftState.en.faqs.findIndex(x => x.id === faqId);
                if (idxEn > -1) draftState.en.faqs.splice(idxEn, 1);

                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Deleted FAQ accordion item [${faqId}]`);
                applyState(draftState);
                renderFAQManagerTable();
                saveDraft();
            }
        };
    });
}

// --- Render Inbound Customer Leads List ---
function renderLeadsList() {
    const container = document.getElementById("leads-list-container");
    if (!container) return;

    if (leads.length === 0) {
        container.innerHTML = `<div class="no-leads">${currentLang === 'ar' ? 'لا يوجد رسائل واردة حاليًا.' : 'No incoming messages currently.'}</div>`;
        return;
    }

    container.innerHTML = leads.map(l => `
        <div class="lead-card" data-lead-id="${l.id}">
            <div class="lead-card-header">
                <div class="lead-name">
                    <h5>${l.name}</h5>
                    <span class="lead-email">${l.email} | ديسكورد: ${l.discord} | التاريخ: ${l.timestamp}</span>
                </div>
                <div class="lead-card-actions">
                    <span class="lead-tag">${l.service}</span>
                    <button class="table-btn table-btn-delete btn-del-lead" data-lead-id="${l.id}" style="padding:4px 8px;">${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>
                </div>
            </div>
            <p class="lead-message">"${l.message}"</p>
        </div>
    `).join("");

    container.querySelectorAll(".btn-del-lead").forEach(btn => {
        btn.onclick = () => {
            const leadId = btn.getAttribute("data-lead-id");
            if (confirm(currentLang === 'ar' ? "هل أنت متأكد من رغبتك بحذف هذه الرسالة؟" : "Are you sure you want to delete this message?")) {
                const idx = leads.findIndex(x => x.id === leadId);
                if (idx > -1) {
                    leads.splice(idx, 1);
                    localStorage.setItem("3m_studio_leads", JSON.stringify(leads));
                    renderLeadsList();
                    updateMsgCountBadge();
                    addAuditLog(`Deleted contact lead [${leadId}]`);
                }
            }
        };
    });
}

// --- Update Message Count Badge & Stats Orb Counters ---
function updateMsgCountBadge() {
    const badge = document.getElementById("tb-msg-count");
    if (badge) {
        badge.innerText = leads.length + orders.length;
    }
    const leadCountEl = document.getElementById("lead-stat-count");
    if (leadCountEl) {
        leadCountEl.innerText = leads.length;
    }
    const orderCountEl = document.getElementById("lead-stat-orders");
    if (orderCountEl) {
        orderCountEl.innerText = orders.length;
    }
}

// --- Preloader & Initialization Sequence ---
function runPreloader() {
    const preloader = document.getElementById("preloader");
    const loaderBar = document.getElementById("loader-bar");
    const loaderPct = document.getElementById("loader-percentage");
    
    if (!preloader) {
        initStates();
        wireEvents();
        return;
    }
    
    let percentage = 0;
    const interval = setInterval(() => {
        percentage += Math.floor(Math.random() * 8) + 2;
        if (percentage >= 100) {
            percentage = 100;
            clearInterval(interval);
            
            // Trigger initialization
            initStates();
            wireEvents();
            setupCustomCursor();
            setupLiveChatBot();
            setupBackToTop();
            
            // Fade out preloader
            preloader.classList.add("fade-out");
            setTimeout(() => {
                preloader.style.display = "none";
            }, 600);
        }
        
        if (loaderBar) loaderBar.style.width = `${percentage}%`;
        if (loaderPct) loaderPct.innerText = `${percentage}%`;
    }, 40);
}

// --- Custom Cursor & Gaming Particle Trail ---
function setupCustomCursor() {
    const cursor = document.getElementById("custom-cursor");
    const dot = document.getElementById("custom-cursor-dot");
    const sparkContainer = document.getElementById("spark-container");
    
    if (!cursor || !dot) return;
    
    document.addEventListener("mousemove", (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        
        if (Math.random() < 0.25) {
            createSpark(e.clientX, e.clientY);
        }
    });
    
    const hoverables = "a, button, .service-card, .portfolio-item, .faq-header, select, input, textarea, [contenteditable='true']";
    
    document.addEventListener("mouseover", (e) => {
        if (e.target.closest(hoverables)) {
            cursor.classList.add("cursor-hover");
            dot.style.transform = "translate(-50%, -50%) scale(1.5)";
        }
    });
    
    document.addEventListener("mouseout", (e) => {
        if (e.target.closest(hoverables)) {
            cursor.classList.remove("cursor-hover");
            dot.style.transform = "translate(-50%, -50%) scale(1)";
        }
    });
    
    function createSpark(x, y) {
        if (!sparkContainer) return;
        const spark = document.createElement("div");
        spark.className = "cursor-spark";
        
        const size = Math.random() * 6 + 4;
        const color = Math.random() > 0.5 ? "var(--primary-color)" : "var(--secondary-color)";
        
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        spark.style.backgroundColor = color;
        spark.style.boxShadow = `0 0 8px ${color}`;
        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        
        sparkContainer.appendChild(spark);
        
        setTimeout(() => {
            spark.remove();
        }, 600);
    }
}

// --- Live Support Chat Widget Widget Engine ---
let chatPollInterval = null;
function setupLiveChatBot() {
    const trigger = document.getElementById("chat-trigger");
    const windowEl = document.getElementById("chat-window");
    const closeBtn = document.getElementById("chat-close");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");
    const chatMessages = document.getElementById("chat-messages");
    const chatBadge = document.getElementById("chat-badge");
    const humanBtn = document.getElementById("chat-human-btn");
    const statusEl = document.getElementById("chat-status");
    
    if (!trigger || !windowEl || !closeBtn || !chatInput || !chatSend || !chatMessages || !humanBtn || !statusEl) return;

    let chatUsername = "Guest";
    const discordUserStr = localStorage.getItem("discord_user");
    if (discordUserStr) {
        try {
            const userObj = JSON.parse(discordUserStr);
            chatUsername = userObj.global_name || userObj.username || "User";
        } catch (e) {
            console.error("Error parsing discord user:", e);
        }
    } else {
        let guestId = localStorage.getItem("support_guest_id");
        if (!guestId) {
            guestId = Math.floor(1000 + Math.random() * 9000);
            localStorage.setItem("support_guest_id", guestId);
        }
        chatUsername = `Guest-${guestId}`;
    }

    const renderedMessageIds = new Set();
    let threadId = localStorage.getItem("support_chat_thread_id");
    let currentMode = localStorage.getItem("support_chat_mode") || "ai"; // "ai" or "human"
    
    // If they have an active thread, force human mode to resume
    if (threadId) {
        currentMode = "human";
    }

    // In-memory AI chat history
    let aiChatHistory = [];
    const storedAiHistory = localStorage.getItem("support_ai_history");
    if (storedAiHistory) {
        try {
            aiChatHistory = JSON.parse(storedAiHistory);
        } catch (e) {
            aiChatHistory = [];
        }
    }

    let isHistoryLoaded = false;

    // Toggle Chat Widget Open/Close
    trigger.onclick = () => {
        windowEl.classList.toggle("active");
        if (windowEl.classList.contains("active")) {
            if (chatBadge) chatBadge.style.display = "none";
            chatInput.focus();
            
            initChatMode();
        } else {
            stopPolling();
        }
    };
    
    closeBtn.onclick = () => {
        windowEl.classList.remove("active");
        stopPolling();
    };

    // Toggle human/AI mode
    humanBtn.onclick = () => {
        if (currentMode === "ai") {
            switchToHumanMode();
        } else {
            switchToAIMode();
        }
    };

    function initChatMode() {
        if (currentMode === "human") {
            switchToHumanMode();
        } else {
            switchToAIMode();
        }
    }

    function switchToAIMode() {
        currentMode = "ai";
        localStorage.setItem("support_chat_mode", "ai");
        stopPolling();
        
        // Update Header UI
        statusEl.innerText = currentLang === "ar" ? "مساعد ذكي نشط" : "AI Assistant Active";
        statusEl.style.color = "var(--primary-color)";
        humanBtn.innerHTML = `<span style="color:#e74c3c;">●</span> ${currentLang === "ar" ? "دعم بشري" : "Human"}`;
        humanBtn.title = currentLang === "ar" ? "تحدث مع الدعم البشري" : "Talk to Human";
        
        renderAIChat();
    }

    let socket = null;
    let pendingAttachment = null;

    // Attach File Input Listener
    const chatFileInput = document.getElementById("chat-file-input");
    const chatPreviewContainer = document.getElementById("chat-upload-preview-container");
    const chatPreviewImg = document.getElementById("chat-upload-preview");
    const chatPreviewFilename = document.getElementById("chat-upload-filename");
    const chatPreviewCancel = document.getElementById("chat-upload-cancel");

    if (chatFileInput) {
        chatFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith("image/")) {
                showToast(currentLang === "ar" ? "يرجى إرفاق صور فقط" : "Please upload images only", "warning");
                chatFileInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                pendingAttachment = {
                    name: file.name,
                    data: event.target.result
                };
                if (chatPreviewImg) chatPreviewImg.src = event.target.result;
                if (chatPreviewFilename) chatPreviewFilename.innerText = file.name;
                if (chatPreviewContainer) chatPreviewContainer.style.display = "flex";
            };
            reader.readAsDataURL(file);
        };
    }

    if (chatPreviewCancel) {
        chatPreviewCancel.onclick = () => {
            pendingAttachment = null;
            if (chatFileInput) chatFileInput.value = "";
            if (chatPreviewContainer) chatPreviewContainer.style.display = "none";
        };
    }

    function initSocketConnection() {
        if (socket) return;
        
        const socketUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? "http://localhost:3000"
            : window.location.origin;
            
        socket = io(socketUrl);
        
        socket.on('connect', () => {
            console.log("Connected to live support bridge socket");
            if (threadId) {
                socket.emit('join', { ticketId: threadId, username: chatUsername, userId: null });
            }
        });
        
        socket.on('history', (history) => {
            chatMessages.innerHTML = "";
            appendHumanInfoTip();
            if (history && history.length > 0) {
                history.forEach(msg => {
                    renderedMessageIds.add(msg.id || `${msg.timestamp}-${msg.content}`);
                    if (msg.is_staff) {
                        appendMessageHTML(msg.content, "bot", msg.author, msg.avatar || null, msg.timestamp, msg.attachments);
                    } else {
                        appendMessageHTML(msg.content, "user", null, null, msg.timestamp, msg.attachments);
                    }
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            isHistoryLoaded = true;
        });
        
        socket.on('message', (msg) => {
            const msgKey = msg.id || `${msg.timestamp}-${msg.content}`;
            if (!renderedMessageIds.has(msgKey)) {
                renderedMessageIds.add(msgKey);
                if (msg.is_staff) {
                    appendMessageHTML(msg.content, "bot", msg.author, msg.avatar || null, msg.timestamp, msg.attachments);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    if (!windowEl.classList.contains("active") && chatBadge) {
                        chatBadge.style.display = "block";
                    }
                }
            }
        });
    }

    function switchToHumanMode() {
        currentMode = "human";
        localStorage.setItem("support_chat_mode", "human");
        
        // Update Header UI
        statusEl.innerText = currentLang === "ar" ? "دعم بشري نشط" : "Human Support Active";
        statusEl.style.color = "#2ecc71";
        humanBtn.innerHTML = `<span style="color:#3498db;">●</span> ${currentLang === "ar" ? "مساعد ذكي" : "AI Assistant"}`;
        humanBtn.title = currentLang === "ar" ? "العودة للمساعد الذكي" : "Switch to AI";
        
        initSocketConnection();
        
        if (threadId) {
            socket.emit('join', { ticketId: threadId, username: chatUsername, userId: null });
        } else {
            renderEmptyHumanChat();
        }
    }

    function startPolling() {}
    function stopPolling() {}

    // --- AI MODE LOGIC ---
    function renderAIChat() {
        chatMessages.innerHTML = "";
        appendGreetingMessage();
        
        aiChatHistory.forEach(msg => {
            appendMessageHTML(msg.text, msg.sender, msg.sender === "bot" ? "3M AI" : null, null, msg.timestamp);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendAIChatMessage(text) {
        appendMessageHTML(text, "user");
        const timestamp = new Date().toISOString();
        aiChatHistory.push({ sender: "user", text, timestamp });
        localStorage.setItem("support_ai_history", JSON.stringify(aiChatHistory));
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        const typingId = appendTypingIndicator();
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            const response = await fetch("/api/ai-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    history: aiChatHistory
                })
            });
            
            removeTypingIndicator(typingId);
            
            if (response.ok) {
                const data = await response.json();
                appendMessageHTML(data.reply, "bot", "3M AI", null);
                aiChatHistory.push({ sender: "bot", text: data.reply, timestamp: new Date().toISOString() });
                localStorage.setItem("support_ai_history", JSON.stringify(aiChatHistory));
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                appendMessageHTML(
                    currentLang === "ar" 
                        ? "عذرًا، حدث خطأ أثناء الاتصال بالمساعد الذكي. يمكنك المحاولة مجددًا أو التبديل للدعم البشري." 
                        : "Sorry, an error occurred with the AI assistant. Try again or switch to human support.",
                    "bot",
                    "System"
                );
            }
        } catch (err) {
            console.error("AI Chat Error:", err);
            removeTypingIndicator(typingId);
            appendMessageHTML("Connection error.", "bot", "System");
        }
    }

    // --- HUMAN MODE LOGIC ---
    function renderEmptyHumanChat() {
        chatMessages.innerHTML = "";
        
        const msg = document.createElement("div");
        msg.className = "system-message-chat";
        msg.style.cssText = "color:var(--text-muted); font-size:0.75rem; text-align:center; padding:15px; border:1px solid rgba(255,255,255,0.03); border-radius:8px; background:rgba(255,255,255,0.01); margin:10px;";
        msg.innerHTML = currentLang === "ar"
            ? "🔄 <strong>وضع الدعم البشري</strong><br>اكتب رسالتك بالأسفل لإنشاء تذكرة دعم مباشر في سيرفر الديسكورد وتوصيلك بمشرفي الاستوديو فوراً."
            : "🔄 <strong>Human Support Mode</strong><br>Type your message below to open a live ticket in our Discord server and connect with our staff.";
        
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function loadChatHistory() {}
    async function pollNewMessages() {}

    function sendHumanChatMessage(text) {
        const loggedUser = JSON.parse(localStorage.getItem("discord_user"));
        const clientUserId = loggedUser ? loggedUser.id : null;

        if (!threadId) {
            threadId = `TCK-${Math.floor(10000 + Math.random() * 90000)}`;
            localStorage.setItem("support_chat_thread_id", threadId);
            
            chatMessages.innerHTML = "";
            appendHumanInfoTip();
            initSocketConnection();
            socket.emit('join', { ticketId: threadId, username: chatUsername, userId: clientUserId });
        }
        
        const localAttachments = pendingAttachment ? [pendingAttachment] : [];
        appendMessageHTML(text, "user", null, null, new Date().toISOString(), localAttachments);
        chatInput.value = "";
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        socket.emit('message', {
            ticketId: threadId,
            username: chatUsername,
            userId: clientUserId,
            message: text,
            attachment: pendingAttachment
        });

        pendingAttachment = null;
        if (chatFileInput) chatFileInput.value = "";
        if (chatPreviewContainer) chatPreviewContainer.style.display = "none";
    }

    // --- GENERAL LOGIC ---
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = "";
        
        if (currentMode === "ai") {
            sendAIChatMessage(text);
        } else {
            sendHumanChatMessage(text);
        }
    };
    
    chatSend.onclick = sendMessage;
    chatInput.onkeydown = (e) => {
        if (e.key === "Enter") sendMessage();
    };
    
    function appendGreetingMessage() {
        const text = currentLang === "ar" 
            ? "أهلاً بك! 👋 أنا مساعد 3M الذكي. كيف يمكنني مساعدتك اليوم؟" 
            : "Welcome! 👋 I am 3M AI Assistant. How can I help you today?";
        appendMessageHTML(text, "bot", "3M AI", null, new Date().toISOString());
    }

    function appendHumanInfoTip() {
        const tip = document.createElement("div");
        tip.className = "system-message-chat";
        tip.style.cssText = "color:#2ecc71; font-size:0.7rem; text-align:center; padding:10px; border-bottom:1px solid rgba(255,255,255,0.03); margin-bottom:12px;";
        tip.innerHTML = currentLang === "ar"
            ? "🟢 متصل بالدعم الفني البشري عبر ديسكورد"
            : "🟢 Connected to Human Support on Discord";
        chatMessages.appendChild(tip);
    }

    function appendTypingIndicator() {
        const indicator = document.createElement("div");
        const typingId = "typing-" + Math.random().toString(36).substring(2, 9);
        indicator.id = typingId;
        indicator.className = "message bot typing-indicator-msg";
        
        indicator.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <div style="width:20px; height:20px; border-radius:50%; background:var(--primary-color); display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:bold; color:white;">AI</div>
                <span style="font-size:0.75rem; color:var(--primary-color); font-weight:bold;">3M AI</span>
            </div>
            <div class="message-content" style="display:flex; align-items:center; gap:4px; padding: 8px 12px;">
                <span class="dot-typing" style="width:6px; height:6px; background:#fff; border-radius:50%; display:inline-block; animation: typing-dot 1.2s infinite ease-in-out;"></span>
                <span class="dot-typing" style="width:6px; height:6px; background:#fff; border-radius:50%; display:inline-block; animation: typing-dot 1.2s infinite ease-in-out; animation-delay: 0.2s;"></span>
                <span class="dot-typing" style="width:6px; height:6px; background:#fff; border-radius:50%; display:inline-block; animation: typing-dot 1.2s infinite ease-in-out; animation-delay: 0.4s;"></span>
            </div>
        `;
        chatMessages.appendChild(indicator);
        return typingId;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function appendMessageHTML(text, sender, authorName = null, avatarUrl = null, timestampStr = null, attachments = []) {
        const msg = document.createElement("div");
        msg.className = `message ${sender}`;
        
        const now = timestampStr ? new Date(timestampStr) : new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let headerHTML = "";
        if (sender === "bot" && authorName) {
            headerHTML = `
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    ${avatarUrl ? `<img src="${avatarUrl}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">` : `<div style="width:20px; height:20px; border-radius:50%; background:var(--primary-color); display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:bold; color:white;">AI</div>`}
                    <span style="font-size:0.75rem; color:var(--primary-color); font-weight:bold;">${escapeHTML(authorName)}</span>
                </div>
            `;
        }
        
        let attachmentsHTML = "";
        if (attachments && attachments.length > 0) {
            attachments.forEach(att => {
                const src = att.url || att.data;
                if (src) {
                    attachmentsHTML += `
                        <div style="margin-top:6px;">
                            <img src="${src}" style="max-width:100%; max-height:180px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); display:block; cursor:pointer;" onclick="window.open('${src}')">
                        </div>
                    `;
                }
            });
        }
        
        msg.innerHTML = `
            ${headerHTML}
            <div class="message-content">
                ${escapeHTML(text)}
                ${attachmentsHTML}
            </div>
            <div class="message-time">${timeStr}</div>
        `;
        
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Load initial view
    if (chatMessages.children.length === 0 || chatMessages.children.length === 1) {
        initChatMode();
    }
}

// --- Back to Top Smooth Scroll ---
function setupBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    
    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            btn.classList.add("visible");
        } else {
            btn.classList.remove("visible");
        }
    });
    
    btn.onclick = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };
}

// ==========================================================================
// COUPON SYSTEM
// ==========================================================================

function getCoupons() {
    return (adminMode ? draftState : liveState).coupons || [];
}

function validateCoupon(code, total, userId) {
    const coupons = getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return { valid: false, discount: 0, message: "كود الخصم غير صالح" };

    if (!coupon.active) return { valid: false, discount: 0, message: "كود الخصم غير نشط" };

    const now = new Date();
    const start = new Date(coupon.startDate);
    const expiry = new Date(coupon.expiryDate);
    if (now < start) return { valid: false, discount: 0, message: "كود الخصم لم يبدأ بعد" };
    if (now > expiry) return { valid: false, discount: 0, message: "كود الخصم منتهي الصلاحية" };

    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
        return { valid: false, discount: 0, message: "تم استنفاذ عدد استخدامات هذا الكود" };
    }

    if (coupon.usedBy && coupon.usedBy.includes(userId)) {
        if (coupon.maxPerUser > 0) {
            const userCount = coupon.usedBy.filter(id => id === userId).length;
            if (userCount >= coupon.maxPerUser) return { valid: false, discount: 0, message: "لقد استخدمت هذا الكود من قبل" };
        }
    }

    if (total < coupon.minPurchase) {
        return { valid: false, discount: 0, message: `الحد الأدنى للشراء هو ${coupon.minPurchase}` };
    }

    let discount = 0;
    if (coupon.type === "percentage") {
        discount = (total * coupon.value) / 100;
    } else {
        discount = Math.min(coupon.value, total);
    }

    return { valid: true, discount, message: `تم تطبيق الخصم بنجاح!`, coupon };
}

function updateCheckoutPriceWithDiscount(originalTotal, coupon) {
    const prodPriceEl = document.getElementById("purchase-product-price");
    if (!prodPriceEl) return;
    let discount = 0;
    if (coupon.type === "percentage") {
        discount = (originalTotal * coupon.value) / 100;
    } else {
        discount = Math.min(coupon.value, originalTotal);
    }
    const newTotal = originalTotal - discount;
    const formattedDisc = getFormattedPrice(discount);
    const formattedTotal = getFormattedPrice(newTotal);
    prodPriceEl.innerText = `${formattedTotal} (خصم: ${formattedDisc})`;
}

function renderFeaturedCoupons() {
    const section = document.getElementById("featured-coupons");
    const grid = document.getElementById("featured-coupons-grid");
    if (!section || !grid) return;
    const coupons = getCoupons().filter(c => c.active && c.featured && c.public);
    if (coupons.length === 0) { section.style.display = "none"; return; }
    section.style.display = "block";
    grid.innerHTML = "";
    coupons.slice(0, 3).forEach(c => {
        const now = new Date();
        const expiry = new Date(c.expiryDate);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        const typeLabel = c.type === "percentage" ? `${c.value}%` : `${c.value}`;
        const desc = currentLang === "ar" ? c.desc_ar : c.desc_en;
        const card = document.createElement("div");
        card.className = "featured-coupon-card";
        card.innerHTML = `
            <div class="featured-coupon-badge">${typeLabel} ${c.type === "percentage" ? "خصم" : "OFF"}</div>
            <div class="featured-coupon-content">
                <div class="featured-coupon-code">${c.code}</div>
                <p class="featured-coupon-desc">${desc}</p>
                <div class="featured-coupon-footer">
                    <span class="featured-coupon-expiry">${daysLeft > 0 ? `${daysLeft} يوم متبقي` : "ينتهي اليوم"}</span>
                    <button class="copy-coupon-btn" data-code="${c.code}">نسخ الكود</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    grid.querySelectorAll(".copy-coupon-btn").forEach(btn => {
        btn.onclick = () => {
            navigator.clipboard.writeText(btn.getAttribute("data-code")).then(() => {
                btn.innerText = currentLang === "ar" ? "تم النسخ ✓" : "Copied ✓";
                setTimeout(() => { btn.innerText = currentLang === "ar" ? "نسخ الكود" : "Copy"; }, 2000);
            });
        };
    });
}

function renderCouponsPage(filter = "") {
    const section = document.getElementById("coupons-page");
    const grid = document.getElementById("coupons-grid");
    const noMsg = document.getElementById("no-coupons-msg");
    if (!grid) return;
    const coupons = getCoupons().filter(c => c.active && c.public);
    const filtered = filter ? coupons.filter(c => c.code.toLowerCase().includes(filter) || (currentLang === "ar" ? c.desc_ar : c.desc_en).toLowerCase().includes(filter)) : coupons;
    if (filtered.length === 0) {
        grid.innerHTML = "";
        if (noMsg) noMsg.style.display = "block";
        return;
    }
    if (noMsg) noMsg.style.display = "none";
    grid.innerHTML = "";
    filtered.forEach(c => {
        const now = new Date();
        const expiry = new Date(c.expiryDate);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        const typeLabel = c.type === "percentage" ? `${c.value}%` : `${c.value}`;
        const desc = currentLang === "ar" ? c.desc_ar : c.desc_en;
        const isExpired = now > expiry;
        const tags = [];
        if (c.firstOrder) tags.push("أول طلب");
        if (c.vipOnly) tags.push("VIP");
        if (c.referral) tags.push("إحالة");
        if (c.seasonalTag) tags.push(c.seasonalTag);
        if (c.featured) tags.push("مميز");
        const card = document.createElement("div");
        card.className = `coupon-card ${isExpired ? 'expired' : ''}`;
        card.innerHTML = `
            <div class="coupon-card-header">
                <div class="coupon-type-badge ${c.type}">${typeLabel}</div>
                ${c.featured ? '<span class="coupon-featured-badge">⭐ مميز</span>' : ''}
            </div>
            <div class="coupon-card-body">
                <div class="coupon-card-code">${c.code}</div>
                <p class="coupon-card-desc">${desc}</p>
                ${tags.length > 0 ? `<div class="coupon-card-tags">${tags.map(t => `<span class="coupon-tag">${t}</span>`).join('')}</div>` : ''}
                <div class="coupon-card-footer">
                    <span class="coupon-expiry ${isExpired ? 'expired' : ''}">${isExpired ? 'منتهي' : `${daysLeft} يوم متبقي`}</span>
                    <button class="coupon-card-btn" data-code="${c.code}">${isExpired ? 'منتهي' : 'نسخ الكود'}</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    grid.querySelectorAll(".coupon-card-btn").forEach(btn => {
        btn.onclick = () => {
            const code = btn.getAttribute("data-code");
            if (btn.innerText.includes("منتهي")) return;
            navigator.clipboard.writeText(code).then(() => {
                btn.innerText = currentLang === "ar" ? "تم النسخ ✓" : "Copied ✓";
                setTimeout(() => { btn.innerText = currentLang === "ar" ? "نسخ الكود" : "Copy"; }, 2000);
                showToast(`تم نسخ الكود ${code}`, "success");
            });
        };
    });
}

function renderCouponsManagerTable() {
    const list = document.getElementById("coupons-manager-list");
    if (!list) return;
    list.innerHTML = "";
    const coupons = getCoupons();
    coupons.forEach(c => {
        const now = new Date();
        const expiry = new Date(c.expiryDate);
        const isExpired = now > expiry;
        const usageText = c.maxUses > 0 ? `${c.currentUses}/${c.maxUses}` : `${c.currentUses}/∞`;
        const typeLabel = c.type === "percentage" ? `${c.value}%` : `${c.value}`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong style="font-family:monospace; letter-spacing:1px;">${c.code}</strong></td>
            <td><span class="coupon-value-badge ${c.type}">${typeLabel}</span></td>
            <td><span class="table-badge">${c.type === "percentage" ? "نسبة" : "ثابت"}</span></td>
            <td>${usageText}</td>
            <td style="font-size:0.75rem;">${isExpired ? `<span style="color:#e74c3c;">منتهي</span>` : `${c.expiryDate}`}</td>
            <td><span class="coupon-status-badge ${c.active ? 'active' : 'inactive'}">${c.active ? 'نشط' : 'غير نشط'}</span></td>
            <td class="table-actions">
                <button class="table-btn table-btn-edit btn-edit-coup" data-coup-id="${c.id}">Edit</button>
                <button class="table-btn table-btn-delete btn-del-coup" data-coup-id="${c.id}">Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });
    list.querySelectorAll(".btn-edit-coup").forEach(btn => {
        btn.onclick = () => {
            const coupId = btn.getAttribute("data-coup-id");
            const coupon = getCoupons().find(x => x.id === coupId);
            if (coupon) openCouponForm(coupon);
        };
    });
    list.querySelectorAll(".btn-del-coup").forEach(btn => {
        btn.onclick = () => {
            const coupId = btn.getAttribute("data-coup-id");
            if (confirm("هل تود بالتأكيد حذف كود الخصم هذا؟")) {
                const idx = draftState.coupons.findIndex(x => x.id === coupId);
                if (idx > -1) draftState.coupons.splice(idx, 1);
                if (liveState.coupons) {
                    const idx2 = liveState.coupons.findIndex(x => x.id === coupId);
                    if (idx2 > -1) liveState.coupons.splice(idx2, 1);
                }
                pushToHistory(JSON.parse(JSON.stringify(draftState)), `Deleted coupon [${coupId}]`);
                applyState(draftState);
                renderCouponsManagerTable();
                updateCouponStats();
                saveDraft();
            }
        };
    });
}

function openCouponForm(coupon) {
    const modal = document.getElementById("admin-coupon-edit-modal");
    const title = document.getElementById("coupon-modal-title");
    if (!modal || !title) return;
    if (coupon) {
        title.innerText = "تعديل كود الخصم";
        document.getElementById("coupon-form-id").value = coupon.id;
        document.getElementById("coupon-form-code").value = coupon.code;
        document.getElementById("coupon-form-type").value = coupon.type;
        document.getElementById("coupon-form-value").value = coupon.value;
        document.getElementById("coupon-form-min-purchase").value = coupon.minPurchase;
        document.getElementById("coupon-form-max-uses").value = coupon.maxUses;
        document.getElementById("coupon-form-max-per-user").value = coupon.maxPerUser;
        document.getElementById("coupon-form-start-date").value = coupon.startDate;
        document.getElementById("coupon-form-expiry-date").value = coupon.expiryDate;
        document.getElementById("coupon-form-desc-ar").value = coupon.desc_ar || "";
        document.getElementById("coupon-form-desc-en").value = coupon.desc_en || "";
        document.getElementById("coupon-form-active").checked = coupon.active;
        document.getElementById("coupon-form-featured").checked = coupon.featured;
        document.getElementById("coupon-form-public").checked = coupon.public;
        document.getElementById("coupon-form-first-order").checked = coupon.firstOrder;
        document.getElementById("coupon-form-vip-only").checked = coupon.vipOnly;
        document.getElementById("coupon-form-referral").checked = coupon.referral;
        document.getElementById("coupon-form-seasonal-tag").value = coupon.seasonalTag || "";
    } else {
        title.innerText = "إضافة كود خصم جديد";
        document.getElementById("coupon-form-id").value = "";
        document.getElementById("coupon-item-form").reset();
        document.getElementById("coupon-form-active").checked = true;
        document.getElementById("coupon-form-public").checked = true;
        document.getElementById("coupon-form-max-per-user").value = 1;
        document.getElementById("coupon-form-min-purchase").value = 0;
        document.getElementById("coupon-form-max-uses").value = 0;
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("coupon-form-start-date").value = today;
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        document.getElementById("coupon-form-expiry-date").value = nextYear.toISOString().split("T")[0];
    }
    modal.classList.add("active");
}

function updateCouponStats() {
    const coupons = getCoupons();
    const totalEl = document.getElementById("coupon-stat-total");
    const activeEl = document.getElementById("coupon-stat-active");
    const usedEl = document.getElementById("coupon-stat-used");
    const savingsEl = document.getElementById("coupon-stat-savings");
    if (totalEl) totalEl.innerText = coupons.length;
    if (activeEl) activeEl.innerText = coupons.filter(c => c.active).length;
    if (usedEl) usedEl.innerText = coupons.reduce((s, c) => s + (c.currentUses || 0), 0);
    if (savingsEl) {
        const totalSavings = coupons.reduce((s, c) => s + ((c.currentUses || 0) * (c.type === "percentage" ? 0 : (c.value || 0))), 0);
        savingsEl.innerText = totalSavings;
    }
}

// --- Startup Launcher ---
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPreloader);
} else {
    runPreloader();
}

// --- Global JavaScript Error Listener to Log Client-Side exceptions to Discord ---
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('app.js') && event.message.includes('discord-logger')) {
        return;
    }
    
    sendDiscordWebhookNotification("error", "❌ خطأ برمجي في المتصفح (Client JS Error)", [
        { name: "الرسالة (Message)", value: event.message || "Unknown error", inline: false },
        { name: "الملف (File)", value: event.filename || "Unknown file", inline: true },
        { name: "السطر والعمود (Position)", value: `${event.lineno}:${event.colno}`, inline: true },
        { name: "تفاصيل الخطأ (Stack)", value: event.error && event.error.stack ? event.error.stack.substring(0, 1000) : "No stack trace", inline: false }
    ]);
});

window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    let message = "Unhandled Promise Rejection";
    let stack = "No stack trace";

    if (reason) {
        if (reason instanceof Error) {
            message = reason.message;
            stack = reason.stack || "No stack trace";
        } else if (typeof reason === 'string') {
            message = reason;
        } else {
            try {
                message = JSON.stringify(reason);
            } catch(e) {}
        }
    }

    sendDiscordWebhookNotification("error", "❌ خطأ وعود غير معالجة (Unhandled Promise Rejection)", [
        { name: "السبب (Reason)", value: message, inline: false },
        { name: "تفاصيل الخطأ (Stack)", value: stack.substring(0, 1000), inline: false }
    ]);
});

// ==========================================================================
// ULTRA PREMIUM CORE INTEGRATION LOGIC
// ==========================================================================

// --- SPA Portal View Router ---
const btnPortalToggle = document.getElementById("btn-portal-toggle");
const btnExitPortal = document.getElementById("btn-exit-portal");
const sectionsContainer = document.getElementById("sections-container");
const mainHeader = document.getElementById("main-header");
const marketplacePortal = document.getElementById("marketplace-portal");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const portalViews = document.querySelectorAll(".portal-view");

if (btnPortalToggle && marketplacePortal) {
    btnPortalToggle.onclick = () => {
        // Log entry to security center
        addSecurityLog("Portal Access", "Authorized", "Browser Session opened workspace");
        
        // Hide Homepage, Show Portal
        if (sectionsContainer) sectionsContainer.style.display = "none";
        if (mainHeader) mainHeader.style.display = "none";
        marketplacePortal.style.display = "flex";
        
        // Auto load dynamic portal sections
        initPortalServices();
        initAchievements();
        renderPortalBlog();
        renderSvgChart();
        initParticlesBg();
    };
}

if (btnExitPortal && marketplacePortal) {
    btnExitPortal.onclick = () => {
        if (sectionsContainer) sectionsContainer.style.display = "block";
        if (mainHeader) mainHeader.style.display = "block";
        marketplacePortal.style.display = "none";
    };
}

// Sidebar links toggle
sidebarLinks.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        const viewName = link.getAttribute("data-view");
        
        sidebarLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        
        portalViews.forEach(view => {
            if (view.id === `view-${viewName}`) {
                view.classList.add("active");
            } else {
                view.classList.remove("active");
            }
        });
    };
});

// Show admin link in sidebar if adminMode is active
setInterval(() => {
    const adminLink = document.getElementById("sidebar-admin-link");
    if (adminLink) {
        adminLink.style.display = adminMode ? "flex" : "none";
    }
}, 1000);

// --- Live Fluctuating Counter Stats (Roblox & Discord) ---
let rbxActive = 1402;
let dcOnline = 5;

setInterval(() => {
    rbxActive += Math.floor(Math.random() * 21) - 10;
    const rbxEl = document.getElementById("rbx-active-players");
    if (rbxEl) rbxEl.innerText = rbxActive.toLocaleString();
    
    dcOnline += Math.floor(Math.random() * 3) - 1;
    if (dcOnline < 2) dcOnline = 2;
    const dcStaffEl = document.getElementById("dc-online-staff");
    if (dcStaffEl) dcStaffEl.innerText = dcOnline;
}, 5000);

// --- Live Activity Feed (PostgreSQL Database-backed) ---
const feedContainer = document.getElementById("live-activity-feed");
function updateRealActivityFeed() {
    if (!feedContainer) return;
    
    fetch("/api/portal?action=activity_feed")
    .then(res => res.json())
    .then(data => {
        if (data.feed && data.feed.length > 0) {
            feedContainer.innerHTML = "";
            data.feed.slice(0, 8).forEach(item => {
                const div = document.createElement("div");
                div.className = "feed-item";
                const text = currentLang === "ar" ? item.ar : item.en;
                div.innerHTML = `
                    <span class="feed-icon">${item.icon}</span>
                    <div class="feed-details">
                        <span>${text}</span>
                        <span class="feed-time">الآن / Live</span>
                    </div>
                `;
                feedContainer.appendChild(div);
            });
        } else {
            feedContainer.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.8rem;">لا توجد نشاطات حية حالياً / No live activities yet</div>`;
        }
    })
    .catch(err => console.error("Error loading activity feed:", err));
}

// Initial load
updateRealActivityFeed();
// Poll actual backend activities every 30 seconds
setInterval(updateRealActivityFeed, 30000);

// --- User Profile, XP Engine & Mystery Box ---
let userXP = parseInt(localStorage.getItem("3m_user_xp")) || 240;
let userLevel = parseInt(localStorage.getItem("3m_user_level")) || 3;
let lastMysteryBoxOpen = localStorage.getItem("3m_mystery_box_last") || "";

function initAchievements() {
    const xpDisplay = document.getElementById("user-xp-display");
    const lvlDisplay = document.getElementById("user-level-display");
    const xpBar = document.getElementById("user-xp-bar");
    const rankDisplay = document.getElementById("portal-user-rank");
    
    if (xpDisplay) xpDisplay.innerText = `XP: ${userXP} / ${userLevel * 200}`;
    if (lvlDisplay) lvlDisplay.innerText = `${currentLang === "ar" ? "المستوى" : "Level"}: ${userLevel}`;
    if (xpBar) xpBar.style.width = `${(userXP / (userLevel * 200)) * 100}%`;
    
    if (rankDisplay) {
        if (userLevel >= 10) {
            rankDisplay.innerText = currentLang === "ar" ? "أسطوري / VIP Diamond" : "VIP Diamond";
            rankDisplay.style.borderColor = "#9d4edd";
        } else if (userLevel >= 6) {
            rankDisplay.innerText = currentLang === "ar" ? "محترف / VIP Gold" : "VIP Gold";
            rankDisplay.style.borderColor = "#ffae19";
        } else {
            rankDisplay.innerText = currentLang === "ar" ? "مبتدئ / Bronze" : "Bronze";
            rankDisplay.style.borderColor = "#00f2fe";
        }
    }
    
    renderAchievementsList();
}

const achievementsList = [
    { id: "ach-1", icon: "🎟️", ar: "كود الخصم الأول", en: "First Coupon Used", desc_ar: "قم بتطبيق كود خصم في صفحة الدفع.", desc_en: "Apply any coupon at checkout.", unlocked: false },
    { id: "ach-2", icon: "🎁", ar: "محب الحظ", en: "Box Opener", desc_ar: "افتح صندوق الحظ اليومي لأول مرة.", desc_en: "Open the daily mystery box for the first time.", unlocked: false },
    { id: "ach-3", icon: "🎮", ar: "مطور روبلوكس", en: "Roblox Fanatic", desc_ar: "تصفح خدمات روبلوكس في المتجر.", desc_en: "Browse Roblox services in the store.", unlocked: true },
    { id: "ach-4", icon: "🛡️", ar: "أمان الحساب", en: "Secure Access", desc_ar: "قم بزيارة مركز الحماية والأمان.", desc_en: "Visit the account security center.", unlocked: true }
];

function renderAchievementsList() {
    const container = document.getElementById("achievements-grid");
    if (!container) return;
    container.innerHTML = "";
    achievementsList.forEach(ach => {
        const isUnlocked = ach.unlocked || (ach.id === "ach-2" && lastMysteryBoxOpen !== "");
        const card = document.createElement("div");
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <span class="achievement-icon">${ach.icon}</span>
            <div class="achievement-details">
                <h4>${currentLang === "ar" ? ach.ar : ach.en}</h4>
                <p>${currentLang === "ar" ? ach.desc_ar : ach.desc_en}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// Mystery Box opening mechanism
const box3d = document.getElementById("mystery-box-3d");
const btnOpenBox = document.getElementById("btn-open-mystery-box");

if (box3d && btnOpenBox) {
    btnOpenBox.onclick = openMysteryBox;
    box3d.onclick = openMysteryBox;
}

function openMysteryBox() {
    const loggedUser = JSON.parse(localStorage.getItem("discord_user"));
    if (!loggedUser || !loggedUser.id) {
        showToast(currentLang === "ar" ? "يرجى تسجيل الدخول أولاً للمطالبة بالجوائز اليومية!" : "Please log in with Discord first to claim daily rewards!", "warning");
        return;
    }

    // Trigger animation
    box3d.classList.add("shake");
    btnOpenBox.disabled = true;

    fetch("/api/portal?action=claim_reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedUser.id })
    })
    .then(async res => {
        const resData = await res.json();
        box3d.classList.remove("shake");
        
        if (!res.ok) {
            showToast(resData.error || "Failed to claim reward", "warning");
            btnOpenBox.disabled = false;
            return;
        }

        box3d.classList.add("open");
        setTimeout(() => {
            userXP = resData.xp;
            userLevel = resData.level;
            loggedUser.xp = resData.xp;
            loggedUser.level = resData.level;
            loggedUser.points = resData.pointsEarned + (loggedUser.points || 0);
            loggedUser.streak = resData.streak;
            loggedUser.last_daily_claim = new Date().toISOString().split("T")[0];
            
            localStorage.setItem("discord_user", JSON.stringify(loggedUser));
            showToast(currentLang === "ar" ? `🎁 ربحت ${resData.pointsEarned} نقطة و ${resData.xpEarned} XP!` : `🎁 You won ${resData.pointsEarned} points and ${resData.xpEarned} XP!`, "success");
            
            initAchievements();
            
            setTimeout(() => {
                box3d.classList.remove("open");
                btnOpenBox.disabled = false;
            }, 2000);
        }, 600);
    })
    .catch(err => {
        console.error("Box open error:", err);
        box3d.classList.remove("shake");
        btnOpenBox.disabled = false;
        showToast("Server Connection Error / خطأ في الاتصال بالخادم", "error");
    });
}

// --- Theme Customizer Loader & Saved State Handler ---
const themeFontSelect = document.getElementById("theme-font-select");
const themeGlowSlider = document.getElementById("theme-glow-slider");
const btnSaveTheme = document.getElementById("btn-save-custom-theme");

if (btnSaveTheme) {
    btnSaveTheme.onclick = () => {
        const font = themeFontSelect ? themeFontSelect.value : "Cairo";
        const glow = themeGlowSlider ? themeGlowSlider.value : "10";
        
        localStorage.setItem("3m_custom_font", font);
        localStorage.setItem("3m_custom_glow", glow);
        
        applyCustomThemeStyles(font, glow);
        showToast(currentLang === "ar" ? "تم حفظ المظهر وتطبيقه بنجاح!" : "Theme customized successfully!", "success");
    };
}

// Apply selected colors from color buttons
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        const color = btn.getAttribute("data-color");
        localStorage.setItem("3m_custom_color", color);
        document.documentElement.style.setProperty("--primary-color", color);
    };
});

function applyCustomThemeStyles(font, glow) {
    document.documentElement.style.setProperty("--font-family", font);
    const shadowIntensity = parseFloat(glow) / 10.0;
    document.documentElement.style.setProperty("--glow-intensity", shadowIntensity);
}

// On load, restore custom theme parameters
(function loadCustomTheme() {
    const savedColor = localStorage.getItem("3m_custom_color");
    const savedFont = localStorage.getItem("3m_custom_font") || "Cairo";
    const savedGlow = localStorage.getItem("3m_custom_glow") || "10";
    
    if (savedColor) {
        document.documentElement.style.setProperty("--primary-color", savedColor);
        const activeColorBtn = document.querySelector(`.color-btn[data-color="${savedColor}"]`);
        if (activeColorBtn) activeColorBtn.classList.add("selected");
    }
    
    if (themeFontSelect) themeFontSelect.value = savedFont;
    if (themeGlowSlider) themeGlowSlider.value = savedGlow;
    applyCustomThemeStyles(savedFont, savedGlow);
})();

// --- Dynamic Kiosk Store catalog ---
function initPortalServices() {
    const grid = document.getElementById("kiosk-grid");
    const catsContainer = document.getElementById("kiosk-cats-container");
    if (!grid) return;
    
    const services = (adminMode ? draftState[currentLang] : liveState[currentLang]).services || [];
    
    // Render Category filters
    if (catsContainer) {
        catsContainer.innerHTML = "";
        const categories = ["all", "roblox", "discord", "web", "graphic"];
        const categoryLabels = {
            all: currentLang === "ar" ? "الكل" : "All",
            roblox: currentLang === "ar" ? "روبلوكس" : "Roblox",
            discord: currentLang === "ar" ? "ديسكورد" : "Discord",
            web: currentLang === "ar" ? "تطوير الويب" : "Web Dev",
            graphic: currentLang === "ar" ? "تصميم جرافيك" : "Graphics"
        };
        
        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = `btn btn-sm \${cat === 'all' ? 'btn-primary' : 'btn-secondary'}`;
            btn.innerText = categoryLabels[cat] || cat;
            btn.onclick = () => {
                catsContainer.querySelectorAll("button").forEach(b => {
                    b.classList.remove("btn-primary");
                    b.classList.add("btn-secondary");
                });
                btn.classList.remove("btn-secondary");
                btn.classList.add("btn-primary");
                filterPortalServices(cat);
            };
            catsContainer.appendChild(btn);
        });
    }
    
    renderKioskGrid(services);
}

function renderKioskGrid(services) {
    const grid = document.getElementById("kiosk-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    services.forEach(srv => {
        const card = document.createElement("div");
        card.className = "portal-card service-card";
        card.innerHTML = `
            <div class="card-header">
                <h3>🎮 \${srv.title}</h3>
            </div>
            <div class="card-body">
                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; margin-bottom:15px; height:60px; overflow:hidden;">\${srv.description}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.03); padding-top:12px;">
                    <span style="font-weight:bold; color:var(--primary-color);">\${getFormattedPrice(srv.priceBase)}</span>
                    <button class="btn btn-primary btn-sm btn-glow" onclick="openPurchaseModal('\${srv.id}')">شراء / Buy</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterPortalServices(cat) {
    const services = (adminMode ? draftState[currentLang] : liveState[currentLang]).services || [];
    if (cat === "all") {
        renderKioskGrid(services);
    } else {
        const filtered = services.filter(x => x.category === cat || x.id.includes(cat));
        renderKioskGrid(filtered);
    }
}

// Search bar inside Store Kiosk
const kioskSearch = document.getElementById("kiosk-search");
if (kioskSearch) {
    kioskSearch.oninput = () => {
        const q = kioskSearch.value.trim().toLowerCase();
        const services = (adminMode ? draftState[currentLang] : liveState[currentLang]).services || [];
        const filtered = services.filter(x => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
        renderKioskGrid(filtered);
    };
}

// --- Media & Tutorials Blog list ---
const blogArticles = [
    { id: "blog-1", icon: "🎮", ar: "كيف تبرمج لعبة روبلوكس احترافية من الصفر", en: "How to Script a Roblox Game from Scratch", date: "2026-06-25", desc_ar: "دليل كامل للمبتدئين لتعلم محرك Roblox Studio واستخدام لغة Luau.", desc_en: "Learn Luau programming and workspace fundamentals inside Roblox Studio." },
    { id: "blog-2", icon: "🤖", ar: "تأمين سيرفرات ديسكورد ضد الهجمات والثغرات", en: "Securing Discord Servers from Spam Bots", date: "2026-06-22", desc_ar: "أفضل إعدادات الأمان والبوتات المخصصة للحفاظ على مجتمعك آمناً.", desc_en: "Best security settings, permissions, and bots to prevent server raids." },
    { id: "blog-3", icon: "🌐", ar: "أسرار زيادة سرعة تحميل مواقع الويب للألعاب", en: "Speed Optimization for Gaming Portals", date: "2026-06-18", desc_ar: "نصائح تقنية لتحسين الاستجابة السريعة وتقليل أوقات تحميل الواجهة.", desc_en: "Proven tech tips to reduce bundle size and achieve fast load speeds." }
];

function renderPortalBlog() {
    const grid = document.getElementById("portal-blog-grid");
    if (!grid) return;
    grid.innerHTML = "";
    blogArticles.forEach(art => {
        const card = document.createElement("div");
        card.className = "portal-card";
        card.innerHTML = `
            <div class="card-header">
                <h3>\${art.icon} \${currentLang === "ar" ? art.ar : art.en}</h3>
            </div>
            <div class="card-body">
                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; margin-bottom:15px;">\${currentLang === "ar" ? art.desc_ar : art.desc_en}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
                    <span>📅 \${art.date}</span>
                    <a href="#" class="btn btn-secondary btn-sm" onclick="event.preventDefault(); showToast('قريباً / Coming Soon', 'info');">اقرأ / Read</a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Interactive SVG Line Chart (Admin Panel) ---
function renderSvgChart() {
    const chartContainer = document.getElementById("admin-svg-chart");
    if (!chartContainer) return;
    
    chartContainer.innerHTML = `
        <svg viewBox="0 0 500 200" width="100%" height="100%" style="overflow:visible;">
            <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <line x1="50" y1="20" x2="450" y2="20" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
            <line x1="50" y1="70" x2="450" y2="70" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
            <line x1="50" y1="120" x2="450" y2="120" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
            <line x1="50" y1="170" x2="450" y2="170" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
            
            <path d="M50,170 L50,140 L130,90 L210,130 L290,60 L370,100 L450,30 L450,170 Z" fill="url(#chartGlow)"/>
            
            <path d="M50,140 L130,90 L210,130 L290,60 L370,100 L450,30" fill="none" stroke="var(--primary-color)" stroke-width="3" style="filter: drop-shadow(0 0 6px var(--primary-color));"/>
            
            <circle cx="50" cy="140" r="4" fill="#fff"/>
            <circle cx="130" cy="90" r="4" fill="#fff"/>
            <circle cx="210" cy="130" r="4" fill="#fff"/>
            <circle cx="290" cy="60" r="4" fill="#fff"/>
            <circle cx="370" cy="100" r="4" fill="#fff"/>
            <circle cx="450" cy="30" r="4" fill="#fff"/>
            
            <text x="50" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">Jan</text>
            <text x="130" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">Feb</text>
            <text x="210" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">Mar</text>
            <text x="290" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">Apr</text>
            <text x="370" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">May</text>
            <text x="450" y="190" fill="var(--text-muted)" font-size="8" text-anchor="middle">Jun</text>
            
            <text x="35" y="143" fill="var(--text-muted)" font-size="8" text-anchor="end">2K</text>
            <text x="35" y="93" fill="var(--text-muted)" font-size="8" text-anchor="end">5K</text>
            <text x="35" y="33" fill="var(--text-muted)" font-size="8" text-anchor="end">10K EGP</text>
        </svg>
    `;
}

// --- Security Center Logging ---
const securityLogs = [
    { type: "access", date: "2026-06-30 21:00", device: "Chrome 142/Windows", ip: "197.34.82.10", msg: "Login Success" },
    { type: "alert", date: "2026-06-30 21:12", device: "Safari/iOS", ip: "41.90.231.55", msg: "Invalid Coupon attempt" }
];

function addSecurityLog(action, status, detail) {
    const today = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const log = {
        type: status === "Alert" ? "alert" : "access",
        date: today,
        device: navigator.userAgent.substring(0, 20) || "Unknown Device",
        ip: "127.0.0.1",
        msg: `\${action} - \${detail}`
    };
    securityLogs.unshift(log);
    renderSecurityLogs();
}

function renderSecurityLogs() {
    const container = document.getElementById("admin-security-logs");
    if (!container) return;
    container.innerHTML = "";
    securityLogs.slice(0, 5).forEach(log => {
        const div = document.createElement("div");
        div.className = "log-item";
        div.innerHTML = `
            <span>📅 \${log.date} | 💻 \${log.device}</span>
            <span class="log-status \${log.type === 'alert' ? 'alert' : ''}">\${log.msg}</span>
        `;
        container.appendChild(div);
    });
}

// --- Background Canvas Particles System ---
let particlesArray = [];
function initParticlesBg() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.4 - 0.2;
            this.speedY = Math.random() * 0.4 - 0.2;
            this.color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#00f2fe';
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    particlesArray = [];
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 25000));
    for (let i = 0; i < count; i++) {
        particlesArray.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

window.addEventListener("resize", () => {
    const canvas = document.getElementById("particles-canvas");
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Run particles logic on start
initParticlesBg();
