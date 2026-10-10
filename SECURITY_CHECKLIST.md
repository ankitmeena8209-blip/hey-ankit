# Security Checklist & Architecture Audit — Linksy (by FRZI TOOLS)

This document outlines the security controls, validation rules, and automated protections built into **Linksy**.

---

## 1. Authentication & Identity Protection

| Control | Mechanism | Verification / Guarantee |
|---|---|---|
| **Synthetic Email Isolation** | `<username>@heyankit.invalid` | No real emails required. Users are identified solely by their chosen username. |
| **Username Constraints** | DB check constraint & Regex `^[a-z0-9_]{3,20}$` | Enforces lowercase, alphanumeric, 3–20 character limits. Case-insensitive unique index prevents homograph or casing collision attacks. |
| **Password Hygiene** | Client & server validation | Minimum 6 characters required. |
| **Generic Error Responses** | AuthContext login handler | Returns `"Invalid username or password."` for bad credentials to prevent username enumeration. |
| **Session Persistence** | Supabase SDK storage | Uses standard local storage session tokens with automatic refresh. No insecure custom cookies. |

---

## 2. Authorization & Privilege Escalation Prevention

| Control | Mechanism | Verification / Guarantee |
|---|---|---|
| **Default User Role** | Postgres trigger `handle_new_user()` | Every new user is initialized to role `'user'` and status `'active'`. Client cannot pass custom roles. |
| **Self-Promotion Block** | Postgres trigger `trg_protect_profile_privileges()` | An update attempt on `profiles.role` or `profiles.status` by anyone other than service-role or existing admin throws an exception: `"Cannot modify user role"`. |
| **Server-Side Admin Check** | `public.is_admin(p_user_id)` | Stored SQL function verifies role in the database. Client-side boolean flags are never trusted for authorization. |
| **Service Role Isolation** | Environment Secret | Service-role key is stored strictly as a server environment secret. It is never exposed in the client bundle. |

---

## 3. Database Row Level Security (RLS) & Multi-User Privacy

All tables have RLS enabled with explicit restrictive policies:

| Table | Operation | Policy Enforcement |
|---|---|---|
| `profiles` | SELECT | Active profiles are visible to authenticated users for directory discovery (`status = 'active'`). Inactive/disabled users remain invisible. |
| `profiles` | UPDATE | User can only update their own profile (`id = auth.uid()`). Trigger blocks role/status tampering. |
| `conversations` | SELECT | `user_id = auth.uid() OR recipient_id = auth.uid() OR admin_id = auth.uid() OR is_admin(auth.uid())`. Non-members cannot view private conversations. |
| `conversations` | INSERT | `user_id = auth.uid() OR recipient_id = auth.uid()`. Cross-user conversation creation without membership is rejected. |
| `messages` | SELECT | `is_conversation_member(conversation_id, auth.uid())` AND caller status is `'active'`. Non-members cannot read messages. |
| `messages` | INSERT | `sender_id = auth.uid()` AND `is_conversation_member(...)` AND caller status is `'active'`. Forged `sender_id` inserts are rejected. |
| `messages` | UPDATE | Only `read_at` updates allowed for conversation members; edits must go through the `edit_message` RPC. |
| `messages` | DELETE | Direct client deletes are forbidden (must use `unsend_message` RPC). |
| `message_audit` | SELECT | Restricted strictly to `is_admin(auth.uid())`. Regular users cannot query audit records. |

---

## 4. Message Editing & Unsend Lifecycle

| Feature | Security Rule | Implementation |
|---|---|---|
| **20-Second Edit Window** | Server-time enforcement | Enforced in `edit_message()` RPC using `EXTRACT(EPOCH FROM (timezone('utc', now()) - created_at)) <= 20`. Client device clock manipulation cannot bypass this. |
| **Ownership Check** | Sender verification | `v_message.sender_id = auth.uid()` verified before edit. |
| **Unsend Audit Trail** | Hard delete + archive | `unsend_message()` RPC inserts full message data into `message_audit` with `deleted_at` and `deleted_by`, then executes a hard `DELETE` from `messages`. This guarantees Realtime emits a deletion event while maintaining compliance logging. |
| **Retention Policy** | 30-Day Purge | Purge function `purge_expired_audit_records()` deletes audit entries older than 30 days. |

---

## 5. Storage Security

- **Chat Images Bucket**: Private bucket with RLS ensuring only conversation participants can view or upload images. Signed URLs with 1-hour expiration are used for media viewing.
- **Avatars Bucket**: Public bucket with 2MB file limit and image MIME-type restriction for user profile photos.

---

Linksy — by FRZI TOOLS  
© 2026 FRZI TOOLS. All rights reserved.
