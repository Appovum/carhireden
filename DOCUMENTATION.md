# CouponPilot — Documentation

**Version 1.0.0** · Last updated: August 2026

---

> **CouponPilot** is a production-grade coupon, cashback and affiliate monetization platform built on **Next.js 16**, **TypeScript**, **Prisma + PostgreSQL**, and **Tailwind CSS 4**. Connect your affiliate accounts, run one sync, and your site populates with live offers — no manual entry, no fake demo data.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
   - [Option A — Docker Compose (VPS)](#option-a--docker-compose-vps-recommended)
   - [Option B — Vercel + Managed Postgres](#option-b--vercel--managed-postgres)
   - [Option C — Manual Node.js Setup](#option-c--manual-nodejs-setup)
4. [Web Installer](#4-web-installer)
5. [Environment Variables](#5-environment-variables)
6. [Admin Panel](#6-admin-panel)
   - [Dashboard](#61-dashboard)
   - [Stores Management](#62-stores-management)
   - [Coupons Management](#63-coupons-management)
   - [Categories](#64-categories)
   - [Networks & Import Sources](#65-networks--import-sources)
   - [Earnings & Analytics](#66-earnings--analytics)
   - [Users & Roles](#67-users--roles)
   - [Withdrawals](#68-withdrawals)
   - [Missing-Cashback Claims](#69-missing-cashback-claims)
   - [Ad Slots & Creatives](#610-ad-slots--creatives)
   - [Featured Orders](#611-featured-orders)
   - [Pages & Content](#612-pages--content)
   - [Alerts & Notifications](#613-alerts--notifications)
   - [Referral Programme](#614-referral-programme)
   - [Settings](#615-settings)
   - [i18n & Translations](#616-i18n--translations)
   - [Audit Log](#617-audit-log)
7. [Affiliate Network Setup](#7-affiliate-network-setup)
   - [Awin](#71-awin)
   - [CJ Affiliate](#72-cj-affiliate)
   - [Adding Custom Networks](#73-adding-custom-networks)
8. [Click Tracking & Attribution](#8-click-tracking--attribution)
9. [Cashback Engine](#9-cashback-engine)
10. [Self-Serve Ad Sales](#10-self-serve-ad-sales)
11. [Advertiser Portal](#11-advertiser-portal)
12. [Payment Gateways](#12-payment-gateways)
13. [SEO Features](#13-seo-features)
14. [Notifications](#14-notifications)
15. [Scheduled Jobs (Cron)](#15-scheduled-jobs-cron)
16. [Security](#16-security)
17. [GDPR & Privacy](#17-gdpr--privacy)
18. [Feed Normalization](#18-feed-normalization)
19. [Theming & Customization](#19-theming--customization)
20. [API Reference](#20-api-reference)
21. [Troubleshooting](#21-troubleshooting)
22. [Support & License](#22-support--license)

---

## 1. Introduction

CouponPilot is built for **solo entrepreneurs** and **small teams** who want to run a professional coupon and cashback website that earns real affiliate commissions — without writing code.

### What makes it different

| Feature | CouponPilot | Typical coupon scripts |
|---|---|---|
| Live affiliate sync | ✅ Awin + CJ built in | ❌ Manual entry only |
| Commission tracking | ✅ Per-click, per-coupon | ❌ No attribution |
| Cashback wallets | ✅ Append-only ledger | ❌ Mutable balances |
| Self-serve ad sales | ✅ Stripe + PayPal | ❌ Not included |
| Feed normalization | ✅ Automated cleanup | ❌ Raw data shown |
| Bot filtering | ✅ UA + rate limit | ❌ No filtering |
| Dark mode | ✅ System-aware | ❌ Not available |

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Prisma ORM |
| Styling | Tailwind CSS 4 |
| Payments | Stripe + PayPal |
| Auth | Session cookies + Google OAuth |
| Encryption | AES-256-GCM at rest |
| Deployment | Docker, Vercel, or any Node.js host |

---

## 2. Requirements

### Minimum Server Requirements

| Requirement | Minimum |
|---|---|
| **Node.js** | v20.x or later |
| **PostgreSQL** | 14+ (or use Neon / Supabase managed) |
| **RAM** | 1 GB (2 GB recommended) |
| **Disk** | 1 GB free space |
| **OS** | Ubuntu 22.04 LTS, Debian 12, macOS, or Windows with WSL |

### For Docker Deployment

| Requirement | Version |
|---|---|
| Docker | 24.x+ |
| Docker Compose | v2.x+ |

### For Vercel Deployment

- A Vercel account (free tier works)
- A managed PostgreSQL provider (Neon, Supabase, or Vercel Postgres)

---

## 3. Installation

### Option A — Docker Compose (VPS) — Recommended

This is the simplest deployment path. One command spins up both the app and PostgreSQL.

**Step 1 — Clone the repository**

```bash
git clone <your-repo-url> couponpilot
cd couponpilot
```

**Step 2 — Configure environment**

```bash
cp .env.example .env
```

Open `.env` in any editor and update:

| Variable | What to set |
|---|---|
| `APP_SECRET` | A random 32+ character string (your master encryption key) |
| `NEXT_PUBLIC_APP_URL` | Your domain, e.g. `https://coupons.example.com` |

> **⚠️ Important:** Never share your `APP_SECRET`. All sensitive data (network API keys, payout details) is encrypted with this key using AES-256-GCM.

**Step 3 — Launch**

```bash
docker compose up -d --build
```

This starts:
- **`app`** — CouponPilot on port `3000`
- **`db`** — PostgreSQL 16 on port `5432`

**Step 4 — Initialize database**

```bash
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed
```

**Step 5 — Open the installer**

Navigate to `http://your-server-ip:3000/install` in your browser.

---

### Option B — Vercel + Managed Postgres

**Step 1 — Create a database**

Sign up for [Neon](https://neon.tech) or [Supabase](https://supabase.com) and create a PostgreSQL database. Copy the connection string.

**Step 2 — Deploy to Vercel**

Import the CouponPilot codebase into Vercel and set these environment variables in the Vercel Dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `APP_SECRET` | A random 32+ character string |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain URL |
| `CRON_SECRET` | A random bearer token for cron endpoints |

**Step 3 — Initialize database**

From your terminal or via Vercel's build command:

```bash
npx prisma db push
```

**Step 4 — Run the installer**

Navigate to `https://your-app.vercel.app/install`.

---

### Option C — Manual Node.js Setup

**Step 1 — Install dependencies**

```bash
npm install
```

**Step 2 — Configure environment**

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

**Step 3 — Generate Prisma client and push schema**

```bash
npx prisma generate
npx prisma db push
```

**Step 4 — Seed demo data (optional)**

```bash
npx prisma db seed
```

**Step 5 — Build and start**

```bash
npm run build
npm start
```

**Step 6 — Open the installer**

Navigate to `http://localhost:3000/install`.

---

## 4. Web Installer

The web installer (`/install`) is a guided setup wizard that runs on first visit:

1. **Requirements check** — Validates database connection and Node.js version
2. **Admin account creation** — Create your owner account with email and password
3. **Site branding** — Set your site name, logo, and primary colors
4. **Affiliate setup** — Optionally connect Awin or CJ right away
5. **Demo data** — Import seed data to see the site in action immediately

Once complete, you'll be redirected to the admin dashboard at `/admin`.

> **Note:** The installer page is automatically disabled after setup is complete. It cannot be accessed again unless you reset the `installed` setting in the database.

---

## 5. Environment Variables

All environment variables are documented in the `.env.example` file. Here is a complete reference:

### Core (Required)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/couponpilot` |
| `APP_SECRET` | Master encryption key (32+ chars) | `your_32_byte_master_secret_here` |
| `NEXT_PUBLIC_APP_URL` | Public URL of your site | `https://coupons.example.com` |
| `CRON_SECRET` | Bearer token for cron API routes | `your_cron_auth_token` |

### Google OAuth (Optional)

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

> **Tip:** Google OAuth can also be configured from the Admin Settings page without touching `.env`.

### Stripe (For Ad Sales)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | From `dashboard.stripe.com/apikeys` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public key for client-side checkout |
| `STRIPE_WEBHOOK_SECRET` | From `dashboard.stripe.com/webhooks` |

### PayPal (For Ad Sales)

| Variable | Description |
|---|---|
| `PAYPAL_CLIENT_ID` | From `developer.paypal.com` |
| `PAYPAL_CLIENT_SECRET` | From `developer.paypal.com` |
| `PAYPAL_MODE` | `sandbox` for testing, `live` for production |

### Affiliate Networks — Awin & CJ

You can enter these either in **Admin → Networks** (stored encrypted in the database, recommended) or in `.env`. Values saved in the Admin UI take precedence over the env vars.

| Variable | Description |
|---|---|
| `AWIN_API_KEY` | Awin API token — `ui.awin.com` → Toolbox → API credentials |
| `AWIN_PUBLISHER_ID` | Your Awin publisher (affiliate) ID |
| `CJ_PERSONAL_ACCESS_TOKEN` | CJ Personal Access Token — `developers.cj.com` → Personal Access Tokens |
| `CJ_PUBLISHER_ID` | Your CJ publisher CID |
| `ENABLE_LIVE_AFFILIATE_LINKS` | `true` to send real affiliate redirects. Keep `false` until your publisher IDs are set — with no ID configured, outgoing links use a `YOUR_…_PUBLISHER_ID` placeholder and will not track. |

### Telegram (Optional)

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Channel or group chat ID |

### SMTP Email Transport (For Transactional & Reset Emails)

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | Hostname of your SMTP mail server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port number | `465` (SSL) or `587` (TLS) |
| `SMTP_SECURE` | Set `true` for SSL (port 465), `false` for TLS (port 587) | `true` |
| `SMTP_USER` | Email account username / sender address | `you@example.com` |
| `SMTP_PASS` | SMTP password or App Password | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Display sender name and email format | `CouponPilot <you@example.com>` |


---

## 6. Admin Panel

The admin panel is available at `/admin` and is restricted to users with the `admin` role. It provides a comprehensive management interface for every aspect of your site.

### 6.1 Dashboard

The dashboard shows a real-time overview of your site:

- **Revenue cards** — Clicks, conversions, gross commission, net profit
- **90-day analytics** — Interactive charts with period selectors
- **Top earning stores** — Ranked by commission with visual bars
- **Action queues** — Pending withdrawals, claims, and orders requiring attention
- **Import health** — Last sync times and error counts per source
- **Activity feed** — Recent admin actions from the audit log

### 6.2 Stores Management

| Feature | Description |
|---|---|
| **CRUD** | Create, edit, and delete stores |
| **Logo upload** | Upload or auto-fetch domain favicons |
| **Network mapping** | Link each store to its affiliate network merchant ID |
| **Cashback rates** | Set per-store cashback percentage |
| **Featured toggle** | Mark stores as featured with an expiry date |
| **Bulk actions** | Activate, deactivate, or delete multiple stores at once |
| **Category assignment** | Assign stores to one or more categories |
| **SEO overrides** | Custom meta title and description per store |

### 6.3 Coupons Management

| Feature | Description |
|---|---|
| **List view** | Filterable by store, status, type, and date |
| **Inline editing** | Quick edit code, title, and discount directly in the table |
| **Manual creation** | Add coupons manually for stores without a network feed |
| **Bulk operations** | Approve, expire, or delete selected coupons |
| **Import status** | View which coupons came from which import source |
| **Success rate** | Community-driven voting statistics per coupon |
| **Types** | Code, Deal, or Cashback |
| **Statuses** | Active, Expiring, Expired, Draft, Rejected |

### 6.4 Categories

- Hierarchical categories with parent/child relationships
- Drag-and-drop reordering
- Icon selection per category
- SEO meta fields per category
- Automatic store count

### 6.5 Networks & Import Sources

**Networks** represent affiliate platforms (Awin, CJ, etc.). Each has:

- **Display name** and slug
- **Encrypted API credentials** — stored with AES-256-GCM
- **Link template** — with live URL preview using template variables
- **Enable/disable toggle**
- **Credential test button** — Verify your API keys work before syncing

**Import Sources** are feeds linked to a network:

- **Schedule** — Enable auto-sync on a per-source cron schedule
- **Run Now** — Trigger a manual sync
- **Dry-run preview** — See what would be imported without committing
- **Run history** — View past import runs with counts and error logs

### 6.6 Earnings & Analytics

The earnings dashboard aggregates real commission data from your affiliate networks:

- **Date range picker** — Filter by custom date ranges
- **Key metrics** — Clicks, conversions, EPC (earnings per click), total commission
- **Breakdown views** — By store, by coupon, by category, by day
- **Top earners** — Which stores and coupons generate the most revenue
- **Unattributed share** — Conversions that couldn't be matched to a specific click
- **Export** — Download reports as CSV

### 6.7 Users & Roles

| Role | Capabilities |
|---|---|
| `admin` | Full access to all admin features |
| `user` | Public site access, cashback wallet, alerts |

User management features:
- Search and filter users
- Change roles
- View user's wallet ledger
- Manual balance adjustments with audit trail
- View user's click and conversion history

### 6.8 Withdrawals

The withdrawal queue lets you manage user cashback payout requests:

- **Queue view** — Pending requests sorted by date
- **Approve / Reject** — With optional admin notes
- **Mark as paid** — Record payment reference number
- **Bulk export** — Download pending payouts for batch processing
- **Automatic ledger entries** — Written on approval, not on request

### 6.9 Missing-Cashback Claims

When users believe they earned cashback that isn't showing:

- **Claim queue** — Users submit claims tied to their real click history
- **Admin review** — See the user's clicks, purchases, and timeline
- **Resolve** — Credit the cashback or reject with an explanation
- **Email notifications** — Users are notified on every status change

### 6.10 Ad Slots & Creatives

CouponPilot includes a built-in advertising system:

**Ad Slots** — Define placement positions across your site:
- Header banner
- Sidebar
- In-feed slots
- Store page placements

**Ad Creatives** — Create ads for each slot:
- **Image ads** — Upload artwork with target URL
- **Google AdSense** — Paste your AdSense code
- **Custom HTML** — For any third-party ad scripts

Each creative tracks **impressions**, **clicks**, and **CTR** automatically.

### 6.11 Featured Orders

Manage advertiser-purchased placements:

- **Incoming orders** — View payment status and campaign details
- **Approve / Reject** — Review artwork before going live
- **Schedule** — Set start and end dates
- **Campaign status tracking** — Awaiting creative → Pending review → Scheduled → Live → Completed
- **Refund management** — Process refunds when needed

### 6.12 Pages & Content

- **Static pages** — Create and edit pages like About, Privacy, Terms
- **Menu builder** — Organize navigation links
- **Blog CMS** — Publish articles to drive SEO traffic

### 6.13 Alerts & Notifications

- **Deal alerts** — Users subscribe to stores or categories
- **Admin controls** — Enable/disable alert channels globally
- **Email digest** — Weekly deal digest with user preferences

### 6.14 Referral Programme

- Each user gets a unique referral code
- **$5 bonus** for referrers when their referred user's first cashback confirms
- **Referral tracking** — View referral chains and bonus history in admin
- **Configurable bonus amounts** in settings

### 6.15 Settings

All site configuration is managed from the admin UI:

| Category | Settings |
|---|---|
| **General** | Site name, logo, tagline, currency, timezone |
| **Branding** | Colors, fonts, custom CSS |
| **SEO** | Meta templates with variables, robots.txt overrides |
| **Cashback** | Global cashback percentage, minimum withdrawal threshold |
| **Email** | SMTP host, port, sender address, adapter selection |
| **Social** | Telegram bot config, social media links |
| **Legal** | Affiliate disclosure text, cookie consent settings |
| **Payments** | Stripe and PayPal configuration |
| **Networks** | Awin and CJ credentials (also configurable per-network) |

> **Key principle:** Everything configurable lives in the database, editable from admin — not in `.env`. Only secrets bootstrap from environment variables.

### 6.16 i18n & Translations

- Full internationalisation string manager
- Export and import translation files
- Support for multiple languages

### 6.17 Audit Log

Every admin action is logged with:

- **Actor** — Which admin performed the action
- **Action** — What was done (create, update, delete, approve, etc.)
- **Resource** — Which entity was affected
- **Before/After** — JSON diff of changes
- **IP address** — For security tracking
- **Timestamp** — Precise timing

---

## 7. Affiliate Network Setup

### 7.1 Awin

Awin is one of the world's largest affiliate networks. CouponPilot includes a full Awin connector.

**Step 1 — Get your API credentials**

1. Log in to your [Awin Publisher Dashboard](https://ui.awin.com)
2. Click your username in the top-right menu → **API Credentials** (or navigate directly to `https://ui.awin.com/awin-api`)
3. Copy your **API Token** and **Publisher ID**

**Step 2 — Configure in CouponPilot**

1. Navigate to **Admin** → **Networks**
2. Click the **Awin** network
3. Enter your API Token and Publisher ID
4. Click **Test Credentials** to verify the connection
5. Enable the network

**Step 3 — Create an import source**

1. Go to **Admin** → **Import Sources**
2. Click **Add Source** and select Awin
3. Configure the sync schedule (e.g., every 6 hours)
4. Click **Dry Run** to preview what will be imported
5. Click **Run Now** to import your first batch

**What gets imported:**

| Awin Data | CouponPilot Mapping |
|---|---|
| Programmes | Stores |
| Promotions | Coupons |
| Transactions | Conversions (with SubID attribution) |

**Link template (default):**

```
https://www.awin1.com/cread.php?awinmid={merchant_id}&awinaffid={affiliate_id}&clickref={subId}&ued={destination_url_encoded}
```

### 7.2 CJ Affiliate

CJ Affiliate (formerly Commission Junction) is fully supported.

> **Note:** CJ operates two separate portals: generate your Personal Access Tokens on the Developer Portal ([developers.cj.com](https://developers.cj.com)), and manage your Company ID (CID) & Promotional Property ID (PID) on the Publisher Dashboard ([members.cj.com](https://members.cj.com)).

**Step 1 — Get your API credentials**

1. Log in to the Developer Portal at [developers.cj.com](https://developers.cj.com) → **Authentication → Personal Access Tokens** and generate a token
2. Log in to your Publisher Dashboard at [members.cj.com](https://members.cj.com) and copy your **Company ID (CID)** beside your company name in the header
3. Copy your **Promotional Property ID (PID)** from **Account → Websites / Promotional Properties** to **Admin** → **Networks**
2. Click the **CJ** network
3. Enter your Access Token and Company ID
4. Click **Test Credentials**
5. Enable the network

**Step 3 — Create an import source**

Same process as Awin. CJ uses the `append_subid` link strategy — the SubID is appended as `&sid=` to the ready-built click URL.

**What gets imported:**

| CJ Data | CouponPilot Mapping |
|---|---|
| Advertisers | Stores |
| Link Search results | Coupons |
| Commission Detail | Conversions (with SubID attribution) |

### 7.3 Adding Custom Networks

CouponPilot's connector architecture is designed for extensibility. Each network connector implements a standardized interface:

```typescript
interface NetworkConnector {
  slug: string;
  name: string;
  testCredentials(credentials): Promise<{ success; message? }>;
  fetchStores?(credentials, options?): Promise<NormalizedStore[]>;
  fetchOffers(credentials, options?): Promise<NormalizedOffer[]>;
  fetchConversions(credentials, since, options?): Promise<NormalizedConversion[]>;
  mapToCoupon(offer, storeId): CouponInput;
}
```

To add a new network:

1. Create a new file at `src/lib/connectors/yournetwork.ts`
2. Implement the `NetworkConnector` interface
3. Register it in `src/lib/connectors/registry.ts`
4. No changes needed anywhere else — the import engine picks it up automatically

We provide recorded **test fixtures** for every connector so you can test without live API credentials.

---

## 8. Click Tracking & Attribution

CouponPilot's click attribution system is the core of its monetization engine. Every outbound click is tracked with a unique fingerprint.

### How it works

```
Step 1              Step 2              Step 3              Step 4
────────────        ────────────        ────────────        ────────────
Visitor clicks  →   Network logs    →   Commission      →   Ledger
/go/clk_8f2a…       sid=clk_8f2a…       posts, matched      credited
                                         to click            +$12.48
```

### The redirect route

All outbound links go through `GET /go/[clickId]`:

1. **Click is logged** — Before the redirect, a `Click` row is created with:
   - Coupon ID, Store ID, User ID (or anonymous ID)
   - IP hash, user agent, referrer, device type
   - Bot score and bot classification
   
2. **SubID is generated** — The click ID becomes the SubID passed to the affiliate network

3. **Deep link is built** — Using the network's link template with variable interpolation:
   - `{affiliate_id}` → Your publisher ID
   - `{merchant_id}` → The store's merchant ID on that network
   - `{subId}` → The click ID (the attribution join key)
   - `{destination_url_encoded}` → The merchant's landing page

4. **302 redirect** — Never 301, because every click must be logged

### Two link strategies

| Strategy | Used by | How it works |
|---|---|---|
| `template` | Awin | Full URL template with placeholder interpolation |
| `append_subid` | CJ | Appends `&sid={subId}` to a pre-built click URL |

### Bot filtering

CouponPilot filters bot traffic before logging clicks:

- **User-agent detection** — Known bot strings are blocked
- **Rate limiting** — Per IP hash to prevent click fraud
- **Bot score** — Calculated from multiple signals

### Anonymous click claiming

Users who click before signing up get an `anon_id` cookie. When they create an account, all anonymous clicks are retroactively attributed to their account.

---

## 9. Cashback Engine

CouponPilot includes a **production-grade cashback wallet system** built on an append-only ledger — the gold standard for financial data integrity.

### How cashback works

```
Purchase → Pending (30-90 days) → Confirmed → Withdrawable
```

1. **User clicks an affiliate link** through your site
2. **Merchant reports a conversion** via the network
3. **CouponPilot creates a `cashback_pending` ledger entry** for `commission × cashback_share`
4. When the merchant confirms the sale, a **`cashback_confirmed`** entry is written
5. If declined, a **reversing entry** (`cashback_declined`) is written
6. The user requests a withdrawal once their confirmed balance meets the threshold
7. Admin approves → `withdrawal_approved` entry → payment is made → marked as `paid`

### Ledger architecture

The wallet uses an **append-only ledger** — not a mutable balance column.

| Entry Type | Effect |
|---|---|
| `cashback_pending` | +amount to pending bucket |
| `cashback_confirmed` | +amount to confirmed bucket |
| `cashback_declined` | -amount (reversal) |
| `withdrawal_requested` | Records intent |
| `withdrawal_approved` | -amount from confirmed bucket |
| `referral_bonus` | +amount (referral reward) |
| `adjustment` | Manual admin credit/debit |

**Balances are always derived by summing the ledger**, then cached with invalidation on write. This means:

- Nothing silently disappears when a merchant declines an order
- Every change has a full audit trail
- Disputes can be resolved by reading the ledger

### Cashback rates

- **Global default** — Set in Admin → Settings
- **Per-store override** — Set on each store's edit page
- **Configurable minimum withdrawal** — Users can't withdraw until they reach the threshold

---

## 10. Self-Serve Ad Sales

CouponPilot lets brands pay you directly for premium placements. No ad network middleman.

### How it works

1. **Advertiser visits** your `/advertise` page
2. **Picks a placement** — Featured store, header banner, in-feed spot, or top offer
3. **Selects a duration** — 7, 14, or 30 days (configurable)
4. **Pays by card or PayPal** — Stripe and PayPal checkout are built in
5. **Uploads artwork** — Through their own dedicated advertiser portal
6. **You approve it** — Campaign goes live automatically

### Features included

- **Signature-verified webhooks** — Stripe and PayPal payment confirmations
- **Server-side artwork validation** — Size and format checks
- **Magic-link advertiser portal** — No login required for advertisers
- **Automatic campaign expiry** — Campaigns end on schedule
- **Performance tracking** — Impressions, clicks, and CTR per campaign
- **Downloadable receipts** — PDF receipts for advertisers

### Placement types

| Placement | Description | Typical Price |
|---|---|---|
| Featured Store | Boosted visibility on homepage | $18/day |
| Header Banner | Site-wide banner ad | $64/day |
| Top Offer Spot | Prime position on store pages | $50/day |
| In-Feed | Placed within coupon listings | $25/day |

Prices are fully configurable in **Admin → Settings**.

---

## 11. Advertiser Portal

Advertisers access their campaigns through a **magic-link portal** — no account needed.

When a brand purchases a placement:

1. They receive an email with a unique, time-limited magic link
2. The link opens the **Advertiser Portal** at `/advertiser`
3. From there they can:
   - Upload creative artwork
   - View campaign status and performance metrics
   - Download payment receipts
   - See impressions and click data

The portal is fully styled to match your site's branding.

---

## 12. Payment Gateways

### Stripe

Used for ad sales and featured placements. Configuration:

1. Create a Stripe account at `dashboard.stripe.com`
2. Get your API keys from **Developers → API Keys**
3. Set up a webhook endpoint pointing to `/api/webhooks/stripe`
4. Add the webhook secret to your `.env`

Stripe handles:
- Card payments for ad placements
- Webhook-based payment confirmation
- Automatic order status updates

### PayPal

Alternative payment method for ad sales:

1. Create a PayPal Business account
2. Go to `developer.paypal.com` → **Apps & Credentials**
3. Create an app and get Client ID + Secret
4. Configure sandbox/live mode in `.env`

PayPal handles:
- PayPal checkout for ad placements
- Server-side payment verification
- Order status tracking

---

## 13. SEO Features

CouponPilot is built with SEO as a first-class feature.

### Dynamic Sitemap

- Auto-generated `sitemap.xml` split by entity type
- Includes `lastmod` dates
- Regenerated on schedule

### Schema.org JSON-LD

Structured data is automatically generated for:

| Schema Type | Used On |
|---|---|
| `Offer` | Coupon detail pages |
| `AggregateRating` | Store pages (from votes) |
| `FAQPage` | FAQ sections |
| `BreadcrumbList` | All pages |
| `Organization` | Site-wide |

### Meta Templates

SEO titles and descriptions use configurable templates with variables:

```
{store_name} Coupons & Promo Codes — {month} {year} | {site_name}
```

Overridable per store, per coupon, and per category.

### Programmatic Routes

- `/store/[slug]` — Store coupon page
- `/category/[slug]` — Category listing
- `/coupon/[slug]` — Individual coupon detail
- `/[store]-coupons-[month]-[year]` — Monthly evergreen pages
- `/search` — Full-text search results

### Additional SEO

- **Canonical URLs** on every page
- **`robots.txt`** editable from admin; `/go/*` disallowed
- **Expired coupon pages** remain indexed and surface live alternatives
- **On-demand revalidation** triggered by imports (ISR)
- **OG image generation** per store and coupon

---

## 14. Notifications

### Email

CouponPilot includes an email adapter layer supporting:

| Adapter | Description |
|---|---|
| SMTP | Any standard mail server |
| Brevo | Transactional email API |
| Resend | Modern email API |

**Transactional emails** are sent for:
- Email verification
- Password reset
- Cashback state changes (pending → confirmed → paid)
- Withdrawal approvals
- Missing-cashback claim resolution

**Email templates** are stored in the database and previewable in admin.

### Weekly Digest

- Automated weekly email with top deals
- Respects subscriber category preferences
- Configurable send day and time

### Telegram Bot

Auto-post new deals to a Telegram channel:

1. Create a bot via `@BotFather` on Telegram
2. Get the bot token and chat ID
3. Configure in Admin → Settings or `.env`
4. New imported coupons are automatically posted with configurable templates and filters

---

## 15. Scheduled Jobs (Cron)

CouponPilot relies on scheduled jobs for background processing. All cron endpoints are protected with a bearer token (`CRON_SECRET`).

| Job | Endpoint | Frequency | Description |
|---|---|---|---|
| Import offers | `/api/cron/import` | Per-source schedule | Syncs offers from affiliate networks |
| Fetch conversions | `/api/cron/conversions` | Daily | Pulls commission data from networks |
| Expire coupons | `/api/cron/expiry` | Hourly | Moves past-date coupons to expired |
| Campaign expiry | `/api/cron/campaign-expiry` | Hourly | Ends completed ad campaigns |
| Recalculate success rates | `/api/cron/success-rates` | Hourly | Updates coupon voting stats |
| Sitemap regeneration | `/api/cron/sitemap` | Daily | Rebuilds sitemap.xml |
| Weekly digest | `/api/cron/digest` | Weekly | Sends subscriber emails |
| Wallet cache rebuild | On ledger write | Realtime | Recalculates cached balances |

### Setting up cron jobs

**On a VPS** — Add to your system crontab:

```bash
# Every 6 hours — sync offers
0 */6 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.com/api/cron/import

# Daily at 2 AM — fetch conversions
0 2 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.com/api/cron/conversions

# Every hour — expire coupons + campaigns
0 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.com/api/cron/expiry
0 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.com/api/cron/campaign-expiry
```

**On Vercel** — Use Vercel Cron Jobs in your `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/import", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/conversions", "schedule": "0 2 * * *" },
    { "path": "/api/cron/expiry", "schedule": "0 * * * *" },
    { "path": "/api/cron/campaign-expiry", "schedule": "0 * * * *" }
  ]
}
```

---

## 16. Security

CouponPilot implements defense-in-depth security:

### Authentication

- **Session-based auth** with secure, HTTP-only cookies (`cp_session`)
- **Google OAuth** integration for social login
- **Email verification** required before cashback features
- **Password reset** via secure token emails
- **Session rotation** on login

### Authorization

- **Edge middleware** protects all `/admin`, `/account`, `/wallet`, `/withdraw` routes
- **Role-based access** — Admin users have separate capabilities from regular users
- **API route guards** on all admin endpoints

### Encryption

- **AES-256-GCM** encryption at rest for:
  - Network API credentials
  - User payout details (bank accounts, PayPal emails)
  - All settings marked as encrypted
- **Master key** (`APP_SECRET`) — Never stored in the database

### Input Validation

- **Zod schema validation** on every API route handler
- **Server-side sanitization** of admin-entered HTML (ad creatives, descriptions)
- **CSRF protection** on all mutation endpoints

### Rate Limiting

Protected endpoints with configurable limits:

| Endpoint | Default Limit |
|---|---|
| Login attempts | 5 per minute |
| Coupon voting | 10 per minute |
| Cashback claims | 3 per hour |
| Withdrawal requests | 1 per hour |
| Search queries | 30 per minute |
| Click redirects | 60 per minute |

---

## 17. GDPR & Privacy

CouponPilot includes GDPR compliance features:

- **Data export** — Users can download all their personal data
- **Account deletion** — Full data erasure on request
- **Cookie consent** — Configurable consent gate for analytics and ads
- **Privacy policy** — Editable from admin
- **Affiliate disclosure** — Site-wide disclosure component, editable in admin (legally required in US/UK)
- **IP hashing** — IP addresses are stored as hashes, not raw values

---

## 18. Feed Normalization

Real affiliate feeds are messy. CouponPilot includes a **normalization pipeline** that cleans data before it reaches your site.

### What gets normalized

| Raw Feed Problem | CouponPilot Fix |
|---|---|
| Prices embedded in titles | Extracted and formatted (`€272.15 OFF`) |
| Coupon codes buried mid-string | Parsed out with pattern matching |
| Discounts in 6 different formats | Unified to `{value}% OFF` or `${value} OFF` |
| Merchant tracking params in URLs | Stripped from destination URLs |
| Duplicate offers | Deduped on hash of `(store_id + code + expires_at)` |
| One prolific merchant flooding homepage | Per-store diversity caps |
| Raw category names | Sector-to-category mapping |

### Example transformation

**Raw from network:**
```
eufy Robot aspirateur Omni C20 +Caméra intérieure S350 – €455.849425
(€272.150575off) w/Code: WS24T2280G11-1-T8416321-1
```

**On your site:**
```
€272.15 OFF
eufy Robot aspirateur Omni C20
Code: WS24T2280G11 · Expires in 6d
```

### Additional processing

- **Auto-expiry** — Hourly sweep moves past-date coupons to `expired` (rows are kept for SEO)
- **Idempotent imports** — Re-running an import never creates duplicates
- **Merchant auto-mapping** — Unknown merchants are matched by domain or queued for admin review
- **Logo processing** — Store logos are automatically fetched and optimized

---

## 19. Theming & Customization

### Default Seed Credentials

When you seed the database (`npx prisma db seed`), the following default accounts are created:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@couponpilot.com` | `password123` | Full admin dashboard (`/admin`) |
| **Demo User** | `demo@example.com` | `password123` | Shopper account & wallet (`/account`) |

> **Note:** If you install via the Web Installer (`/install`), you will set your own custom admin email and password during setup.

### Design System

CouponPilot uses a token-based design system with three font families:

| Token | Font | Usage |
|---|---|---|
| `--font-space-grotesk` | Space Grotesk | Headings and display text |
| `--font-dm-sans` | DM Sans | Body text |
| `--font-jetbrains-mono` | JetBrains Mono | Codes, prices, and data |

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--paper` | `#F7F5F0` | `#1A1A1F` | Background |
| `--ink` | `#1A1A1F` | `#F7F5F0` | Text |
| `--money` | `#0E8A5F` | `#0E8A5F` | Positive values, success |
| `--urgent` | `#D94A2B` | `#D94A2B` | Expiry warnings |
| `--muted` | `#7A766D` | `#8F8D86` | Secondary text |
| `--rule` | `#D8D5CE` | `#3A3A3F` | Borders and dividers |

### Dark Mode

- Automatic dark mode based on system preference
- Manual toggle available in the header
- Persisted in `localStorage`

### Customization Points

| What | How |
|---|---|
| Site name & logo | Admin → Settings → General |
| Colors | Admin → Settings → Branding |
| Custom CSS | Admin → Settings → Branding |
| Footer links | Admin → Settings → General |
| Legal pages | Admin → Pages |
| Affiliate disclosure | Admin → Settings → Legal |
| SEO templates | Admin → Settings → SEO |

---

## 20. API Reference

CouponPilot exposes both public and admin API endpoints.

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores` | List all stores with pagination |
| `GET` | `/api/stores/[slug]` | Get store details |
| `GET` | `/api/coupons` | List coupons with filters |
| `GET` | `/api/coupon/[id]` | Get coupon details |
| `GET` | `/api/categories` | List all categories |
| `GET` | `/api/search` | Full-text search across stores, coupons, categories |
| `POST` | `/api/click` | Record a click (internal use by the redirect route) |
| `POST` | `/api/coupon/[id]/vote` | Vote on a coupon (up/down) |
| `POST` | `/api/contact` | Submit contact form |
| `GET` | `/api/ads/[slot]` | Get active ad creative for a slot |

### Auth Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `GET` | `/api/auth/google` | Google OAuth flow |

### Account Endpoints (Authenticated)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/account/wallet` | Get wallet balance and ledger |
| `POST` | `/api/account/withdraw` | Request withdrawal |
| `GET` | `/api/account/alerts` | List user's deal alerts |
| `POST` | `/api/account/alerts` | Create a deal alert |

### Admin Endpoints (Admin Role Required)

All admin endpoints are under `/api/admin/` and require the `admin` role.

| Area | Endpoints |
|---|---|
| Stores | CRUD, bulk actions, logo upload |
| Coupons | CRUD, bulk approve/expire/delete |
| Categories | CRUD, reorder |
| Networks | CRUD, test credentials |
| Import Sources | CRUD, run/dry-run, history |
| Users | List, role changes, adjustments |
| Withdrawals | Approve, reject, mark paid |
| Claims | List, resolve |
| Ads | Slot and creative CRUD |
| Featured | Order management |
| Settings | Get/update all settings |
| Earnings | Analytics aggregation |
| Audit Log | Read-only listing |

### Webhook Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Stripe payment webhook |
| `POST` | `/api/webhooks/paypal` | PayPal payment webhook |

---

## 21. Troubleshooting

### Common Issues

#### "Database connection failed"

- **Cause:** Invalid `DATABASE_URL` in `.env`
- **Fix:** Verify your PostgreSQL connection string. For Docker, ensure the database container is running (`docker compose ps`).

#### "APP_SECRET is required"

- **Cause:** Missing or empty `APP_SECRET` environment variable
- **Fix:** Set a random 32+ character string in `.env`

#### "Prisma client not generated"

- **Cause:** Build ran before Prisma client generation
- **Fix:** Run `npx prisma generate` before `npm run build`, or use the included build script which handles this automatically.

#### "Import sync returns 0 results"

- **Cause:** Invalid network credentials or no joined programmes
- **Fix:**
  1. Test credentials using the **Test Credentials** button in Admin → Networks
  2. Ensure you've joined programmes in your network dashboard
  3. Check the import run error log in Admin → Import Sources → Run History

#### "Clicks not being tracked"

- **Cause:** Bot filtering may be too aggressive, or the redirect route isn't reachable
- **Fix:** Check the Click table in your database. Verify the `/go/` route is accessible. Review bot detection logs.

#### "Cashback not appearing for users"

- **Cause:** Conversions haven't synced yet, or the conversion doesn't match a click
- **Fix:**
  1. Ensure the conversion sync cron job is running
  2. Check for unattributed conversions in Admin → Earnings
  3. Verify the SubID is being passed correctly in your network's reports

#### "Stripe webhook failing"

- **Cause:** Webhook secret mismatch or wrong endpoint URL
- **Fix:**
  1. Verify `STRIPE_WEBHOOK_SECRET` matches the value in your Stripe dashboard
  2. Ensure the webhook URL points to `https://your-site.com/api/webhooks/stripe`
  3. Check that the webhook is configured for `checkout.session.completed` events

#### Build fails on Vercel

- **Cause:** Missing environment variables during build time
- **Fix:** Ensure all required variables (`DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_APP_URL`) are set in Vercel's environment settings. CouponPilot includes fallback data providers to prevent 500 errors during build.

### Getting Help

1. Check the **Admin → Audit Log** for detailed action history
2. Review **Import Source → Run History** for sync errors
3. Check your browser's developer console for client-side errors
4. Review the Docker logs: `docker compose logs -f app`

---

## 22. Support & License

### License

CouponPilot is licensed under the **Envato Regular License**. Each license permits use on a single end product (one website).

### What's Included

- ✅ Full source code (TypeScript)
- ✅ Docker deployment files
- ✅ Prisma database schema and migrations
- ✅ Sample dataset (stores, coupons & ad banners) plus live network sync
- ✅ All documentation
- ✅ 6 months of support from the author

### Support Scope

| Included | Not Included |
|---|---|
| Bug fixes | Customization / new features |
| Installation help | Third-party integration debugging |
| Configuration guidance | Server administration |
| Documentation clarification | Network-specific API issues |

### Getting Support

1. Comment on the CodeCanyon item page
2. Email us at the address listed on our profile
3. We typically respond within 24 hours on business days

---

<div align="center">

**CouponPilot v1.0.0** · Built with ❤️ using Next.js 16, TypeScript, Prisma & Tailwind

© 2026 CouponPilot. All rights reserved.

</div>
