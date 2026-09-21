# CouponPilot — Buyer Deployment Guide

Welcome to **CouponPilot**! This application is designed to be easily operated by non-expert solo entrepreneurs without writing code.

---

## 🚀 Option 1: Docker Compose Deployment (Recommended for VPS)

### Prerequisites
- A plain VPS (Ubuntu 22.04 LTS or Debian) with Docker and Docker Compose installed.

### Steps
1. **Clone repository onto your server**:
   ```bash
   git clone <your-repo-url> couponpilot
   cd couponpilot
   ```

2. **Configure `.env`**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `APP_SECRET` to a random secret string.

3. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

4. **Run Database Migrations & Seed Data**:
   ```bash
   docker compose exec app npx prisma db push
   docker compose exec app npx prisma db seed
   ```

5. **Complete Web Setup**:
   Open `http://your-server-ip:3000/install` in your browser to create your Admin account and launch your site!

---

## ⚡ Option 2: Vercel + Managed Postgres (Neon / Supabase)

1. **Database Setup**:
   - Create a PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Copy the database connection string.

2. **Deploy to Vercel**:
   - Import this codebase into Vercel.
   - Set environment variables in Vercel Dashboard:
     - `DATABASE_URL`: Your PostgreSQL connection string.
     - `APP_SECRET`: A random 32-byte secret string.
     - `NEXT_PUBLIC_APP_URL`: Your Vercel domain URL.

3. **Initialize Database**:
   Run database migration in your terminal or Vercel build command:
   ```bash
   npx prisma db push
   ```

4. **Run Web Installer**:
   Navigate to `https://your-app.vercel.app/install` to create your owner credentials.

---

## 🔒 Security Best Practices
- Every configurable integration (Awin, CJ, settings) can be configured directly inside the **Admin UI** (`/admin`), requiring zero server edits.
- All sensitive credentials and payment payout details are encrypted at rest with AES-256-GCM.
