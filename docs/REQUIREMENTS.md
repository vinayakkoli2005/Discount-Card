# Volo — Vocal for Local
## Product Requirements & Vision Document

> Organized from founder notes + codebase analysis. Use this file alongside `CODEBASE_ANALYSIS.md` and CodeGraph when creating the execution plan.

---

## 1. What Is Volo?

Volo is a hyperlocal store discovery app. It helps users find nearby local stores, browse their products, and connect with local businesses — like a lightweight Google Maps meets a local marketplace directory. The goal is to be fast, small, offline-capable, and genuinely useful on slow networks.

---

## 2. Core Features

### 2.1 Store Discovery
- Stores are sorted by **distance from the user's current location** (closest first)
- Distance sorting uses the existing Haversine formula — ensure it runs efficiently
- Location permission is **optional but recommended** — if denied, fall back to a default sort (e.g. newest first or alphabetical)
- Show a gentle prompt/banner encouraging users to enable location for better results
- Even without location, the app should be fully usable

### 2.2 Store Creation (by Store Owners)
Store owners can add their store with the following data:
- Store name
- Description / tagline
- Address (text) + coordinates (map pin via pick-location screen)
- Phone number / contact info
- Opening hours (e.g. "Mon-Sat 9am–8pm") — *add to DB*
- Store category (from a predefined top-level list — see Section 5)
- Store photos (1–5 images) — *image storage row needs to be added to Appwrite DB*
- Products listed inside the store (see 2.3)

**My note:** The image field is **not yet in the Appwrite DB**. This must be added before the store creation feature is implemented. Flag this step explicitly during plan execution.

### 2.3 Product Listing Inside Stores
- Each store can list its products
- **Product categories are NOT predefined** — the store owner defines their own category names (e.g. "Summer Collection", "Daily Essentials", "Fresh Produce")
- Each product has: name, price, optional description, optional image
- Products are grouped by owner-defined category within the store detail screen
- Products are stored as a sub-collection in Appwrite (linked to store by store ID)

### 2.4 Edit Store Info
- Store owners can edit any field of their store after creation
- Edit should be accessible from the store detail page and from the My Stores page
- Only the store owner (matched by userId) can edit their own store
- Changing store images should support adding/removing individual images

### 2.5 Multiple Stores Per User
- A single user account can own and manage multiple stores
- My Stores page lists all stores owned by the logged-in user
- No artificial cap on number of stores per user

---

## 3. Authentication

### 3.1 Current: Google OAuth
- Already implemented via Appwrite OAuth
- Keep this as the primary auth method — most users prefer it

### 3.2 Add: Email + Password Auth
- Add manual email/password registration and login alongside Google OAuth
- Use Appwrite's built-in email/password authentication
- Login screen should have:
  - "Continue with Google" button (existing)
  - Email input + Password input
  - "Sign In" / "Create Account" toggle
  - "Forgot password" link → Appwrite password recovery flow
- Validate email format and password strength (min 8 chars) on the client

### 3.3 Session Handling
- Handle session expiry gracefully — auto-redirect to login, don't crash
- No token refresh needed if Appwrite handles it, but catch 401s and redirect

---

## 4. Search

### 4.1 Current State (Broken)
Current search appears to be a basic client-side or linear text match. This is not scalable.

### 4.2 Recommended Approach: Appwrite Full-Text Search
- Appwrite supports **full-text search** on indexed string attributes via `Query.search()`
- Enable full-text index on: `name`, `address`, `description` in the stores collection
- Search should match on store name, address/area, and description
- **Do NOT search products from the main search bar** — keep it store-level

### 4.3 Search UX
- Add **search debounce** (300ms) — already flagged in codebase analysis, must fix
- Show "No results for X" empty state
- Show recent searches (stored locally in AsyncStorage, max 5)
- Search results should also be distance-sorted if location is available

### 4.4 Filter Improvements
- Keep existing category filter pills
- Add: distance range filter (e.g. within 1km / 5km / 10km / any)
- Add: sort toggle (Nearest / Newest / A-Z)

---

## 5. Appwrite Database Schema

### 5.1 Stores Collection — Fields to Add

| Field | Type | Notes |
|-------|------|-------|
| `images` | String[] | Array of Appwrite Storage file IDs (1–5 images). **Add before image upload feature.** |
| `phone` | String | Contact number, optional |
| `opening_hours` | String | Free-text e.g. "Mon-Sat 9am-8pm", optional |
| `category` | String | Top-level store category (enum-like) |
| `is_active` | Boolean | Soft-delete / hide store without deleting |
| `owner_id` | String | Appwrite userId — already likely exists, verify |
| `product_count` | Integer | Denormalized count for display, updated on product add/remove |

### 5.2 Products Sub-Collection — New Collection

| Field | Type | Notes |
|-------|------|-------|
| `store_id` | String | Reference to parent store |
| `name` | String | Product name |
| `price` | Float | Optional |
| `description` | String | Optional |
| `image_id` | String | Appwrite Storage file ID, optional |
| `category` | String | Owner-defined category label (free text) |
| `owner_id` | String | Same as parent store's owner_id |
| `created_at` | DateTime | Auto |

### 5.3 Indexes to Add
- `stores.name` — full-text index for search
- `stores.address` — full-text index for search  
- `stores.description` — full-text index for search
- `stores.owner_id` — for My Stores queries
- `products.store_id` — for fetching products by store
- `products.category` — for grouping by owner-defined category

---

## 6. Profile Page

### 6.1 Current State
Basic profile with logout. Very sparse.

### 6.2 What to Add
- **User avatar** (from Google OAuth or upload)
- **Display name** (editable)
- **Email** (display only)
- **"My Stores" shortcut** — tapping opens My Stores tab or inline list
- **"Add a Store" CTA** — prominent button
- **Stats row:** Number of stores owned, total products listed *(nice to have)*
- **Settings section:**
  - Notification preferences (future)
  - Clear search history
  - App version display
- **Logout** — move to bottom, make less prominent (currently feels like the main action)
- **Account deletion** option (required for App Store compliance)

### 6.3 My Stores Page
- List all user's stores with edit/delete actions per store
- Quick toggle to show/hide a store (`is_active` flag) without deleting
- Show product count per store
- "Add New Store" button at top

---

## 7. Performance & Stability

### 7.1 App Size
- Target: **under 30MB** install size
- Avoid bundling large assets — use remote images via Appwrite Storage
- Keep font files to minimum (already using Rubik family — acceptable)
- No unnecessary native modules

### 7.2 Performance
- Add `React.memo()` to `Cards.tsx`, `FeaturedCard.tsx`, `StoreCard.tsx`
- Add `windowSize`, `removeClippedSubviews`, `getItemLayout` to FlatList in `index.tsx`
- Debounce search (300ms)
- Increase cache TTL from 30s to at least **5 minutes** for store lists
- Lazy-load store images with placeholder skeletons
- Avoid re-calculating distances on every render — memoize with `useMemo`

### 7.3 Offline Support
- Cache last-fetched store list in **AsyncStorage** (key: `cached_stores`)
- On app open with no network: show cached stores with a "Offline — showing cached results" banner
- Cache TTL for offline data: 24 hours
- Store detail page: cache last-viewed store details

### 7.4 Low-Data / Slow Network
- Show skeleton loaders instead of spinners
- Images should load progressively / lazily
- Paginate store list (already exists — keep it, maybe reduce page size to 10)
- Use compressed image variants from Appwrite (use width/height transform params)

### 7.5 Crash Resistance
- Add null coalescing everywhere store fields are accessed (`store?.agent?.email ?? ''`)
- Wrap each screen in an error boundary (not just root layout)
- Handle all async failures with user-friendly messages — no raw exception text shown
- Add retry logic with exponential backoff in `api.ts` (max 3 retries)
- Fix pagination race condition in `index.tsx` (requestVersionRef fragility)

---

## 8. UI / Design Direction

### 8.1 Principles
- Keep the existing **light, bright theme** — do not change the color palette drastically
- Make it feel polished and premium without being heavy
- Simple, uncluttered layouts — information hierarchy matters

### 8.2 Specific Improvements
- Add **skeleton loaders** for store cards while loading
- Add **toast notifications** for success actions (store created, edited, deleted)
- Smooth **tab bar transitions** (already likely fine with Expo Router)
- Empty states should have illustration + helpful CTA (not just "No stores found")
- Image carousel on store detail page (for multiple images)
- Pull-to-refresh on Home, My Stores, and Store Detail pages

### 8.3 Do NOT Change
- Overall color scheme
- Font family (Rubik)
- Tab bar layout
- General card style — just refine, don't redesign

---

## 9. Future / Roadmap (Do Not Build Now)

### 9.1 Recommender System
- State-of-the-art personalized store recommendations
- Should be **fast** (pre-computed, not real-time ML at request time)
- Should provide **diversity** (not just show the same type of store repeatedly)
- Candidate approach: collaborative filtering + content-based hybrid, served via the existing FastAPI backend
- Input signals: viewed stores, search queries, location, time-of-day, category clicks
- This is a future phase — design the data model now (add `user_events` collection to Appwrite for tracking) but don't implement the ML yet

### 9.2 Push Notifications
- New store opened nearby
- Promotions from favorited stores

### 9.3 Favorites / Saved Stores
- Bookmark stores for quick access

### 9.4 Social Sharing
- Share store link (deep link) to WhatsApp / other apps

### 9.5 Store Moderation
- Admin approval before a store goes live

---

## 10. Code Quality (Non-Negotiable)

- Replace all `any` types with proper `Store`, `Product`, `User` interfaces
- Enable TypeScript strict mode
- Extract shared `loadMyStores` logic into a custom hook (currently duplicated in `my-stores.tsx` and `profile.tsx`)
- Remove all `console.log` calls from production builds (use `__DEV__` guard)
- No PII in logs (user objects, redirect URIs)
- Input validation on all forms (store name, email, password, coordinates)

---

## 11. Open Questions (Resolve During Planning)

1. **Search backend:** Use Appwrite `Query.search()` or proxy through FastAPI backend with a search index? Appwrite is simpler; FastAPI gives more control.
2. **Image storage:** Use Appwrite Storage buckets or a CDN? Appwrite is already integrated — use it, but add image compression on upload.
3. **Products:** Store as Appwrite sub-collection or as a JSON array field on the store document? Sub-collection is cleaner and queryable; JSON array is simpler. Recommend sub-collection.
4. **Auth unification:** When a user signs in with both Google and email — are they the same account? Appwrite handles this at the identity level — verify behavior and document it.
5. **Offline images:** Should offline mode show placeholder images or attempt to load from cache? Expo Image has built-in disk cache — leverage it.

---

*Document version: 1.0 — compiled from founder notes + CODEBASE_ANALYSIS.md*
*Last updated: 2026-04-11*
