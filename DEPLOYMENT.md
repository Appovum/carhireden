# CouponPilot — Buyer Deployment Guide

Welcome to **CouponPilot**! This guide gets the site running. The full documentation (`DOCUMENTATION.md` or `documentation.html`) covers everything else.

---

## 🚀 Option 1: Docker Compose (Recommended for a VPS)

### Prerequisites
- A VPS (Ubuntu 22.04 LTS or Debian) with Docker and Docker Compose v2 installed.

### Steps
1. **Clone the repository onto your server**:
   ```bash
   git clone <your-repo-url> couponpilot
   cd couponpilot
   ```

2. **Configure `.env`**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `APP_SECRET` — a random secret: `openssl rand -hex 32`
   - `POSTGRES_PASSWORD` — a random password: `openssl rand -hex 16` (letters and digits only)
   - `NEXT_PUBLIC_APP_URL` — your domain, e.g. `https://coupons.example.com`

   Docker Compose will not start while `APP_SECRET` or `POSTGRES_PASSWORD` is empty. Keep your `APP_SECRET` safe and never change it later: your encrypted data depends on it.

3. **Launch**:
   ```bash
   docker compose up -d --build
   ```
   The first build takes a few minutes. The database tables are created automatically when the app starts, so there are no extra database commands to run. The database is reachable only from the app container.

4. **Complete web setup**:
   Open `http://your-server-ip:3000/install` and create your admin account. To add sample stores and coupons, sign in, open **Admin → Import Sources**, and use the seed button.

### Updating, backups and HTTPS
```bash
git pull
docker compose up -d --build
```
```bash
docker compose exec -T db pg_dump -U couponpilot couponpilot > backup.sql
```
The app listens on plain HTTP on port 3000. Put Caddy or nginx in front of it for HTTPS and set `NEXT_PUBLIC_APP_URL` to your `https://` address (then rebuild). If you change `NEXT_PUBLIC_APP_URL`, rebuild with `docker compose up -d --build`, because the value is built into the app.

---

## ⚡ Option 2: Vercel + Managed Postgres (Neon / Supabase)

1. **Database Setup**:
   - Create a PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Copy the pooled connection string and the direct (non-pooled) connection string. If your provider has only one, use it for both.

2. **Deploy to Vercel**:
   - Import this codebase into Vercel.
   - Set environment variables in the Vercel Dashboard:
     - `DATABASE_URL`: your PostgreSQL connection string
     - `DATABASE_URL_UNPOOLED`: the direct (non-pooled) connection string
     - `APP_SECRET`: a random secret (`openssl rand -hex 32`)
     - `NEXT_PUBLIC_APP_URL`: your Vercel domain URL

3. **Initialize Database**:
   Run the schema push once from your terminal with the same two connection strings in your environment:
   ```bash
   npx prisma db push
   ```

4. **Run Web Installer**:
   Navigate to `https://your-app.vercel.app/install` to create your owner credentials.

---

## 🔒 Security Best Practices
- Every configurable integration (Awin, CJ, settings) can be configured directly inside the **Admin UI** (`/admin`), requiring zero server edits.
- All sensitive credentials and payment payout details are encrypted at rest with AES-256-GCM, using your `APP_SECRET`.
- Never commit your `.env` file, and never share your `APP_SECRET` or database password.
