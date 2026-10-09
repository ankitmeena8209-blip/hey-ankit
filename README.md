# Hey Ankit — Private 1:1 Chat Application

> Private chat. Just us.  
> **© Being Frzi**

A secure, mobile-first 1:1 chat application built with React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons, and Supabase (Auth, Postgres, Realtime, and private Storage).

---

## Architecture Overview

- **1:1 Conversation Model**: Each friend registers with their unique username and has exactly **one** private conversation with the admin (**Ankit**). No public rooms, no group chats.
- **Admin Dashboard**: Ankit gets an admin inbox with **Chats**, **Users**, and an **Unsent log** (audit trail) with live searching and unread badges.
- **Teal Wave Aesthetic**: Custom liquid wave header, wavy composer, Framer Motion micro-interactions, spring animations, and `100dvh` mobile keyboard viewport handling.
- **Security & Privacy**:
  - Synthetic email mapping: `<username>@heyankit.invalid` with email confirmation disabled.
  - Server-enforced 20-second edit window via Security Definer RPC.
  - Unsend copies message to `message_audit` and performs a hard `DELETE` from live chat.
  - Row Level Security (RLS) on every table and Storage bucket.
  - Admin privileged actions (disable, restore, delete user) run through a dedicated Supabase Edge Function that validates the caller's admin JWT.

---

## Beginner Setup Guide (Step-by-Step)

Follow these simple steps to get your Supabase backend running in under 5 minutes without writing any backend code.

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**, select your organization, choose a project name (e.g., `hey-ankit`), set a database password, and choose a region close to you.
3. Wait 1-2 minutes for your project to provision.

### Step 2: Disable Email Confirmations (Crucial!)
Because "Hey Ankit" uses usernames with synthetic emails (`username@heyankit.invalid`), email confirmation must be turned off:
1. In the Supabase Dashboard, click **Authentication** in the left sidebar.
2. Go to **Providers** → click **Email**.
3. Toggle **Confirm email** to **OFF** (disabled).
4. Click **Save**.

### Step 3: Run the Database Migration
1. In the Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/migrations/20261009000001_hey_ankit_core.sql` in this repository, copy all of its content, paste it into the SQL editor, and click **Run**.
4. This will automatically create:
   - Tables: `profiles`, `conversations`, `messages`, `message_audit`.
   - Security Definer RPCs: `edit_message`, `unsend_message`, `mark_messages_read`, `get_or_create_my_conversation`.
   - Storage bucket: `chat-images` (private, 5MB limit, JPEG/PNG/WebP).
   - All Row Level Security (RLS) policies and Realtime publications.

### Step 4: Promote Admin (Ankit)
1. Launch the app locally (see [Running Locally](#running-locally)) or open your deployed URL.
2. Click **New here? Create account** and register your username: `ankit`.
3. Open the Supabase **SQL Editor** and run this exact one-line command:

```sql
UPDATE public.profiles SET role = 'admin' WHERE username = 'ankit';
```

Now, whenever you log in as `ankit`, you will automatically see the Admin Inbox with all conversations, user management, and unsent audit logs!

### Step 5: Deploy the Admin Edge Function (Optional for User Management)
To enable the Admin **Users** tab (disabling or deleting users via Supabase Admin API):
1. Install Supabase CLI: `npm install -g supabase`
2. Link your project: `npx supabase link --project-ref your-project-ref`
3. Deploy function: `npx supabase functions deploy admin-manage-user`
4. Set the service role secret:
   ```bash
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
*(Never paste the service role key in frontend code or commit it to GitHub).*

---

## Running Locally

1. Clone or open this repository:
   ```bash
   cd "hey ankit"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file:
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - In Supabase Dashboard, go to **Project Settings** → **API**.
   - Copy **Project URL** into `VITE_SUPABASE_URL`.
   - Copy **Project API Keys → anon public** into `VITE_SUPABASE_ANON_KEY`.

4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser.

---

## Deploying to Vercel (Free)

1. Push your code to GitHub (e.g. `https://github.com/ankitmeena8209-blip/hey-ankit.git`).
2. Go to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
3. Import your GitHub repository.
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Framework Preset: **Vite** (default).
6. Click **Deploy**.

---

## Free Tier Quotas & Monitoring

> [!IMPORTANT]
> Always check Supabase's **current** Free Plan limits in your Supabase dashboard (**Organization Settings → Billing**) as provider policies may change over time.

Key free plan characteristics to be aware of:
- **Project Pausing**: Supabase projects on the Free tier that receive no incoming queries for **7 consecutive days** are automatically paused. When someone visits the app after a pause, the project takes approximately 5–15 seconds to wake up.
- **Storage Limits**: 1 GB of free file storage. "Hey Ankit" automatically compresses uploaded photos on the client before uploading to save space.
- **Realtime Connections**: Up to 200 concurrent Realtime connections on the free tier (plenty for 1:1 chat).
- **Edge Functions**: Up to 500,000 invocations per month. "Hey Ankit" calls Edge Functions strictly for admin user management (disable/restore/delete), keeping function calls minimal.

---

## License

© Being Frzi. All rights reserved.
