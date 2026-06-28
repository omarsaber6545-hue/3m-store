# 3M Studio — Architectural Plan & Technical Specification

> **Author**: Staff Software Engineer / Tech Lead
> **Project**: 3M Studio Premium Marketplace Platform
> **Date**: June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Data Models](#5-data-models)
6. [API Endpoints](#6-api-endpoints)
7. [Component Tree](#7-component-tree)
8. [State Management](#8-state-management)
9. [Coupon System Design](#9-coupon-system-design)
10. [Implementation Phases](#10-implementation-phases)
11. [Migration Strategy](#11-migration-strategy)
12. [Security Considerations](#12-security-considerations)
13. [Performance Targets](#13-performance-targets)

---

## 1. Executive Summary

### Current State
Monolithic vanilla JS SPA (4081-line `app.js`, 3512-line `style.css`) deployed on Vercel with 7 serverless functions. Data persistence through Discord Bot API (orders stored as Discord embeds). Admin panel with visual live editor.

### Target State
Modular architecture with clear separation of concerns, proper database (MongoDB Atlas via Vercel), state management layer, and ~25+ new sections. Coupon system with full lifecycle (CRUD, validation, checkout integration, public page, admin dashboard).

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Keep Vanilla JS (no framework migration) | Existing codebase is pure Vanilla; migration to React/Vue would be 6+ month effort with low ROI for a storefront |
| Build Tool | Add **Vite** | Enables modular imports, HMR, CSS splitting, minification |
| Database | **MongoDB Atlas** via Vercel Edge/Serverless | Schema-flexible for multi-section data; replaces Discord-as-database |
| CSS Strategy | **CSS Custom Properties** (keep) + **CSS Modules** per section | Existing design tokens in `:root` are excellent; new sections get scoped CSS files |
| State | **localStorage** for user session + **MongoDB** for persistent data | Keep existing draft/publish pattern; move orders/coupons/users to database |
| Auth | **Discord OAuth2** (keep) + **JWT tokens** for admin | Add proper session management alongside existing Discord login |

---

## 2. Current Architecture Analysis

### 2.1 Strengths
- Zero-dependency frontend (fast load, no build step)
- Visual live editor with undo/redo is genuinely innovative
- Multi-language (AR/EN) and multi-currency (EGP/USD/EUR) well-implemented
- Discord integration for logging, chat, and order management is clever
- Responsive design with gaming aesthetic is polished

### 2.2 Weaknesses
- **Monolithic files**: `app.js` (4081 lines) and `style.css` (3512 lines) are unmaintainable at scale
- **No database**: Discord message embeds are not a database; no querying, no relations, no backups
- **No package.json**: No build step, no dependency management, no type checking
- **LocalStorage-only**: State is fragile, no server-side persistence for most data
- **No testing**: Zero tests for any component
- **Coupon system stub**: Only a static HTML banner exists; no logic, no admin management
- **Security**: Admin password stored in localStorage (`"maloka"` default), no rate limiting
- **No offline/caching strategy**: Full page load required for all content

### 2.3 Data Flow (Current)

```
Browser (index.html + app.js)
    ↕ localStorage (3m_studio_live_state, 3m_studio_draft_state, etc.)
    ↕ Vercel API (/api/*)
        ↕ Discord Bot API (channel messages as "database")
            ↕ Discord WebSocket / REST
```

### 2.4 Data Flow (Target)

```
Browser (Vite-bundled modules)
    ↕ Zustand-like state manager (in-memory + localStorage cache)
    ↕ Vercel API Gateway (/api/*)
        ↕ MongoDB Atlas (primary persistence)
        ↕ Discord Bot API (notifications only, not storage)
        ↕ OpenRouter AI (chat assistant)
        ↕ Payment Gateways (PayPal, Vodafone Cash, InstaPay)
```

---

## 3. Target Architecture

### 3.1 Layers

```
┌───────────────────────────────────────────────────┐
│                    CLIENT                          │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ SPA Router   │  │  State   │  │   UI Layer   │  │
│  │ (hash-based) │  │ Manager  │  │ (25+ secs)   │  │
│  └─────────────┘  └──────────┘  └──────────────┘  │
├───────────────────────────────────────────────────┤
│                 API GATEWAY (Vercel)                │
│  ┌──────┐ ┌───────┐ ┌──────┐ ┌─────┐ ┌────────┐  │
│  │Auth  │ │Coupon │ │Order │ │User │ │Content │  │  │
│  │/api  │ │/api   │ │/api  │ │/api │ │/api    │  │  │
│  └──────┘ └───────┘ └──────┘ └─────┘ └────────┘  │
├───────────────────────────────────────────────────┤
│                   DATA LAYER                        │
│  ┌──────────────┐  ┌───────────────┐               │
│  │ MongoDB Atlas│  │ Discord Bot   │               │
│  │ (Primary)    │  │ (Notif only)  │               │
│  └──────────────┘  └───────────────┘               │
└───────────────────────────────────────────────────┘
```

### 3.2 Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Module Pattern** | All JS files | Encapsulation, clear interfaces |
| **Observer/Event Bus** | Cross-component communication | Sections need to react to coupon apply, auth changes, language switch |
| **Repository Pattern** | API client layer | Abstract data access from API calls |
| **Strategy Pattern** | Payment methods, coupon discount types | Swappable algorithms for different payment/coupon types |
| **Factory Pattern** | Section rendering | Create sections from config data |
| **Pub/Sub** | Live chat, notifications | Real-time updates between Discord and browser |

---

## 4. Folder Structure

```
3m-studio-store/
├── index.html                     # Entry point (keep, minimal)
├── vite.config.js                 # NEW: Vite config
├── package.json                   # NEW: Dependencies & scripts
├── .env.example                   # NEW: Environment template
├── .env.local                     # Keep (secrets)
├── vercel.json                    # Keep
├── robots.txt                     # Keep
│
├── src/                           # NEW: All source code
│   ├── main.js                    # Entry: router init, global setup
│   ├── app.js                     # KEEP: existing init + wireEvents (refactored)
│   │
│   ├── router/                    # SPA Hash Router
│   │   ├── index.js
│   │   └── routes.js              # Route definitions
│   │
│   ├── core/                      # Core infrastructure
│   │   ├── state.js               # State manager (draft/live pattern)
│   │   ├── store.js               # Global reactive store (event-based)
│   │   ├── event-bus.js           # Pub/Sub event system
│   │   ├── api-client.js          # HTTP client for Vercel API
│   │   ├── i18n.js                # i18n (AR/EN) + currency formatter
│   │   ├── auth.js                # Discord OAuth + session
│   │   ├── utils.js               # Shared utilities
│   │   └── constants.js           # Config constants
│   │
│   ├── sections/                  # One module per section
│   │   ├── hero/                  # Hero (animated, video, particles)
│   │   │   ├── hero.js
│   │   │   └── hero.css
│   │   ├── store/                 # Store section (services, products)
│   │   │   ├── store.js
│   │   │   ├── store.css
│   │   │   ├── product-card.js
│   │   │   ├── search-filter.js
│   │   │   ├── categories.js
│   │   │   ├── reviews.js
│   │   │   ├── best-sellers.js
│   │   │   └── new-arrivals.js
│   │   ├── roblox-dev/            # Roblox Development section
│   │   │   ├── roblox-dev.js
│   │   │   └── roblox-dev.css
│   │   ├── discord-services/      # Discord Services section
│   │   │   ├── discord-services.js
│   │   │   └── discord-services.css
│   │   ├── web-dev/               # Website Development section
│   │   │   ├── web-dev.js
│   │   │   └── web-dev.css
│   │   ├── portfolio/             # Portfolio gallery
│   │   │   ├── portfolio.js
│   │   │   └── portfolio.css
│   │   ├── reviews/               # Reviews & testimonials
│   │   │   ├── reviews.js
│   │   │   └── reviews.css
│   │   ├── team/                  # Team section
│   │   │   ├── team.js
│   │   │   └── team.css
│   │   ├── statistics/            # Live statistics counters
│   │   │   ├── statistics.js
│   │   │   └── statistics.css
│   │   ├── rewards/               # Rewards system
│   │   │   ├── rewards.js
│   │   │   └── rewards.css
│   │   ├── leaderboard/           # Leaderboard
│   │   │   ├── leaderboard.js
│   │   │   └── leaderboard.css
│   │   ├── ticket/                # Ticket system
│   │   │   ├── ticket.js
│   │   │   └── ticket.css
│   │   ├── live-chat/             # Live chat widget (refactored)
│   │   │   ├── live-chat.js
│   │   │   └── live-chat.css
│   │   ├── booking/               # Booking system
│   │   │   ├── booking.js
│   │   │   └── booking.css
│   │   ├── blog/                  # Blog section
│   │   │   ├── blog.js
│   │   │   └── blog.css
│   │   ├── faq/                   # FAQ (refactored)
│   │   │   ├── faq.js
│   │   │   └── faq.css
│   │   ├── announcements/         # Announcements bar
│   │   │   ├── announcements.js
│   │   │   └── announcements.css
│   │   ├── dashboard/             # User dashboard
│   │   │   ├── user-dashboard.js
│   │   │   └── user-dashboard.css
│   │   ├── seller-dashboard/      # Seller dashboard
│   │   │   ├── seller-dashboard.js
│   │   │   └── seller-dashboard.css
│   │   ├── checkout/              # Checkout (refactored from modal)
│   │   │   ├── checkout.js
│   │   │   ├── checkout.css
│   │   │   └── payment-methods.js
│   │   ├── coupon/                # Coupon system (NEW)
│   │   │   ├── coupon.js          # Apply logic, validation
│   │   │   ├── coupon.css
│   │   │   ├── public-coupons.js  # العروض والأكواد page
│   │   │   ├── featured-coupons.js # Homepage featured section
│   │   │   └── coupon-card.js     # Reusable coupon card component
│   │   ├── admin/                 # Admin panel (refactored)
│   │   │   ├── admin.js
│   │   │   ├── admin.css
│   │   │   ├── admin-login.js
│   │   │   ├── admin-toolbar.js
│   │   │   ├── admin-side-panel.js
│   │   │   ├── products-manager.js
│   │   │   ├── orders-manager.js
│   │   │   ├── users-manager.js
│   │   │   ├── coupon-manager.js  # NEW: Admin coupon CRUD
│   │   │   ├── blog-manager.js
│   │   │   ├── analytics-dashboard.js
│   │   │   ├── revenue-dashboard.js
│   │   │   ├── email-manager.js
│   │   │   └── notification-manager.js
│   │   └── shared/                # Shared UI components
│   │       ├── modal.js
│   │       ├── toast.js
│   │       ├── button.js
│   │       ├── card.js
│   │       ├── form.js
│   │       ├── timer.js           # Countdown timer (for coupons)
│   │       ├── star-rating.js
│   │       ├── copy-button.js     # One-click copy (for coupon codes)
│   │       └── loading-spinner.js
│   │
│   ├── styles/                    # Global styles
│   │   ├── main.css               # Base styles, design tokens
│   │   ├── variables.css          # CSS custom properties (from current style.css)
│   │   ├── reset.css
│   │   ├── layout.css
│   │   ├── animations.css         # Shared keyframes
│   │   └── utilities.css
│   │
│   └── assets/                    # Static assets
│       ├── fonts/
│       ├── images/
│       └── videos/                # Background video for hero
│
├── api/                           # Vercel serverless functions
│   ├── _lib/                      # NEW: Shared server utilities
│   │   ├── db.js                  # MongoDB connection singleton
│   │   ├── auth.js                # JWT verification, middleware
│   │   ├── discord.js             # Discord notification helpers
│   │   └── validators.js          # Input validation
│   │
│   ├── auth/                      # Auth endpoints
│   │   ├── discord-login.js       # OAuth callback
│   │   ├── discord-profile.js     # Keep (refactor to use _lib)
│   │   └── admin-login.js         # JWT-based admin auth
│   │
│   ├── coupons/                   # NEW: Coupon CRUD
│   │   ├── index.js               # GET (list/search), POST (create)
│   │   ├── [id].js                # GET, PATCH, DELETE single coupon
│   │   └── validate.js            # POST: validate coupon at checkout
│   │
│   ├── orders/                    # NEW: Order management (refactor from checkout.js)
│   │   ├── index.js               # GET (list), POST (create)
│   │   ├── [id].js                # GET, PATCH single order
│   │   └── stats.js               # Order statistics
│   │
│   ├── users/                     # NEW: User management
│   │   ├── index.js               # CRUD
│   │   ├── [id]/dashboard.js      # User dashboard data
│   │   └── [id]/rewards.js        # User rewards
│   │
│   ├── products/                  # NEW: Product management
│   │   ├── index.js               # CRUD
│   │   └── categories.js          # Category listing
│   │
│   ├── content/                   # NEW: Section content management
│   │   ├── sections.js            # Section order, visibility
│   │   ├── hero.js                # Hero section data
│   │   ├── portfolio.js           # Portfolio items
│   │   ├── team.js                # Team members
│   │   ├── reviews.js             # Reviews CRUD
│   │   ├── blog.js                # Blog posts CRUD
│   │   ├── faq.js                 # FAQ CRUD
│   │   └── announcements.js       # Announcements
│   │
│   ├── statistics/                # Live statistics
│   │   └── index.js               # Aggregated stats
│   │
│   ├── rewards/                   # Rewards system
│   │   ├── index.js               # Points, ranks, VIP
│   │   └── leaderboard.js         # Leaderboard data
│   │
│   ├── booking/                   # Booking system
│   │   └── index.js               # Schedule appointments
│   │
│   ├── tickets/                   # Ticket system
│   │   ├── index.js               # CRUD
│   │   └── [id]/messages.js       # Ticket messages
│   │
│   ├── payments/                  # Payment processing
│   │   ├── paypal.js              # PayPal API integration
│   │   ├── vodafone.js            # Manual verification
│   │   └── instapay.js            # Manual verification
│   │
│   ├── analytics/                 # Admin analytics
│   │   ├── dashboard.js           # Aggregated stats
│   │   └── revenue.js             # Revenue data
│   │
│   ├── config.js                  # Keep (env config)
│   ├── checkout.js                # Keep (refactor to orders/)
│   ├── discord-chat.js            # Keep
│   ├── discord-logger.js          # Keep
│   ├── ai-chat.js                 # Keep
│   └── admin-orders.js            # Keep (refactor to orders/)
│
├── scripts/                       # NEW: Build & migration scripts
│   ├── seed-coupons.js            # Seed initial coupon data
│   ├── migrate-from-discord.js    # Migrate existing orders from Discord to MongoDB
│   └── generate-sitemap.js
│
└── tests/                         # NEW: Tests
    ├── unit/
    │   ├── coupon.test.js
    │   ├── state.test.js
    │   └── i18n.test.js
    ├── integration/
    │   ├── api/
    │   │   ├── coupons.test.js
    │   │   └── orders.test.js
    │   └── sections/
    │       └── hero.test.js
    └── e2e/
        └── checkout-flow.test.js
```

---

## 5. Data Models

### 5.1 MongoDB Collections

#### `coupons`
```js
{
  _id: ObjectId,
  code: String,             // e.g. "3M20", "VIP10" ← unique, indexed
  type: String,             // "percentage" | "fixed"
  value: Number,            // 20 (for 20%) or 50 (for 50 EGP)
  minPurchase: Number,      // minimum order amount to apply
  maxUses: Number,          // total usage limit (-1 for unlimited)
  usedCount: Number,        // current usage count
  maxUsesPerUser: Number,   // per-user limit
  startDate: Date,
  expirationDate: Date,     // null for no expiry
  isActive: Boolean,
  isFeatured: Boolean,      // show on homepage
  isPublic: Boolean,        // show on public coupons page
  description: {            // bilingual
    ar: String,
    en: String
  },
  bannerMessage: {          // message shown when applied
    ar: String,
    en: String
  },
  conditions: {
    firstOrderOnly: Boolean,  // only for first-time buyers
    vipOnly: Boolean,         // only for VIP users
    seasonalTag: String,      // e.g. "summer2026", "ramadan"
    referralCode: String,     // linked to referral program
    applicableCategories: [String], // ["roblox-dev", "discord-services"]
    applicableProductIds: [String]  // specific product IDs
  },
  discountOverrides: {
    maxDiscountAmount: Number, // cap for percentage discounts
    stackable: Boolean         // can combine with other coupons
  },
  metadata: {
    createdBy: String,        // admin user ID
    createdAt: Date,
    updatedAt: Date,
    totalSavingsGenerated: Number, // cumulated discount amount
    usedByUsers: [{           // tracking
      userId: String,
      orderId: String,
      discountAmount: Number,
      usedAt: Date
    }]
  }
}
// Indexes: { code: 1 } unique, { isActive: 1, expirationDate: 1 }, { isFeatured: 1 }
```

#### `orders`
```js
{
  _id: ObjectId,
  orderCode: String,          // "#3M-XXXXX"
  userId: String,             // Discord ID
  customer: { name, email, discord },
  product: { id, name, price, category },
  payment: {
    method: String,           // "paypal" | "vodafone_cash" | "instapay"
    transactionId: String,
    senderPhone: String,
    proofImageUrl: String,
    status: String            // "pending" | "paid" | "failed" | "refunded"
  },
  coupon: {                   // if coupon was applied
    code: String,
    discountAmount: Number,
    discountType: String,
    originalPrice: Number,
    finalPrice: Number
  },
  status: String,             // "pending" | "progress" | "completed" | "cancelled"
  details: String,
  timeline: [{ status, timestamp, note }],
  createdAt: Date,
  updatedAt: Date
}
```

#### `users`
```js
{
  _id: ObjectId,
  discordId: String,          // unique
  username: String,
  avatar: String,
  email: String,
  role: String,               // "customer" | "vip" | "seller" | "admin"
  stats: {
    totalOrders: Number,
    totalSpent: Number,
    loyaltyPoints: Number,
    currentRank: String       // "bronze" | "silver" | "gold" | "platinum"
  },
  rewards: {
    points: Number,
    vipExpiry: Date,
    referralCode: String,
    referredBy: String
  },
  preferences: {
    lang: String,
    currency: String,
    notifications: Boolean
  },
  createdAt: Date,
  lastLogin: Date
}
```

#### `products` / `services`
```js
{
  _id: ObjectId,
  id: String,                 // "srv-roblox-1"
  category: String,           // "roblox-dev" | "discord-services" | etc.
  name: { ar: String, en: String },
  priceBase: Number,          // USD base price
  desc: { ar: String, en: String },
  features: [String],
  images: [String],
  isActive: Boolean,
  isBestSeller: Boolean,
  isNewArrival: Boolean,
  rating: { average: Number, count: Number },
  metadata: { salesCount: Number, createdAt, updatedAt }
}
```

#### `sections`
```js
{
  _id: ObjectId,
  name: String,               // "hero", "store", "reviews", etc.
  order: Number,              // display order
  isActive: Boolean,
  title: { ar: String, en: String },
  subtitle: { ar: String, en: String },
  settings: Object            // section-specific config
}
```

#### `reviews`
```js
{
  _id: ObjectId,
  userId: String,
  userName: String,
  productId: String,
  orderId: String,
  rating: Number,             // 1-5
  comment: { ar: String, en: String },
  isVerified: Boolean,        // purchased verified
  isApproved: Boolean,
  createdAt: Date
}
```

#### `team_members`
```js
{
  _id: ObjectId,
  name: { ar: String, en: String },
  role: { ar: String, en: String },
  avatar: String,
  skills: [String],
  socialLinks: { discord, twitter, github, linkedin },
  order: Number,
  isActive: Boolean
}
```

#### `blog_posts`
```js
{
  _id: ObjectId,
  slug: String,               // unique
  title: { ar: String, en: String },
  content: { ar: String, en: String },
  excerpt: { ar: String, en: String },
  category: String,           // "roblox" | "discord" | "web" | "news"
  coverImage: String,
  author: String,
  tags: [String],
  publishedAt: Date,
  isPublished: Boolean,
  views: Number
}
```

#### `announcements`
```js
{
  _id: ObjectId,
  type: String,               // "update" | "maintenance" | "promotion"
  title: { ar: String, en: String },
  message: { ar: String, en: String },
  link: String,
  isActive: Boolean,
  expiresAt: Date,
  priority: Number            // display priority
}
```

#### `bookings`
```js
{
  _id: ObjectId,
  userId: String,
  customer: { name, email, discord },
  service: String,
  date: Date,
  timeSlot: String,
  duration: Number,           // minutes
  status: String,             // "pending" | "confirmed" | "cancelled"
  notes: String,
  createdAt: Date
}
```

#### `tickets`
```js
{
  _id: ObjectId,
  userId: String,
  subject: String,
  category: String,
  status: String,             // "open" | "in_progress" | "resolved" | "closed"
  priority: String,           // "low" | "medium" | "high"
  messages: [{
    sender: String,           // userId or "support"
    message: String,
    attachments: [String],
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. API Endpoints

### 6.1 Coupon System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/coupons` | List active coupons (supports `?search=&featured=&page=&limit=`) |
| `GET` | `/api/coupons/:id` | Get single coupon details |
| `POST` | `/api/coupons` | Create coupon (admin only) |
| `PATCH` | `/api/coupons/:id` | Update coupon (admin only) |
| `DELETE` | `/api/coupons/:id` | Delete coupon (admin only) |
| `POST` | `/api/coupons/validate` | Validate coupon code at checkout |
| `GET` | `/api/coupons/stats` | Coupon usage statistics (admin only) |

### 6.2 Order System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orders` | List orders (admin: all, user: own) |
| `POST` | `/api/orders` | Create order (with optional coupon) |
| `GET` | `/api/orders/:id` | Get order details |
| `PATCH` | `/api/orders/:id` | Update order status (admin) |
| `GET` | `/api/orders/stats` | Aggregated order statistics |

### 6.3 User System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Current user profile |
| `PATCH` | `/api/users/me` | Update profile |
| `GET` | `/api/users/me/orders` | User's order history |
| `GET` | `/api/users/me/rewards` | User's rewards & points |
| `GET` | `/api/users/me/dashboard` | User dashboard data |
| `GET` | `/api/users` | List users (admin) |
| `GET` | `/api/users/:id` | Get user (admin) |

### 6.4 Content Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/content/sections` | All sections with content |
| `PATCH` | `/api/content/sections` | Update section order/visibility (admin) |
| `GET` | `/api/content/hero` | Hero section data |
| `GET` | `/api/content/portfolio` | Portfolio items |
| `POST/PUT/DELETE` | `/api/content/portfolio/:id` | Portfolio CRUD (admin) |
| `GET` | `/api/content/team` | Team members |
| `POST/PUT/DELETE` | `/api/content/team/:id` | Team CRUD (admin) |
| `GET` | `/api/content/reviews` | Reviews (with pagination) |
| `POST` | `/api/content/reviews` | Submit review |
| `PUT/DELETE` | `/api/content/reviews/:id` | Review moderation (admin) |
| `GET` | `/api/content/blog` | Blog posts (paginated) |
| `POST/PUT/DELETE` | `/api/content/blog/:id` | Blog CRUD (admin) |
| `GET` | `/api/content/faq` | FAQ items |
| `POST/PUT/DELETE` | `/api/content/faq/:id` | FAQ CRUD (admin) |
| `GET` | `/api/content/announcements` | Active announcements |
| `POST/PUT/DELETE` | `/api/content/announcements/:id` | Announcement CRUD (admin) |

### 6.5 Statistics & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/statistics` | Live statistics data |
| `GET` | `/api/analytics/dashboard` | Admin analytics dashboard |
| `GET` | `/api/analytics/revenue` | Revenue statistics |
| `GET` | `/api/leaderboard` | Customer leaderboard |

### 6.6 Booking & Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/booking` | User's bookings |
| `POST` | `/api/booking` | Create booking |
| `PATCH` | `/api/booking/:id` | Update booking status |
| `GET` | `/api/tickets` | User's tickets |
| `POST` | `/api/tickets` | Create ticket |
| `GET` | `/api/tickets/:id` | Ticket details + messages |
| `POST` | `/api/tickets/:id/messages` | Add message to ticket |

### 6.7 Rewards System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rewards/leaderboard` | Top customers/buyers/spenders |
| `GET` | `/api/rewards/ranks` | Available ranks & thresholds |
| `POST` | `/api/rewards/redeem` | Redeem points for discount |

### 6.8 Existing (Keep & Refactor)

| Method | Endpoint | File |
|--------|----------|------|
| `POST` | `/api/checkout` | `api/checkout.js` → `api/orders/index.js` |
| `POST` | `/api/discord-logger` | `api/discord-logger.js` |
| `GET/POST` | `/api/discord-chat` | `api/discord-chat.js` |
| `POST` | `/api/ai-chat` | `api/ai-chat.js` |
| `GET` | `/api/config` | `api/config.js` |
| `GET/POST` | `/api/admin-orders` | `api/admin-orders.js` → `api/orders/index.js` |
| `GET` | `/api/discord-profile` | `api/discord-profile.js` |

---

## 7. Component Tree

```
<App>
├── <Preloader>
├── <AnnouncementBar>           # scrolling announcements
├── <FeaturedCouponBanner>      # existing top banner
├── <Header>
│   ├── <Logo>
│   ├── <NavMenu>
│   ├── <LanguageSwitcher>
│   ├── <CurrencySwitcher>
│   ├── <DiscordAuth>
│   ├── <SearchBar>
│   └── <HamburgerMenu>
│
├── <Router>                    # SPA hash-based routing
│   │
│   ├── <HomePage>              # Route: #/
│   │   ├── <HeroSection>       # animated, video, particles, stats
│   │   ├── <FeaturedServices>  # slider
│   │   ├── <FeaturedCoupons>   # "أحدث أكواد الخصم"
│   │   ├── <StoreSection>      # services tabs
│   │   ├── <PortfolioSection>
│   │   ├── <WhyChooseUs>
│   │   ├── <StatisticsSection>
│   │   ├── <Testimonials>
│   │   ├── <TeamSection>
│   │   ├── <FAQSection>
│   │   └── <ContactSection>
│   │
│   ├── <StorePage>             # Route: #/store
│   │   ├── <SearchFilter>
│   │   ├── <ProductCategories>
│   │   ├── <BestSellersGrid>
│   │   ├── <NewArrivalsGrid>
│   │   ├── <ProductReviews>
│   │   └── <ProductCard> (repeated)
│   │
│   ├── <RobloxDevPage>         # Route: #/roblox
│   │   ├── <PortfolioGallery>
│   │   ├── <DevPackages>
│   │   └── <CustomQuoteForm>
│   │
│   ├── <DiscordServicesPage>   # Route: #/discord
│   │   ├── <ServiceShowcase>
│   │   └── <RequestForm>
│   │
│   ├── <WebDevPage>            # Route: #/web
│   │   ├── <WebsiteShowcase>
│   │   ├── <PricingPlans>
│   │   └── <WebsiteRequestForm>
│   │
│   ├── <PortfolioPage>         # Route: #/portfolio
│   │   ├── <FilterBar>
│   │   └── <ProjectGallery>
│   │
│   ├── <ReviewsPage>           # Route: #/reviews
│   │   ├── <StarRatingSummary>
│   │   ├── <VerifiedBadge>
│   │   └── <TestimonialSlider>
│   │
│   ├── <TeamPage>              # Route: #/team
│   │   ├── <MemberCard> (repeated)
│   │   └── <SocialLinks>
│   │
│   ├── <CouponsPage>           # NEW Route: #/coupons "العروض والأكواد"
│   │   ├── <SearchBar>
│   │   ├── <CouponCard> (repeated)
│   │   └── <CountdownTimer>
│   │
│   ├── <RewardsPage>           # Route: #/rewards
│   │   ├── <PointsDisplay>
│   │   ├── <RankProgress>
│   │   └── <VIPPerks>
│   │
│   ├── <LeaderboardPage>       # Route: #/leaderboard
│   │   └── <LeaderboardTable>
│   │
│   ├── <BlogPage>              # Route: #/blog
│   │   ├── <BlogCategories>
│   │   └── <BlogPostCard> (repeated)
│   │
│   ├── <BlogPostPage>          # Route: #/blog/:slug
│   │
│   ├── <FAQPage>               # Route: #/faq
│   │   ├── <SearchFAQ>
│   │   ├── <CategoryTabs>
│   │   └── <FAQItem> (repeated)
│   │
│   ├── <UserDashboard>         # Route: #/dashboard
│   │   ├── <OrderHistory>
│   │   ├── <AccountSettings>
│   │   ├── <SavedServices>
│   │   ├── <Notifications>
│   │   └── <DiscordProfile>
│   │
│   ├── <SellerDashboard>       # Route: #/seller
│   │   ├── <ProductsManager>
│   │   ├── <OrdersManager>
│   │   ├── <AnalyticsWidget>
│   │   └── <RevenueStats>
│   │
│   ├── <BookingPage>           # Route: #/booking
│   │   ├── <CalendarPicker>
│   │   ├── <TimeSlotPicker>
│   │   └── <BookingForm>
│   │
│   └── <TicketPage>            # Route: #/tickets
│       ├── <TicketList>
│       └── <TicketDetail>
│
├── <Footer>
├── <LiveChatWidget>
├── <BackToTop>
├── <CheckoutModal>             # Purchase flow
│   └── <CouponInput>           # Apply coupon during checkout
├── <AdminPanel>                # Hidden, shown on auth
│   ├── <AdminToolbar>
│   ├── <AdminSidePanel>
│   ├── <ProductsManagerModal>
│   ├── <OrdersManagerModal>
│   ├── <CouponManagerModal>    # NEW
│   ├── <UsersManagerModal>
│   ├── <BlogManagerModal>
│   ├── <AnalyticsDashboard>
│   ├── <RevenueDashboard>
│   ├── <EmailManager>
│   └── <NotificationManager>
└── <ToastsContainer>
```

---

## 8. State Management

### 8.1 Store Architecture

```js
// src/core/store.js
const store = {
  // Global state
  app: {
    lang: 'ar',
    currency: 'EGP',
    adminMode: false,
    isLoggedIn: false,
    user: null,
    loading: false
  },
  
  // Domain state
  coupons: {
    list: [],
    featured: [],
    applied: null,          // currently applied coupon
    loading: false,
    error: null
  },
  
  products: {
    byCategory: {},
    bestSellers: [],
    newArrivals: [],
    loading: false
  },
  
  orders: {
    list: [],
    current: null,
    loading: false
  },
  
  content: {
    sections: [],
    portfolio: [],
    team: [],
    reviews: [],
    blog: [],
    faq: [],
    announcements: []
  },
  
  statistics: {
    totalOrders: 0,
    activeCustomers: 0,
    completedProjects: 0,
    discordMembers: 0,
    robloxProjects: 0
  },
  
  // UI state
  ui: {
    modals: {},
    toasts: [],
    chatOpen: false,
    searchOpen: false
  }
};
```

### 8.2 Event Bus

```js
// src/core/event-bus.js
// Events:
// - 'coupon:applied'    { code, discount }
// - 'coupon:removed'    {}
// - 'auth:login'        { user }
// - 'auth:logout'       {}
// - 'lang:changed'      { lang }
// - 'currency:changed'  { currency }
// - 'cart:updated'      { items }
// - 'order:created'     { order }
// - 'order:updated'     { order }
// - 'section:reordered' { sections }
// - 'admin:mode'        { enabled }
// - 'notification:new'  { notification }
```

### 8.3 Data Flow for Coupon Application

```
User enters coupon code in checkout
    ↓
Validate locally (format check)
    ↓
POST /api/coupons/validate { code, orderTotal, userId }
    ↓
Server checks:
  - Does coupon exist in MongoDB?
  - Is it active? (isActive, expirationDate)
  - Has it exceeded maxUses?
  - Does user meet conditions? (firstOrder, vip, etc.)
  - Is order total >= minPurchase?
    ↓
Response: { valid: true/false, discount: {...}, error?: "..." }
    ↓
If valid:
  - Update store.coupons.applied
  - Recalculate price in checkout UI
  - Emit 'coupon:applied' event
  - Update order total display in real-time
    ↓
If invalid:
  - Show error toast
  - Clear coupon input
```

---

## 9. Coupon System Design (Detailed)

### 9.1 Coupon Types

| Type | Example | Calculation |
|------|---------|-------------|
| `percentage` | 20% off | `price * (value / 100)` |
| `fixed` | 50 EGP off | `price - value` |
| `free_shipping` | Free delivery | Only applicable if shipping exists |
| `bogo` | Buy 1 Get 1 | Applied at product level |

### 9.2 Coupon Conditions

```
Conditions Schema:
{
  firstOrderOnly: boolean,       // Coupon valid only for user's first order
  vipOnly: boolean,              // Only for VIP-ranked users
  seasonalTag: string,           // "summer", "ramadan", "black-friday"
  referralCode: string,          // Must be used with referral program
  applicableCategories: string[], // ["roblox-dev", "discord-services"]
  applicableProductIds: string[], // specific products
  excludedProductIds: string[],   // products to exclude
  minPurchase: number,           // minimum cart total
  maxDiscountAmount: number,     // cap for percentage discounts
  stackable: boolean,            // can stack with other coupons
  maxUsesPerUser: number,        // limit per user
  daysAfterRegistration: number  // usable only within X days of signup
}
```

### 9.3 Coupon UI Components

#### `<CouponCard>` (reusable)
```
┌──────────────────────────────────┐
│  🎟️ 3M20                         │ ← code
│  20% off all Roblox services     │ ← description
│  ⏱️ ينتهي خلال 2d 14h 30m       │ ← countdown timer
│  [📋 نسخ الكود] [×]              │ ← copy button + dismiss
│  🔥 متاح لـ 15 من 20 استخدم      │ ← usage progress
└──────────────────────────────────┘
```

#### `<CouponInput>` (checkout integration)
```
┌─────────────────────────────────────┐
│ [🎟️ أدخل كود الخصم...] [تطبيق]     │
│                                     │
│ ✅ تم تطبيق الكود! خصم 20%          │
│ السعر الأصلي: 500 EGP              │
│ الخصم:        -100 EGP             │
│ ─────────────────────              │
│ المجموع:      400 EGP              │
└─────────────────────────────────────┘
```

#### `<PublicCouponsPage>` (Route: #/coupons)
- Grid of active coupons
- Search/filter by code or description
- Each card: code, discount %, description, expiry, copy button
- Featured coupon hero card at top
- Category filter tabs

#### `<FeaturedCouponSection>` (Homepage)
- Horizontal scroll of featured coupons
- Countdown timers
- Copy code buttons
- "Limited time" badges

### 9.4 Admin Coupon Manager

```
┌────────────────────────────────────────────────────────┐
│  [🔍 بحث] [➕ إنشاء كوبون]                              │
│                                                         │
│  ┌──────┬────────┬──────────┬────────┬────────┬──────┐ │
│  │ كود  │ الخصم  │ الاستخدام│ الصلاحية│ الحالة │خيارات│ │
│  ├──────┼────────┼──────────┼────────┼────────┼──────┤ │
│  │3M20  │ 20%    │ 15/20    │2026-07-│ 🟢 نشط │ ✏️ 🗑️ │ │
│  │      │        │          │ 15     │        │      │ │
│  │VIP10 │10% VIP │ 5/50     │2026-12-│ 🟢 نشط │ ✏️ 🗑️ │ │
│  │      │        │          │ 31     │        │      │ │
│  └──────┴────────┴──────────┴────────┴────────┴──────┘ │
│                                                         │
│  إحصائيات الكوبونات:                                    │
│  • إجمالي الخصومات المقدمة: 12,450 EGP                 │
│  • عدد مرات استخدام الكوبونات: 234                      │
│  • الكوبون الأكثر استخدامًا: 3M20 (15 مرة)              │
└────────────────────────────────────────────────────────┘
```

### 9.5 Coupon Validation Algorithm

```
function validateCoupon(code, userId, orderTotal, productCategories):
  1. Find coupon by code in MongoDB
  2. If not found → return { valid: false, error: "كود غير صحيح" }
  3. If !isActive → return { valid: false, error: "هذا الكود غير مفعل" }
  4. If expirationDate < now → return { valid: false, error: "انتهت صلاحية هذا الكود" }
  5. If usedCount >= maxUses → return { valid: false, error: "تم استنفاذ عدد استخدامات هذا الكود" }
  6. If firstOrderOnly AND user has previous orders → invalid
  7. If vipOnly AND user.role !== "vip" → invalid
  8. If minPurchase > orderTotal → return { valid: false, error: "لم يتم الوصول للحد الأدنى للطلب" }
  9. If applicableCategories.length > 0 AND no intersection with order categories → invalid
  10. If maxUsesPerUser AND userUsageCount >= maxUsesPerUser → invalid
  11. If maxDiscountAmount → cap the discount
  12. Calculate discount based on type (percentage/fixed)
  13. Return { valid: true, discount: { type, amount, finalPrice } }
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up build tooling, database, and modular architecture

- [ ] 1.1 Initialize `package.json` with Vite
- [ ] 1.2 Set up `vite.config.js`
- [ ] 1.3 Set up MongoDB Atlas cluster + connection in `api/_lib/db.js`
- [ ] 1.4 Create folder structure (`src/`, `api/_lib/`, etc.)
- [ ] 1.5 Create core modules: `event-bus.js`, `store.js`, `i18n.js`, `api-client.js`
- [ ] 1.6 Split `style.css` → `variables.css`, `reset.css`, `animations.css`, per-section CSS
- [ ] 1.7 Split `app.js` → core modules; keep existing functions working
- [ ] 1.8 Implement SPA hash router (`src/router/`)
- [ ] 1.9 Migrate existing orders from Discord to MongoDB (script)
- [ ] 1.10 Create admin JWT auth flow (replace localStorage password)

### Phase 2: Core Infrastructure (Weeks 3-4)
**Goal**: All backend API endpoints operational

- [ ] 2.1 `api/products/` - Product CRUD + categories
- [ ] 2.2 `api/orders/` - Order CRUD, status management, stats
- [ ] 2.3 `api/users/` - User CRUD, dashboard, settings
- [ ] 2.4 `api/content/` - Sections, portfolio, team, reviews, FAQ, announcements
- [ ] 2.5 `api/statistics/` - Live stats aggregation
- [ ] 2.6 `api/booking/` - Booking CRUD
- [ ] 2.7 `api/tickets/` - Ticket CRUD + messaging
- [ ] 2.8 `api/rewards/` - Points, ranks, leaderboard
- [ ] 2.9 `api/analytics/` - Dashboard + revenue endpoints
- [ ] 2.10 `api/_lib/auth.js` - JWT middleware for admin routes

### Phase 3: Coupon System (Week 5)
**Goal**: Full coupon lifecycle working end-to-end

- [ ] 3.1 `api/coupons/` - CRUD + validation endpoint
- [ ] 3.2 Coupon data model in MongoDB + indexes
- [ ] 3.3 `src/sections/coupon/coupon.js` - Core validation logic (replicated client-side for speed)
- [ ] 3.4 `src/sections/coupon/coupon-card.js` - Reusable card component
- [ ] 3.5 `src/sections/coupon/public-coupons.js` - Public coupons page
- [ ] 3.6 `src/sections/coupon/featured-coupons.js` - Homepage featured section
- [ ] 3.7 Coupon input in checkout modal (`checkout.js`)
- [ ] 3.8 Admin coupon manager (`admin/coupon-manager.js`)
- [ ] 3.9 Coupon statistics, usage tracking
- [ ] 3.10 Special coupons: first-order, VIP, seasonal, referral

### Phase 4: Premium Sections (Weeks 6-8)
**Goal**: Build all ~25 premium sections

- [ ] 4.1 **Hero** - Background video, floating particles, animated counters, featured slider
- [ ] 4.2 **Store** - Search/filter, categories, ratings/reviews, best sellers, new arrivals
- [ ] 4.3 **Roblox Dev** - Portfolio, game screenshots, packages, quote form
- [ ] 4.4 **Discord Services** - Server setup, bots, security, verification, tickets, moderation
- [ ] 4.5 **Web Dev** - Showcase, pricing plans, features list, request form
- [ ] 4.6 **Portfolio** - Gallery, before/after, videos, categories
- [ ] 4.7 **Reviews** - Customer reviews, star ratings, verified badge, auto-slider
- [ ] 4.8 **Team** - Member cards, roles, skills, social links
- [ ] 4.9 **Live Statistics** - Animated counters (orders, customers, projects, members)
- [ ] 4.10 **Rewards** - Loyalty points, ranks, VIP rewards, discount coupons
- [ ] 4.11 **Leaderboard** - Top customers, buyers, spenders
- [ ] 4.12 **Ticket System** - Create ticket, track status, live dashboard
- [ ] 4.13 **Live Chat** - Refactor existing, add Discord integration
- [ ] 4.14 **Booking** - Schedule meetings, date/time picker
- [ ] 4.15 **Blog** - Tutorials, guides, news, categories
- [ ] 4.16 **FAQ** - Searchable, categories, expandable (refactor existing)
- [ ] 4.17 **Announcements** - Updates, maintenance notices, promotions
- [ ] 4.18 **User Dashboard** - Order history, settings, saved services, notifications
- [ ] 4.19 **Seller Dashboard** - Products, orders, analytics, revenue

### Phase 5: Admin Dashboard (Week 9)
**Goal**: Complete admin panel with all management features

- [ ] 5.1 Live Edit Everything (refactor existing)
- [ ] 5.2 Product Manager (refactor existing)
- [ ] 5.3 User Manager (new)
- [ ] 5.4 Order Manager (refactor existing)
- [ ] 5.5 Blog Manager (new)
- [ ] 5.6 Coupon Manager (new - from Phase 3)
- [ ] 5.7 Analytics Dashboard (new)
- [ ] 5.8 Revenue Dashboard (new)
- [ ] 5.9 Email Manager (refactor existing SMTP logs)
- [ ] 5.10 Notification Manager (new)

### Phase 6: Payment Integration (Week 10)
**Goal**: Real payment processing

- [ ] 6.1 PayPal REST API integration (real, not mock)
- [ ] 6.2 Vodafone Cash webhook verification
- [ ] 6.3 InstaPay verification flow
- [ ] 6.4 Credit card via Stripe integration
- [ ] 6.5 Payment reconciliation dashboard

### Phase 7: Polish & Performance (Week 11)
**Goal**: Production-ready quality

- [ ] 7.1 Lazy loading for sections (intersection observer)
- [ ] 7.2 Code splitting by route (Vite dynamic imports)
- [ ] 7.3 Image optimization (WebP, lazy loading)
- [ ] 7.4 Animation performance (GPU-accelerated, `will-change`)
- [ ] 7.5 Accessibility audit (ARIA labels, keyboard nav, contrast)
- [ ] 7.6 SEO meta tags per page
- [ ] 7.7 Arabic RTL polish pass
- [ ] 7.8 Mobile responsive pass for all new sections
- [ ] 7.9 Loading states and skeletons

### Phase 8: Testing & Deployment (Week 12)
**Goal**: Ship with confidence

- [ ] 8.1 Unit tests: coupon validation, i18n, state management
- [ ] 8.2 Integration tests: API endpoints (coupons, orders, auth)
- [ ] 8.3 E2E test: checkout flow with coupon application
- [ ] 8.4 Load test: MongoDB query performance
- [ ] 8.5 Security audit: rate limiting, input sanitization, JWT
- [ ] 8.6 Production deployment on Vercel
- [ ] 8.7 Monitoring setup (Vercel analytics + Discord alerts)
- [ ] 8.8 Documentation (API reference, admin guide)

---

## 11. Migration Strategy

### 11.1 Data Migration

| Source | Destination | Strategy |
|--------|-------------|----------|
| Discord embed orders | MongoDB `orders` collection | One-time script reads all Discord messages, parses embeds, creates documents |
| localStorage state | MongoDB `sections` collection | Initial seed from DEFAULT_STATE in app.js |
| localStorage leads | MongoDB `tickets` collection | Migrate contact form submissions to ticket format |
| localStorage orders | MongoDB `orders` collection | Merge with Discord-migrated orders |

### 11.2 Code Migration

| Source | Destination | Strategy |
|--------|-------------|----------|
| `app.js` (lines 1-504) DEFAULT_STATE | `src/core/constants.js` + MongoDB seed | Extract static content, seed to DB |
| `app.js` (lines 505-780) Init functions | `src/core/state.js`, `src/core/store.js` | Extract state management logic |
| `app.js` (lines 808-1123) Render functions | Per-section files in `src/sections/*/` | Move renderServices → store.js, renderPortfolio → portfolio.js, etc. |
| `app.js` (lines 1125-1440) Admin/editor logic | `src/sections/admin/*` | Split into admin submodules |
| `app.js` (lines 1440-2050) Auth/Modal/Form logic | `src/core/auth.js`, `src/sections/checkout/` | Extract auth, purchase flow |
| `app.js` (lines 2050-4081) Event handlers + chat + cursor | `src/sections/live-chat/`, `src/core/` | Keep as modules, wire through event bus |
| `style.css` variables | `src/styles/variables.css` | Keep exactly as-is |
| `style.css` section styles | Per-section CSS files | Split by section, import via JS |

### 11.3 Deployment Strategy

1. **Phase 1-2**: Deploy alongside existing site (new `/api/` endpoints work in parallel)
2. **Phase 3**: Coupon system goes live; existing checkout gets coupon input
3. **Phase 4-5**: New sections deployed; old `index.html` sections remain unchanged
4. **Phase 6-7**: Gradual replacement; old app.js sections redirect to new modular versions
5. **Final**: Old monolithic files removed; full Vite build deployed

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Admin password in localStorage | Replace with JWT tokens (httpOnly cookie) |
| Coupon code brute-force | Rate limit `/api/coupons/validate` (5 req/min per IP) |
| Coupon overuse | Track `usedByUsers` array; enforce `maxUses` per user |
| Order tampering | Server-side price validation; never trust client price |
| XSS | Sanitize all user input, no `innerHTML` with user data |
| CSRF | SameSite cookies, token in POST headers |
| Discord token exposure | Tokens in Vercel env vars, never client-side |
| MongoDB injection | Use `mongodb` driver with parameterized queries |
| Rate limiting | Vercel WAF + custom rate limit middleware |
| Audit trail | All admin actions: `POST /api/analytics/audit-log` |

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.0s |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 85 |
| Lighthouse SEO | ≥ 95 |
| Bundle size (initial) | < 200 KB gzip |
| API response time (coupon validation) | < 200ms |
| API response time (content fetch) | < 300ms |

---

## Appendix A: Key NPM Dependencies (Phase 1)

```json
{
  "devDependencies": {
    "vite": "^5.x",
    "@playwright/test": "^1.x",
    "vitest": "^1.x"
  },
  "dependencies": {
    "mongodb": "^6.x",
    "jsonwebtoken": "^9.x",
    "uuid": "^9.x"
  }
}
```

The existing API serverless functions remain dependency-free for cold-start performance. Only `api/_lib/db.js` needs the `mongodb` driver.

---

## Appendix B: Routes Map

| Hash Route | Page | Sections |
|------------|------|----------|
| `#/` | Home | Hero, FeaturedServices, FeaturedCoupons, Store, Portfolio, WhyUs, Stats, Testimonials, Team, FAQ, Contact |
| `#/store` | Store | Search, Categories, Products, Reviews, BestSellers, NewArrivals |
| `#/roblox` | Roblox Dev | Portfolio, Packages, QuoteForm |
| `#/discord` | Discord Services | ServerSetup, Bots, Security, Tickets, Moderation |
| `#/web` | Web Dev | Showcase, Pricing, RequestForm |
| `#/portfolio` | Portfolio | Gallery, Filters, Before/After |
| `#/reviews` | Reviews | All reviews, star summary |
| `#/coupons` | العروض والأكواد | All coupons, search, featured |
| `#/rewards` | Rewards | Points, ranks, VIP |
| `#/leaderboard` | Leaderboard | Top customers, buyers |
| `#/blog` | Blog | Posts, categories |
| `#/blog/:slug` | Blog Post | Single post |
| `#/faq` | FAQ | Search, categories, items |
| `#/booking` | Booking | Calendar, time slots |
| `#/dashboard` | User Dashboard | Orders, settings, saved |
| `#/seller` | Seller Dashboard | Products, orders, analytics |
| `#/admin` | Admin Panel | All management dashboards |

---

## Appendix C: Coupon System State Diagram

```
                         ┌──────────────┐
                         │  Coupon Created│
                         │  (isActive: F) │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                    ┌───▶│  isActive: T  │◀───┐
                    │    └──────┬───────┘    │
                    │           │            │
                    │           ▼            │
                    │    ┌──────────────┐    │
                    │    │   Max uses    │    │ Admin
                    │    │   reached?    │───┤ toggles
                    │    └──────┬───────┘    │ active
                    │           │            │
                    │     No    ▼  Yes       │
                    │    ┌──────────────┐    │
                    │    │  Expired?    │── yes
                    │    └──────┬───────┘    │
                    │           │            │
                    │          No            │
                    │           ▼            │
                    │    ┌──────────────┐    │
                    │    │   Can be     │    │
                    │    │   applied    │────┘
                    │    └──────────────┘
                    │           │
                    │    User applies at checkout
                    │           ▼
                    │    ┌──────────────┐
                    │    │  Validate    │
                    │    │  conditions  │
                    │    └──────┬───────┘
                    │      ✔    │    ✘
                    │     ┌─────┴──────┐
                    │     ▼            ▼
                    │  ┌────────┐ ┌────────┐
                    │  │Applied │ │Rejected│
                    │  │Discount│ │(error) │
                    │  └───┬────┘ └────────┘
                    │      │
                    │  Order completed
                    │      │
                    │      ▼
                    │  ┌──────────────┐
                    └──┤ usedCount++  │
                       │ savings+= X │
                       └──────────────┘
```
