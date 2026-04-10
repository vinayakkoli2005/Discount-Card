# VoLo (Vocal for Local) — Execution Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Evolve the existing discount-card Expo app into **VoLo**, a hyperlocal store discovery platform with store creation, product sub-collections, email/password auth, full-text search, offline support, and production-ready stability.

**Architecture:** Keep current stack — Expo Router + React Native 0.81 + NativeWind front end; FastAPI (Render) + Appwrite Cloud back end. Extend Appwrite schema (images, products, indexes), introduce a shared hooks/service layer, and migrate broken search to `Query.search()`. No rewrites.

**Tech Stack:** Expo 54 / RN 0.81 / React 19 / Expo Router 6 / NativeWind 4 / Appwrite 21 / FastAPI (Render) / Sentry / AsyncStorage / Expo Image.

---

## 1. Project Overview (Current State)

**What works today**
- Expo Router app with protected `(root)` layout, tab nav (Home / My Stores / Profile)
- Google OAuth via Appwrite (`lib/appwrite.ts`)
- Store list + search + category filters + Haversine distance sort (`app/(root)/(tabs)/index.tsx`)
- Store detail page (`app/(root)/stores/[id].tsx`)
- Store creation with map picker (`add-store.tsx`, `pick-location.tsx`)
- FastAPI client with in-memory request cache + dedupe (`lib/api.ts`, `lib/request-cache.ts`)
- Sentry wired as stub; NativeWind + Rubik fonts active

**What is broken / fragile**
- Search is a linear client match, not Appwrite FTS
- `any` types throughout `my-stores.tsx`, `profile.tsx`, store consumers
- Pagination race condition in `index.tsx` (`requestVersionRef`)
- Duplicated `loadMyStores` logic across `my-stores.tsx` and `profile.tsx`
- Cache TTL 30 s causes redundant network calls
- No error boundaries per screen; unsafe null access on `store.agent.email`, image URIs
- API keys (Google Maps, Appwrite project) shipped in `.env` unchecked
- Console logs leaking PII (`sign-in.tsx:26-28`, `appwrite.ts:77,85`)
- No tests, no retry logic, no session expiry handling, no toasts

---

## 2. Gap Analysis (Requirements vs Codebase)

| Requirement (REQUIREMENTS.md §) | Current | Gap | Priority |
|---|---|---|---|
| §2.2 Store images 1–5 in Appwrite | Single image field only | Add `images: String[]` to stores collection | **High** |
| §2.2 Phone / opening_hours / category | Missing | Add fields + UI | **High** |
| §2.3 Products sub-collection | Does not exist | New collection + CRUD + UI | **High** |
| §2.4 Edit store | No edit path | New edit screen + API | **High** |
| §2.5 Multiple stores per user | Works; no soft delete | Add `is_active` toggle | Medium |
| §3.2 Email/password auth | Missing | Add Appwrite email auth + UI | **High** |
| §3.3 Session expiry handling | 401s crash | Global interceptor + redirect | **High** |
| §4.2 Appwrite full-text search | Linear client match | Enable FTS indexes + `Query.search()` | **High** |
| §4.3 Debounce, recent searches, empty state | Missing | Implement | Medium |
| §4.4 Distance range filter + sort toggle | Missing | Implement | Medium |
| §5 Schema updates + indexes | Missing | Migrate Appwrite schema | **High (blocker)** |
| §6 Profile overhaul (avatar, stats, delete account) | Sparse | Rebuild profile | Medium |
| §7.2 Perf (memo, FlatList opts, TTL 5 min) | Missing | Apply | Medium |
| §7.3 Offline AsyncStorage cache + banner | Missing | Implement | Medium |
| §7.5 Crash resistance, retry, null safety | Fragile | Harden | **High** |
| §8.2 Skeletons, toasts, pull-to-refresh, carousel | Missing | Implement | Medium |
| §9.1 `user_events` data model for recsys | Missing | Add collection only (no ML) | Low |
| §10 Strict TS, no `any`, `__DEV__` logs, validation | Violated | Clean up | **High** |
| §7.2 App size < 30 MB | Unknown | Measure + audit | Medium |

---

## 3. Feature-wise Execution Plan

### Phase 0 — Foundation & Critical Fixes (Blockers, do first)

#### 0.1 Secrets & key hardening
- **Description:** Restrict exposed API keys, scrub `.env` from git, rotate.
- **Files:** `.env`, `.gitignore`, `app.json` (ensure `EXPO_PUBLIC_*` gated), Google Cloud Console (manual), Appwrite Console (manual).
- **Tasks:**
  - [ ] Add `.env` to `.gitignore`; commit a `.env.example`.
  - [ ] Rotate Google Maps key; restrict to Android/iOS package name + SHA-1 in Cloud Console.
  - [ ] Verify Appwrite collection permissions (read: any; write: user-authenticated, owner-only for mutate).
  - [ ] Remove `console.log` PII (`sign-in.tsx:26-28`, `appwrite.ts:77,85`) behind `if (__DEV__)`.
- **Backend/API:** None.
- **Priority:** **High**.

#### 0.2 TypeScript strict mode + type cleanup
- **Files:** `tsconfig.json`, `lib/types/store.ts`, `lib/types/product.ts` (new), `lib/types/user.ts` (new), `app/(root)/(tabs)/my-stores.tsx`, `app/(root)/(tabs)/profile.tsx`, `components/Cards.tsx`, `components/StoreCard.tsx`, `components/FeaturedCard.tsx`.
- **Tasks:**
  - [ ] Enable `"strict": true, "noUncheckedIndexedAccess": true` in `tsconfig.json`.
  - [ ] Expand `Store` interface to match new schema (images[], phone, opening_hours, category, is_active, owner_id, product_count).
  - [ ] Create `Product`, `User` interfaces in `lib/types/`.
  - [ ] Replace every `useState<any[]>` and `Models.Document` shim with typed equivalents.
  - [ ] Fix resulting compile errors screen-by-screen.
- **Priority:** **High**.

#### 0.3 Appwrite schema migration (BLOCKER for store images, products, FTS)
- **Description:** Extend Appwrite DB before building features that depend on it.
- **Files:** `scripts/migrate-appwrite.ts` (new), `docs/appwrite-schema.md` (new).
- **Schema changes** (to be applied via Appwrite Console or `node-appwrite` script):
  - `stores` collection — add attributes:
    - `images: String[]` (size 64, max 5)
    - `phone: String` (size 32, optional)
    - `opening_hours: String` (size 128, optional)
    - `category: String` (size 64, required)
    - `is_active: Boolean` (default `true`)
    - `owner_id: String` (size 64, required) — verify exists
    - `product_count: Integer` (default 0)
  - `stores` indexes:
    - `name` — fulltext
    - `address` — fulltext
    - `description` — fulltext
    - `owner_id` — key (for My Stores query)
    - `is_active` — key (for hiding soft-deleted)
  - `products` collection (new):
    - `store_id: String` (size 64, required)
    - `name: String` (size 128, required)
    - `price: Float` (optional)
    - `description: String` (size 1024, optional)
    - `image_id: String` (size 64, optional)
    - `category: String` (size 64, required)
    - `owner_id: String` (size 64, required)
    - `created_at: DateTime` (auto)
  - `products` indexes: `store_id` (key), `category` (key), `owner_id` (key)
  - `user_events` collection (stub for future recsys):
    - `user_id`, `event_type`, `store_id`, `query`, `category`, `created_at`
  - Storage bucket `store-images` — permissions: authenticated write, public read, max 5 MB/file.
- **Tasks:**
  - [ ] Write `scripts/migrate-appwrite.ts` using `node-appwrite` SDK; idempotent (check if attribute exists before create).
  - [ ] Run against dev project, verify in console.
  - [ ] Commit schema doc to `docs/appwrite-schema.md`.
- **Priority:** **High (blocker)**.

#### 0.4 Null safety & error boundaries
- **Files:** `app/(root)/stores/[id].tsx`, `components/Cards.tsx`, `components/StoreCard.tsx`, `components/FeaturedCard.tsx`, `components/ErrorBoundary.tsx` (new), `app/(root)/(tabs)/_layout.tsx`.
- **Tasks:**
  - [ ] Create `components/ErrorBoundary.tsx` (class component with fallback UI + `Sentry.captureException`).
  - [ ] Wrap each tab screen in an error boundary.
  - [ ] Replace unsafe accesses with `store?.agent?.email ?? ''` etc.
  - [ ] Add `source={{ uri: imageUri || DEFAULT_STORE_PLACEHOLDER }}` fallback.
- **Priority:** **High**.

#### 0.5 Shared data-fetching hook (eliminate duplication)
- **Files:** `lib/hooks/useMyStores.ts` (new), `app/(root)/(tabs)/my-stores.tsx`, `app/(root)/(tabs)/profile.tsx`.
- **Tasks:**
  - [ ] Extract `loadMyStores` logic into `useMyStores()` hook returning `{ stores, loading, error, refetch }`.
  - [ ] Include unmount cleanup via `AbortController` / `isMounted` flag.
  - [ ] Replace duplicated implementations in both screens.
- **Priority:** **High**.

---

### Phase 1 — MVP Features (Core VoLo)

#### 1.1 Email/password authentication
- **Description:** Add Appwrite email auth alongside Google OAuth.
- **Files:**
  - `lib/appwrite.ts` — add `signUpWithEmail`, `signInWithEmail`, `sendPasswordRecovery`.
  - `app/sign-in.tsx` — add email form, toggle between sign-in / sign-up, "Forgot password" link.
  - `lib/validation.ts` (new) — email regex + password strength (min 8 chars).
  - `app/password-reset.tsx` (new) — recovery flow.
- **Backend:** None (Appwrite handles).
- **APIs:** `account.create()`, `account.createEmailPasswordSession()`, `account.createRecovery()`, `account.updateRecovery()`.
- **Tasks:**
  - [ ] Wire email/password auth in `appwrite.ts`.
  - [ ] Redesign `sign-in.tsx` with tabs (Sign In / Sign Up) keeping existing Google button.
  - [ ] Client-side validation (email format, password ≥ 8).
  - [ ] Password recovery screen.
  - [ ] Handle Appwrite identity-unification: document behavior in `docs/auth.md`.
- **Priority:** **High**.

#### 1.2 Session expiry & API retry layer
- **Files:** `lib/api.ts`, `lib/global-provider.tsx`, `lib/api-client.ts` (new thin wrapper), `app/_layout.tsx`.
- **Tasks:**
  - [ ] Create `fetchWithRetry(url, opts, { retries: 3, backoff: 'expo' })`.
  - [ ] On 401: call `logout()` from global context, redirect to `/sign-in`.
  - [ ] On 429: honour `Retry-After` header.
  - [ ] Surface structured errors with `err.code` / `err.message` (stop throwing raw "Failed to fetch stores").
- **Priority:** **High**.

#### 1.3 Store schema & creation flow (with multi-image upload)
- **Files:** `app/add-store.tsx`, `lib/appwrite.ts` (storage helpers), `lib/image-upload.ts` (new), `components/ImagePickerGrid.tsx` (new).
- **Tasks:**
  - [ ] Add form fields: phone, opening_hours, category (Picker from predefined list), description.
  - [ ] Multi-image picker (1–5) with add/remove thumbnails and per-image upload progress.
  - [ ] Compress images client-side (`expo-image-manipulator`, width ≤ 1280, quality 0.7) before upload.
  - [ ] Upload to Appwrite `store-images` bucket → collect file IDs → set `images` on store doc.
  - [ ] Validate form (name req, coords req, category req, at least 1 image).
  - [ ] On success: toast + navigate to My Stores.
- **Priority:** **High**.

#### 1.4 Products sub-collection CRUD
- **Files:**
  - `lib/products.ts` (new) — Appwrite product queries.
  - `app/(root)/stores/[id]/products/add.tsx` (new).
  - `app/(root)/stores/[id]/products/[productId].tsx` (new, edit).
  - `app/(root)/stores/[id].tsx` — render grouped product list (group by owner-defined `category`).
  - `components/ProductCard.tsx` (new).
  - `components/ProductCategorySection.tsx` (new).
- **Tasks:**
  - [ ] `listProductsByStore(storeId)` → `Query.equal('store_id', …)` + group client-side by `category`.
  - [ ] Add product form (name, price, description, category, optional image).
  - [ ] Edit / delete product with owner-only guard (`owner_id === currentUser.$id`).
  - [ ] Increment/decrement `product_count` on parent store (use Appwrite `updateDocument` with optimistic count).
  - [ ] Render on store detail page as collapsible sections.
- **Priority:** **High**.

#### 1.5 Edit store
- **Files:** `app/(root)/stores/[id]/edit.tsx` (new), `lib/appwrite.ts` (`updateStore`), `app/(root)/(tabs)/my-stores.tsx`.
- **Tasks:**
  - [ ] Reuse `add-store.tsx` form as a controlled component `StoreForm` for both create and edit.
  - [ ] Owner guard (`store.owner_id === user.$id`) or redirect.
  - [ ] Individual image add/remove against the `images[]` field; delete removed files from storage.
  - [ ] Access from store detail (pencil icon if owner) and from My Stores card action.
- **Priority:** **High**.

#### 1.6 Appwrite full-text search
- **Files:** `lib/appwrite.ts` (`searchStores`), `lib/api.ts` (remove linear search), `app/(root)/(tabs)/index.tsx`, `components/Search.tsx`.
- **Tasks:**
  - [ ] Use `Query.search('name', term)` with fallback to address/description via `Query.or`.
  - [ ] Client-side distance sort of returned results if location permission granted.
  - [ ] 300 ms debounce (already have `use-debounce` dependency).
  - [ ] Empty state: "No results for '<term>'" with illustration.
  - [ ] Recent searches in AsyncStorage (`recent_searches`, FIFO max 5) shown when input focused/empty.
- **Priority:** **High**.

#### 1.7 Location-optional UX
- **Files:** `app/(root)/(tabs)/index.tsx`, `lib/location.ts` (new), `components/LocationBanner.tsx` (new).
- **Tasks:**
  - [ ] Extract location logic into `useUserLocation()` hook with permission states (`granted | denied | undetermined`).
  - [ ] Gentle banner "Enable location for nearby stores" if `denied | undetermined`.
  - [ ] Fallback sort: newest first (or alphabetical) when no location.
- **Priority:** **High**.

---

### Phase 2 — Enhancements (UX, Perf, Profile)

#### 2.1 Profile overhaul
- **Files:** `app/(root)/(tabs)/profile.tsx`, `components/ProfileHeader.tsx` (new), `components/SettingsRow.tsx` (new), `app/account/delete.tsx` (new).
- **Tasks:**
  - [ ] Avatar (from Google OAuth or manual upload), editable display name, email (read-only).
  - [ ] Stats row: store count (from `useMyStores`), total products (sum `product_count`).
  - [ ] Shortcuts: "My Stores", "Add a Store" CTA.
  - [ ] Settings: clear search history, app version (from `expo-application`), notification prefs (stub).
  - [ ] Demote logout to bottom.
  - [ ] Account deletion (Appwrite `account.deleteIdentity` + confirm modal) — App Store compliance.
- **Priority:** Medium.

#### 2.2 My Stores overhaul
- **Files:** `app/(root)/(tabs)/my-stores.tsx`, `components/MyStoreRow.tsx` (new).
- **Tasks:**
  - [ ] List all stores; per-row actions: Edit, Toggle active (`is_active`), Delete (confirm).
  - [ ] Show product_count badge.
  - [ ] "Add New Store" button pinned top.
- **Priority:** Medium.

#### 2.3 Advanced filters + sort
- **Files:** `components/Filters.tsx`, `components/DistanceFilter.tsx` (new), `components/SortToggle.tsx` (new), `app/(root)/(tabs)/index.tsx`.
- **Tasks:**
  - [ ] Distance chips: 1 km / 5 km / 10 km / Any (disabled when no location).
  - [ ] Sort toggle: Nearest / Newest / A–Z.
  - [ ] Persist user's filter choice in local state (not AsyncStorage for now).
- **Priority:** Medium.

#### 2.4 Toasts, skeletons, pull-to-refresh, carousel
- **Files:** `lib/toast.tsx` (new, simple context-based toaster), `components/Skeletons.tsx` (new), `components/ImageCarousel.tsx` (new), store detail + list screens.
- **Tasks:**
  - [ ] Minimal toast context (no new dependency); success/error/info variants.
  - [ ] Store card skeleton + detail skeleton.
  - [ ] `RefreshControl` on Home, My Stores, Store Detail.
  - [ ] Image carousel on store detail (horizontal FlatList + dots).
- **Priority:** Medium.

#### 2.5 Performance hardening
- **Files:** `lib/request-cache.ts`, `components/Cards.tsx`, `components/FeaturedCard.tsx`, `components/StoreCard.tsx`, `app/(root)/(tabs)/index.tsx`.
- **Tasks:**
  - [ ] Raise TTL from 30 s to **5 min** (`CACHE_TTL_MS = 5 * 60 * 1000`).
  - [ ] `React.memo` on all card components with shallow props comparison.
  - [ ] FlatList: `initialNumToRender={8}`, `windowSize={5}`, `removeClippedSubviews`, `getItemLayout` (fixed card height).
  - [ ] Reduce page size to 10.
  - [ ] Memoize distance calc per-store in a `WeakMap` keyed by store id + user coords tuple.
  - [ ] Fix pagination race: replace `requestVersionRef` with `AbortController` per fetch.
  - [ ] Use Appwrite image transform params (`width`, `quality`) for thumbnails.
- **Priority:** Medium.

#### 2.6 Offline support
- **Files:** `lib/offline-cache.ts` (new), `lib/api.ts`, `lib/global-provider.tsx`, `components/OfflineBanner.tsx` (new).
- **Tasks:**
  - [ ] `@react-native-async-storage/async-storage` (add dep).
  - [ ] Persist last successful `fetchStores()` response (key `cached_stores`, TTL 24 h).
  - [ ] On network failure: fall back to cached list + show `OfflineBanner`.
  - [ ] Cache last-viewed store detail (key `store:<id>`).
  - [ ] Use Expo Image's built-in disk cache for images (default on).
- **Priority:** Medium.

---

### Phase 3 — Scale & Production Readiness

#### 3.1 Testing
- **Files:** `__tests__/`, `jest.config.js`, `package.json`.
- **Tasks:**
  - [ ] Add `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`.
  - [ ] Unit tests: `lib/distance.ts`, `lib/validation.ts`, `lib/request-cache.ts`, `lib/offline-cache.ts`, retry logic.
  - [ ] Component tests: `Cards`, `Search` (debounce), `Filters`.
  - [ ] Integration: store create flow (mock Appwrite), sign-in flow, product CRUD.
  - [ ] Add `test` script; target 60 % coverage on `lib/`.
- **Priority:** Medium.

#### 3.2 Sentry full activation
- **Files:** `app/_layout.tsx`, `sentry.properties`, `app.json`.
- **Tasks:**
  - [ ] Initialize `sentry-expo` with DSN via `EXPO_PUBLIC_SENTRY_DSN`.
  - [ ] Wrap root with `Sentry.Native.wrap()`.
  - [ ] Breadcrumb on auth and API failure.
  - [ ] Source maps upload in EAS Build.
- **Priority:** Medium.

#### 3.3 Analytics & recsys data collection (no ML yet)
- **Files:** `lib/analytics.ts` (new), any screen that logs events.
- **Tasks:**
  - [ ] Lightweight `track(event, props)` that writes to `user_events` collection (best-effort, no await).
  - [ ] Emit: `store_viewed`, `search_performed`, `category_clicked`, `store_created`.
- **Priority:** Low.

#### 3.4 CI/CD & store submission prep
- **Files:** `.github/workflows/ci.yml` (new), `eas.json`, `app.json`.
- **Tasks:**
  - [ ] GitHub Actions: `expo lint`, `tsc --noEmit`, `jest`.
  - [ ] EAS Build profiles: `development`, `preview`, `production`.
  - [ ] App Store metadata: privacy policy URL, screenshots, category, description.
- **Priority:** Medium.

---

## 4. Architecture Improvements

- **Introduce `lib/hooks/`** directory. Extract: `useMyStores`, `useUserLocation`, `useDebouncedSearch`, `useStoreDetail`. Kills the duplication flagged in CODEBASE_ANALYSIS §4.
- **Introduce `lib/types/`** as the single source of truth for `Store`, `Product`, `User`, `Category`, `LocationState`. Import throughout.
- **Thin service layer** (`lib/services/stores.ts`, `lib/services/products.ts`) that wraps Appwrite SDK. Screens should never call `databases.listDocuments` directly.
- **Consolidate API client**: the FastAPI client (`lib/api.ts`) and Appwrite client (`lib/appwrite.ts`) currently overlap. **Decision:** FastAPI owns public read-side aggregation + caching; Appwrite owns writes + auth + FTS (§4.2). Document this in `docs/data-architecture.md`.
- **Error-handling contract:** every async boundary returns `Result<T, AppError>` or throws `AppError` with `code` and `userMessage`. Centralized in `lib/errors.ts`.
- **Do not rewrite** existing working screens. Refactor in place.

---

## 5. Database / Schema Updates

See Phase 0.3 for the full migration script. Summary:

**Stores collection** — add `images[]`, `phone`, `opening_hours`, `category`, `is_active`, `owner_id` (verify), `product_count`; add fulltext indexes on `name`, `address`, `description`; key indexes on `owner_id`, `is_active`.

**Products collection (new)** — `store_id`, `name`, `price`, `description`, `image_id`, `category`, `owner_id`, `created_at`; key indexes on `store_id`, `category`, `owner_id`.

**User events collection (new, recsys stub)** — `user_id`, `event_type`, `store_id`, `query`, `category`, `created_at`. No indexes yet.

**Storage bucket `store-images`** — public read, authenticated write, max 5 MB, allowed extensions jpg/png/webp.

---

## 6. API Design / Changes

**FastAPI (`discount-card-api.onrender.com`) — keep, refine**
- `GET /stores/` — support `?limit=10&offset=0&category=&sort=newest|nearest|alpha&lat=&lng=&radius_km=` (sort/radius computed server-side if feasible, else client-side).
- `GET /stores/{id}` — return store + embedded `product_count`.
- Response envelope: `{ data, meta: { total, offset, limit } }` — stop returning bare arrays.
- Error envelope: `{ error: { code, message } }`.

**Appwrite (direct from client) — writes, auth, search**
- Writes: `createStore`, `updateStore`, `deleteStore`, `createProduct`, `updateProduct`, `deleteProduct`.
- Auth: email/password + OAuth + recovery.
- Search: `databases.listDocuments(DB, STORES, [Query.search('name', term)])`.

**Do NOT** add a new service. Reuse existing FastAPI for read aggregation, Appwrite for everything else.

---

## 7. Performance Improvements

Covered in Phase 2.5. Targets:

| Metric | Current | Target |
|---|---|---|
| Cold start (mid-range Android) | unmeasured | < 3 s |
| Home list first paint | unmeasured | < 1.5 s (cached), < 3 s (cold) |
| Install size | unmeasured | < 30 MB |
| Cache TTL | 30 s | 5 min (online) / 24 h (offline) |
| Search latency | linear scan | < 400 ms (Appwrite FTS) |
| List re-render cost | unmemoized | memoized cards, fixed `getItemLayout` |

---

## 8. Deployment Plan

**Backend (FastAPI on Render)**
- Keep single-service deploy. Add `/health` endpoint if missing. Pin Python version in `runtime.txt`. Configure Render auto-deploy from `main`.

**Appwrite**
- Manual schema migration via `scripts/migrate-appwrite.ts`, run once per environment (dev → prod).
- Document project IDs per env in `.env.example` (no secrets).

**Mobile**
- **EAS Build** profiles: `development` (dev client), `preview` (internal TestFlight / internal Play track), `production` (store submission).
- **Env handling:** Expo `app.config.ts` reading `EXPO_PUBLIC_*` vars; separate `.env.development` / `.env.production`.
- **Rolling release:** Play Console staged rollout 10 % → 50 % → 100 %.
- **OTA updates:** `expo-updates` for non-native fixes.
- **Secrets:** Google Maps API key restricted to bundle identifier + SHA-1; never log.

---

## 9. Testing Strategy

- **Unit** (`jest-expo`): `lib/distance.ts`, `lib/validation.ts`, `lib/request-cache.ts`, `lib/offline-cache.ts`, retry helper. Fast, pure, high coverage.
- **Component** (`@testing-library/react-native`): `Cards`, `Search` (debounce), `Filters`, `ErrorBoundary`, `ImagePickerGrid`.
- **Integration** (mocked Appwrite + FastAPI): sign-in, store create (with image upload), product CRUD, search.
- **Manual smoke checklist** per release (`docs/release-checklist.md`): cold start, sign-in (both methods), create store w/ images, edit store, add product, search, filter, offline mode, logout, delete account.
- **E2E (future)**: Maestro flows for critical paths — do not block MVP on this.
- **TDD discipline** for new `lib/` modules (validation, retry, offline cache) — write tests first.

---

## 10. Priorities Summary

### **High** (Phase 0 + 1 — blocks MVP)
1. Secrets hardening (0.1)
2. TypeScript strict + type cleanup (0.2)
3. **Appwrite schema migration (0.3) — BLOCKER**
4. Null safety + error boundaries (0.4)
5. Shared `useMyStores` hook (0.5)
6. Email/password auth (1.1)
7. Session expiry + retry (1.2)
8. Store creation w/ multi-image + new fields (1.3)
9. Products CRUD (1.4)
10. Edit store (1.5)
11. Appwrite FTS + debounced search (1.6)
12. Location-optional UX (1.7)

### **Medium** (Phase 2 — polish & production feel)
1. Profile + My Stores overhaul (2.1, 2.2)
2. Advanced filters (2.3)
3. Toasts/skeletons/pull-to-refresh/carousel (2.4)
4. Performance hardening (2.5)
5. Offline support (2.6)
6. Testing (3.1)
7. Sentry full activation (3.2)
8. CI/CD + store submission prep (3.4)

### **Low** (Phase 3 / future)
1. Analytics + `user_events` collection (3.3)
2. Recsys ML (§9.1 future)
3. Push notifications (§9.2 future)
4. Favorites (§9.3 future)
5. Social sharing / deep links (§9.4 future)
6. Store moderation (§9.5 future)

---

## Execution Handoff

Two options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per Phase-0/Phase-1 feature with its own task block, review between tasks. Use `superpowers:subagent-driven-development`.
2. **Inline Execution** — work through phases in this session with checkpoints. Use `superpowers:executing-plans`.

**Start with Phase 0.3 (Appwrite schema) — it blocks nearly every subsequent feature.**
