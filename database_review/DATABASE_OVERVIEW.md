# Database & Data Flow Overview

This document summarizes how data is stored, accessed, and propagated through the Voiceflow project. Use it as a quick guide while you focus on database-related tasks.

## 1. Storage Layout
- **MongoDB Atlas connection** lives in `lib/database/mongodb.ts`. The app connects to three logical databases on the same cluster:
  - `voiceflow_auth` – authentication records (NextAuth users, credentials).
  - `voiceflow_profiles` – user profile documents plus social content such as posts.
  - `voiceflow_activities` – follower activity and notifications.
- A shared `MongoClient` is created once (`clientPromise`). Utility helpers expose ready-made connections: `getDatabases()`, `getUserCollection()`, `getProfileCollection()`, etc.
- When `MONGODB_URI` is missing, the helpers fall back to mock collections so the UI can run in local demo mode.
- Optional Mongoose helpers (`getMongooseConnection`, `connectToAuthDB`, …) are available if you need ODM-style models later.

## 2. Environment & Configuration
- Required variables are centralised in `lib/env.ts`; `validateEnv.ts` warns at startup if `MONGODB_URI` or `NEXTAUTH_SECRET` are missing.
- `next.config.js` allows MongoDB packages inside server components (`serverComponentsExternalPackages: ['mongodb']`).
- The deployment health check endpoint (`app/api/health/database/route.ts`) pings the cluster, validates credentials, and reports per-database access.

## 3. Authentication & User Data
- **NextAuth handler** (`app/api/auth/[...nextauth]/route.ts`) uses the database helpers to:
  - Authenticate credentials users via `getUserCollection()` with bcrypt password hashes.
  - Persist OAuth sign-ins, profile completion flags, and last-login timestamps.
  - Enrich JWT/session payloads with `username`, `profileComplete`, and phone metadata.
- **Signup endpoint** (`app/api/auth/signup/route.ts`) writes new users into `voiceflow_auth.users`, enforcing unique email/username and password hashing.
- **Profile completion** (`app/api/auth/complete-profile/route.ts`) keeps the `voiceflow_auth` and `voiceflow_profiles` collections in sync so the UI always resolves the correct username/bio/avatar combination.

## 4. Profile & People APIs
- `app/api/users/[identifier]/route.ts` fetches profile documents by username or email, falling back to session data if the profile is still empty.
- `app/api/users/profile/route.ts` lets the signed-in user update their profile. It uploads optional avatars to Cloudinary, persists the profile document, and propagates name/image changes into every existing post (`profiles.posts.updateMany`).
- Search endpoints (`app/api/users/search/route.ts`) provide type-ahead results from `profiles.users` using a case-insensitive regex on name, username, email, and bio.
- Follow-related endpoints currently return `503` (database access intentionally disabled), but the scaffolding remains under `app/api/users/follow*` for future use.

## 5. Post & Feed APIs
- `app/api/posts/route.ts` handles:
  - **GET** – aggregates post documents, joins profile data for display, and normalises timestamps/images.
  - **POST** – creates lightweight posts for quick text updates.
- `app/api/posts/create/route.ts` is the richer uploader. It accepts multipart form data, sends images to Cloudinary, and stores the final document in `profiles.posts`.
- Supporting routes:
  - `app/api/posts/[id]/route.ts` – fetch, update, and delete individual posts.
  - `app/api/posts/user/[identifier]/route.ts` – fetches posts for a specific user (email or username lookup).
  - `app/api/posts/reposts/[identifier]/route.ts` – (placeholder) for repost mechanics.
  - `app/api/posts/search/route.ts` – searches post content with a case-insensitive regex.

## 6. Activity & Notifications
- `app/api/notifications/route.ts` reads from and writes to `voiceflow_activities.notifications`.
  - **GET** – returns the latest 50 notifications for the signed-in user and enriches sender info from `profiles.profiles`.
  - **POST** – creates a notification document.
  - **PUT** – marks a batch of notifications as read for the owner.

## 7. Health, Admin & Utilities
- `app/api/health/database/route.ts` performs cluster readiness checks, returning rich diagnostics (per-database accessibility, helpful error messages).
- Admin migration routes under `app/api/admin/migrations/*` are disabled stubs that previously orchestrated large-scale username updates.
- Local tooling (`providers/database-provider.tsx`) exposes connection state to the client UI, prompts for demo mode when the database is offline, and stores the preference in `localStorage`.

## 8. Working With This Snapshot
- All relevant source files are duplicated in `database_review/` under the same relative paths (`app/api`, `lib/database`, `providers/database-provider.tsx`, etc.) so you can browse them in isolation.
- Sensitive secrets are **not** duplicated; ensure you read `.env.local` directly when you need credentials.
- When adding new data features, prefer extending the helpers in `lib/database/mongodb.ts` so the rest of the app keeps benefiting from the error handling and mock fallbacks.
