# Database Function & Data Flow Reference

This note drills into every database helper and API layer that touches MongoDB so you can see exactly how data moves through the project.

## 1. Core Database Helpers (`lib/database/mongodb.ts`)

### `clientPromise`
- Module-scoped promise that resolves to a connected `MongoClient`.
- Uses `buildMongoOptions()` to configure TLS, pool sizes, and timeouts.
- In development it caches the connection on `global._mongoClientPromise` to survive hot reloads.
- Rejects if `MONGODB_URI` is missing (UI then switches to demo mode via providers).

### `createMockDatabases()`
- Returns Mongo-like objects that mimic `.find().sort().limit().toArray()` chains.
- Used when `MONGODB_URI` is undefined so the app can still render without hard crashes.

### `getDatabases()`
- Central access point; returns `{ auth, profiles, activities }` database handles.
- Falls back to `createMockDatabases()` on connection failure.
- All API routes that need MongoDB import and call this helper to stay consistent.

### `getMongooseConnection()` / `connectTo*DB()`
- Optional ODM-style connection; each call spins up (or reuses) a dedicated `mongoose.Connection` for a named database.
- Not heavily used yet, but available for future schema-based work.

### Collection helpers
- `getUserCollection()`, `getProfileCollection()`, `getActivityCollection()` call `getDatabases()` and return specific collections.
- Keeps collection naming (`voiceflow_auth.users`, etc.) in a single file.

## 2. Environment Safeguards (`lib/env.ts`, `lib/validateEnv.ts`)
- `serverEnv.MONGODB_URI` exposes the connection string only on the server.
- `validateEnv()` warns when essential values are missing, sets sensible defaults for dev, and adjusts `NEXTAUTH_URL` during Vercel deploys.

## 3. Health Monitoring (`app/api/health/database/route.ts`)
- Pings MongoDB (`client.db('admin').command({ ping: 1 })`).
- Validates that all three logical databases are reachable (`listCollections`).
- Returns structured JSON used by `DatabaseProvider` to decide whether to offer “Demo Mode”.

## 4. Authentication & User Management

### NextAuth handler (`app/api/auth/[...nextauth]/route.ts`)
- Uses `getUserCollection()` to look up credentials users.
- Writes last login timestamps on successful credential login.
- Injects `username`, `profileComplete`, and phone metadata into JWT/session payloads so the UI can read them client-side.
- When `MONGODB_URI` is missing it creates temporary session values but skips DB writes.

### Signup API (`app/api/auth/signup/route.ts`)
- Imports `clientPromise` directly, opens `voiceflow_auth.users` collection.
- Validates unique email/username, hashes passwords, stores optional bio/phone.
- Returns new Mongo `_id` for confirmation.

### Profile completion (`app/api/auth/complete-profile/route.ts`)
- (Inside `database_review/app/api/auth/complete-profile/route.ts`.)
- Synchronises data between `voiceflow_auth.users` and `voiceflow_profiles.users` and marks `profileComplete` in both docs.
- Used right after OAuth sign-in.

## 5. Profile APIs

### `GET /api/users/profile`
- Reads session, returns `MockProfile` if DB empty (useful for demo mode).
- For updates, it:
  1. Uploads optional avatar via Cloudinary.
  2. Fetches existing profile from `profiles.users`.
  3. Saves merged data with `updateOne({ email }, { $set, $setOnInsert })`.
  4. Runs `updateMany` on `profiles.posts` to keep author names/images in sync across posts.

### `GET /api/users/[identifier]`
- Accepts email or username.
- Fetches from `profiles.users`; falls back to session info if the user is looking at their own profile and no record exists yet.

### Search (`GET /api/users/search`)
- Parses `request.url` for `q`, builds a regex.
- Queries across name, username, email, bio fields within `profiles.users`.
- `export const dynamic = 'force-dynamic'` ensures Next.js doesn’t try to pre-render the route.

## 6. Post APIs

### `GET /api/posts`
- Pulls feed entries from `profiles.posts`.
- Collects unique author emails, cross-references `profiles.users` to hydrate names, usernames, avatars.
- Normalises timestamps and ensures `images` arrays are always present for the UI.

### `POST /api/posts`
- Lightweight JSON endpoint for quick text posts.
- Requires auth session, writes trimmed content, stores arrays for likes/comments/reposts (even if empty).

### `POST /api/posts/create`
- Multipart handler used by the full post composer.
- Uploads each file to Cloudinary, stores resulting URLs alongside the post document.
- Writes to `profiles.posts` with `author` block (name/email/image).

### Other post routes (all inside `database_review/app/api/posts/...`)
- `posts/[id]` – read/update/delete individual posts.
- `posts/user/[identifier]` – fetches posts for a user (email/username lookup).
- `posts/search` – regex content search (forced dynamic).
- `posts/reposts/*`, `posts/like/*`, etc. – scaffolded endpoints to expand later (many respond with `503` if functionality was intentionally removed).

## 7. Notifications & Activities

### `/api/notifications`
- Reads session to ensure the user is logged in.
- `GET`: fetches latest 50 notifications from `activities.notifications`, enriches `fromUser` metadata using `profiles.profiles`.
- `POST`: writes new notification documents.
- `PUT`: marks selected notifications as read (`updateMany` with `_id: { $in: notificationIds }`).

## 8. Supporting Client Logic (`providers/database-provider.tsx`)
- Hits `/api/health/database` on mount; exposes `isDbConnected` and `useDemoMode` flags.
- Prompts user to enable demo mode when MongoDB isn’t reachable (saves preference in `localStorage`).

## 9. Directory Snapshot
- `database_review/app/` mirrors **all** API handlers so you can inspect auth, posts, users, notifications, health, admin stubs, etc.
- `database_review/lib/` holds the DB helpers & environment utilities.
- `database_review/providers/` includes the client-side DB provider component.

Use this file alongside `DATABASE_OVERVIEW.md` to orient yourself: this one breaks down the functions, while the overview summarises the broader architecture. Let me know if you’d like ER diagrams or sample queries next.
