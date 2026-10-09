# Known Limitations & Manual Steps — Hey Ankit

This document lists the operational notes, manual setup steps, and platform characteristics for running **Hey Ankit** on the Supabase Free tier.

---

## 1. Required Manual Steps (One-Time Setup)

Because Supabase security requires explicit administrative controls, the following three steps must be performed in your Supabase dashboard:

1. **Disable Email Confirmation**:
   - *Why*: Hey Ankit uses clean usernames mapped to synthetic emails (`username@heyankit.invalid`). If email confirmation is enabled, accounts will remain unconfirmed and cannot log in.
   - *Where*: Supabase Dashboard → **Authentication** → **Providers** → **Email** → toggle **Confirm email** to **OFF**.

2. **Promote the Admin User**:
   - *Why*: By design, the signup trigger sets all new accounts to `'user'` to prevent privilege escalation. Ankit must be promoted once via SQL.
   - *Action*: After registering `ankit`, run:
     ```sql
     UPDATE public.profiles SET role = 'admin' WHERE username = 'ankit';
     ```

3. **Deploy Edge Function for User Management (Optional)**:
   - *Why*: Disabling or deleting users requires Supabase Admin API keys (`SERVICE_ROLE_KEY`), which must never be exposed to the browser.
   - *Action*: Run `npx supabase functions deploy admin-manage-user` and set `SUPABASE_SERVICE_ROLE_KEY` secret.

---

## 2. Supabase Free Tier Characteristics

| Feature | Quota / Behavior | Operational Recommendation |
|---|---|---|
| **Inactivity Pausing** | Projects pause after **7 days** without database activity. | If inactive, the first visitor will encounter a 5–15 second wake-up period while Postgres resumes. This is standard on the Free tier. |
| **Realtime Limits** | 200 concurrent active connections. | Ample for private 1:1 chat between Ankit and his circle of friends. |
| **Storage Quota** | 1 GB total file storage. | Hey Ankit automatically compresses pictures client-side before uploading to optimize storage usage. |
| **Database Size** | 500 MB Postgres database storage. | Text messages and audit logs consume minimal space (~1KB per message). Retention purge removes unsend records older than 30 days. |

---

## 3. Platform & Browser Considerations

1. **Push Notifications**:
   - Mobile browsers (especially iOS Safari) require Web Push API Service Workers and registered VAPID certificates for background push notifications when the browser tab is closed. Currently, read receipts and notifications occur in real-time when the web app is open.
2. **Offline Mode**:
   - Hey Ankit operates live with Supabase Realtime subscriptions. If the user disconnects, it reconnects automatically on network recovery.
