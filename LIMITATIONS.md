# Known Limitations & Manual Steps — Linksy (by FRZI TOOLS)

This document lists the operational notes, manual setup steps, and platform characteristics for running **Linksy** on the Supabase Free tier.

---

## 1. Required Manual Steps (One-Time Setup)

Because Supabase security requires explicit administrative controls, the following steps must be performed in your Supabase dashboard:

1. **Disable Email Confirmation**:
   - *Why*: Linksy uses clean usernames mapped to synthetic emails (`username@heyankit.invalid`). If email confirmation is enabled, accounts will remain unconfirmed and cannot log in.
   - *Where*: Supabase Dashboard → **Authentication** → **Providers** → **Email** → toggle **Confirm email** to **OFF**.

2. **Promote the Admin User**:
   - *Why*: By design, the signup trigger sets all new accounts to `'user'` to prevent privilege escalation. Ankit / admin can be promoted via SQL.
   - *Action*: After registering `ankit` or your admin username, run:
     ```sql
     UPDATE public.profiles SET role = 'admin' WHERE username = 'ankit';
     ```

3. **Deploy Edge Function for User Management (Optional)**:
   - *Why*: Disabling or deleting users from external management scripts requires Supabase Admin API keys (`SERVICE_ROLE_KEY`), which must never be exposed to the browser.
   - *Action*: Run `npx supabase functions deploy admin-manage-user` and set `SUPABASE_SERVICE_ROLE_KEY` secret.

---

## 2. Platform & Notification Considerations

1. **Push Notifications on iPhone & iPad**:
   - Web Push notifications on Apple devices (iOS / iPadOS 16.4+) are supported exclusively when the web app is installed to the **Home Screen** (running in standalone PWA mode).
   - In Safari tabs, Apple does not expose the `Notification` object.
   - Linksy detects this automatically and guides iOS users: tap the Share button in Safari → **"Add to Home Screen"** → launch Linksy from Home Screen → tap Bell icon to enable push notifications.
2. **Foreground & In-App Alerts**:
   - When users are actively inside the app, incoming messages trigger an in-app animated toast, polite audio chime (Web Audio API), and device haptic vibration.
3. **Offline Recovery**:
   - Linksy automatically re-subscribes to Supabase Realtime channels when network connectivity recovers.

---

## 3. License

Linksy — by FRZI TOOLS  
© 2026 FRZI TOOLS. All rights reserved.
