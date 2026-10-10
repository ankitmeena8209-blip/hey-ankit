# Linksy — Secure Multi-User Messaging Platform

> Connect. Chat. Belong.  
> **Linksy — by FRZI TOOLS**  
> **© 2026 FRZI TOOLS. All rights reserved.**

A secure, mobile-first multi-user chat platform built with React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons, and Supabase (Auth, Postgres, Realtime, and private Storage). Published by **FRZI TOOLS**.

---

## Architecture Overview

- **Multi-User Private Messaging**: Registered users can discover any other registered user in the user directory and start private 1:1 conversations.
- **Deduplication Engine**: Existing conversations between any two users are automatically reused, preventing duplicate chat threads.
- **User Profiles**: Unique usernames, display names, profile avatars (upload or custom presets), and optional bios.
- **Admin Dashboard**: Admin console with **Chats**, **Users Management**, and **Unsent Log** (audit trail) with live searching and unread badges.
- **Notification Engine**:
  - Background Service Worker push notifications (`sw.js`).
  - Native iOS 16.4+ standalone Home Screen PWA push support.
  - In-app floating toast alerts with soft harmonic audio chime (Web Audio API) and haptic vibration.
  - Native App Icon badging (`navigator.setAppBadge`).
- **Teal Wave Aesthetic**: Custom liquid wave header, wavy composer, Framer Motion micro-interactions, spring animations, and `100dvh` mobile keyboard viewport handling.
- **Security & Privacy**:
  - Synthetic email mapping: `<username>@heyankit.invalid` with email confirmation disabled.
  - Row Level Security (RLS) on all tables ensuring only conversation members can read or send messages.
  - Server-enforced 20-second edit window via Security Definer RPC.
  - Unsend copies message to `message_audit` and performs a hard `DELETE` from live chat.

---

## Beginner Setup Guide (Step-by-Step)

Follow these simple steps to get your Supabase backend running in under 5 minutes without writing any backend code.

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**, select your organization, choose a project name (e.g., `linksy`), set a database password, and choose a region close to you.
3. Wait 1-2 minutes for your project to provision.

### Step 2: Disable Email Confirmations (Crucial!)
Because Linksy uses clean usernames with synthetic emails (`username@heyankit.invalid`), email confirmation must be turned off:
1. In the Supabase Dashboard, click **Authentication** in the left sidebar.
2. Go to **Providers** → click **Email**.
3. Toggle **Confirm email** to **OFF** (disabled).
4. Click **Save**.

### Step 3: Run the Database Migrations
1. In the Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Run the migrations in order from `supabase/migrations/`:
   - `20261009000001_hey_ankit_core.sql` (Core schema, RLS, Storage)
   - `20261010000001_admin_user_management.sql` (Admin management RPCs)
   - `20261011000001_linksy_multi_user.sql` (Multi-user messaging, user directory, unique conversation pairs)
4. Click **Run**.

### Step 4: Promote Admin (Creator)
1. Launch the app locally or open your deployed URL.
2. Click **Let's Go** and create your administrator username: `ankit` or `being_frzi`.
3. In the Supabase **SQL Editor**, run:

```sql
UPDATE public.profiles SET role = 'admin' WHERE username = 'ankit';
```

Now, whenever you log in as `ankit`, you will automatically see the Admin Inbox with all conversations, user directory, user management, and unsent audit logs!

---

## Running Locally

1. Clone or open this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your environment variables in `.env.local`:
   ```bash
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser.

---

## Push Notifications & PWA Installation

- **Desktop (Chrome, Edge, Firefox, Safari 16+)**: Click the bell icon in Linksy header to allow notifications.
- **Android**: Install PWA via browser prompt or menu -> "Install App", then grant notification permissions.
- **iPhone & iPad (iOS 16.4+)**:
  1. Open Linksy in Safari.
  2. Tap the **Share** button (box with upward arrow).
  3. Scroll down and tap **Add to Home Screen**.
  4. Launch **Linksy** from your iOS Home Screen.
  5. Tap the bell icon in the top header to grant push notifications.

---

## License

Linksy — by FRZI TOOLS  
© 2026 FRZI TOOLS. All rights reserved.
