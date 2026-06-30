# Volo / Discount-Card — Full Issue Audit

_Audited: 2026-06-21. Scope: Expo/React Native app, FastAPI backend, live Appwrite (TablesDB v1.8) project `695272a5002c9fe4b025` / db `69533165003476ee67c0`._

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low

---

## 🔴 SECURITY

### S1 — Public `any` permissions on Appwrite tables (most severe)
`agents` table is `create/read/update/delete("any")` with `rowSecurity: false` (confirmed live). The Appwrite **project ID and endpoint ship inside the mobile app** and are trivially extractable. Anyone can use the public SDK to read, overwrite, or wipe the entire database directly — completely bypassing the FastAPI backend and its ownership checks.
- **Verify first:** check `properties` and `products` table permissions (likely identical).
- **Fix:** set table permissions to `read("any")` only where public listing is needed; remove public `create/update/delete`. Enable `rowSecurity` and write per-row permissions on create, OR route ALL writes exclusively through the backend with a server key and lock tables to no public write.

### S2 — Broken access control: backend trusts client-supplied `ownerId` (IDOR)
`stores.py` / `products.py` authorize mutations by comparing a **request-supplied** `ownerId`/`owner_id` to the stored owner. There is no identity verification. Attack: `GET /stores/{id}` (public) returns `ownerId` → attacker passes that value to `DELETE`/`PUT` → deletes/edits any store or product.
- **Fix:** require an Appwrite session JWT on every mutating request; verify it server-side (`account.get()` with the user's JWT) and derive `ownerId` from the verified identity, never from the body/query.

### S3 — No authentication layer on the backend
FastAPI uses a full-access **server API key** and exposes all endpoints unauthenticated to the internet. Combined with S2 this means any caller has owner-level power.
- **Fix:** auth dependency (`Depends(verify_user)`) on all non-public routes; reject missing/invalid JWT.

### S4 — No CORS policy, rate limiting, or payload limits
No `CORSMiddleware`, no throttling, `str` fields unbounded. Search endpoint is abuse-prone (2 DB round-trips/call).
- **Fix:** restrictive CORS allowlist, rate limiting (e.g. slowapi), max-length validation on all Pydantic fields.

### S5 — Over-scoped server API key
Standard broad key. Use a least-privilege key (only the DB/storage scopes the backend needs). Rotate the current key (it has been shared into local config files).

---

## 🟠 RELIABILITY

### R1 — In-memory cache on Render free tier
`cache.py` is a module-level dict. Render spins down on idle and may run multiple workers → cache is per-process, lost on restart, and inconsistent across instances. Stale/missing cache hits.
- **Fix:** external cache (Upstash Redis free tier) or drop caching and rely on Appwrite + short HTTP cache headers.

### R2 — Cold-start latency
Render free tier sleeps; `wakeBackend()` 65s ping is a band-aid. First request after idle = 30–60s.
- **Fix:** uptime pinger (cron) or move to an always-on tier; show a "waking up" UI state.

### R3 — Broken search pagination
`get_stores(query=...)` runs two `search` queries each with `offset(0)` and `limit+offset`, merges, sorts, then slices `[offset:offset+limit]`. Deep pages drop/duplicate results.
- **Fix:** single indexed fulltext query with native `Query.offset/limit`, or a proper combined index.

### R4 — Search depends on unverified fulltext indexes
`Query.search("name"/"address")` 500s if the fulltext indexes aren't `available`. Migration script created them but state is unverified.
- **Fix:** verify indexes live; add a startup health check.

### R5 — Raw exception strings returned to clients
`raise HTTPException(detail=str(e))` leaks internals. Replace with generic messages + server-side logging.

### R6 — Production console noise / no observability
`console.error` throughout ships to release logs; no structured logging/metrics on backend.

---

## 🟠 FEATURES — INCOMPLETE / BROKEN

### F1 — Uploaded store images are never displayed
Files upload to `store-images` and IDs save into `images[]`, but: (a) `stores/[id].tsx` renders `store.image` (a single hardcoded Unsplash URL), (b) home cards likely same, (c) no `storage.getFileView/getFilePreview` conversion from file ID → URL.
- **Fix:** build image URLs from `images[]` file IDs and render them in detail + cards; fall back to placeholder only when empty.

### F2 — Add-store image picker disabled ("Coming Soon")
`add-store.tsx` image area is `pointerEvents:none`, opacity 0.45. New stores can never get images; only `edit-store.tsx` can upload. Inconsistent.
- **Fix:** enable the same working picker/upload flow used in edit-store.

### F3 — Product images "Coming Soon"
Per-product "Upload Image" button is `disabled`; `image_id` exists in API but unused in UI. Implement or remove.

### F4 — Backend hardcodes placeholder image on store create
`create_store` always sets `image` to an Unsplash URL. Should derive primary image from uploaded `images[]`.

### F5 — Favorites + Share not implemented
Heart/Send buttons show "Coming Soon" alerts. Implement (favorites table) or hide.

### F6 — Reviews / ratings / gallery / agent unimplemented
Detail screen reads `reviews`/`gallery`/`agent` but backend always returns empty; `rating` hardcoded 0. Either build or remove the dead UI.

### F7 — Core "discount card" feature appears unbuilt
`subscription_plans`, `user_cards`, `categories`, `user_events` tables exist but are unused in the app. The actual discount-card / membership flow may not be implemented — confirm product scope.

---

## 🟡 CODE QUALITY

- Q1 — `_normalize`/`_rows`/`_FIELD_MAP` duplicated in `stores.py` & `products.py`; extract a shared module.
- Q2 — Stray `components/NoResults copy.tsx` duplicate file.
- Q3 — No tests anywhere (frontend or backend).
- Q4 — Hardcoded API base URL in `lib/api.ts`; move to env/config.
- Q5 — Naming inconsistency: `ownerId` (stores) vs `owner_id` (products).
- Q6 — Leftover real-estate template artifacts (`seed.ts`, `data.ts`, `properties`/`agents`/`galleries`) — domain migration to discount-card incomplete.
- Q7 — Loose typing on API responses (casts, `any`).

---

## Suggested fix order
1. **S1 + S2 + S3** (lock the database — currently anyone can wipe it).
2. **R3 + R4** (search correctness) and **R1** (cache).
3. **F1 + F2 + F4** (make photos actually work end-to-end).
4. **S4 + S5 + R5** (hardening).
5. **F5–F7** (decide build-or-remove per product scope).
6. **Q1–Q7** (cleanup + tests).
