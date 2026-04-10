# Codebase Analysis: Discount Card App

## 1. High-Level Architecture

### Tech Stack
- **Frontend:** Expo 54, React Native 0.81, React 19
- **Routing:** Expo Router (file-based, `/app` directory)
- **Styling:** NativeWind (Tailwind CSS for RN) + Rubik fonts
- **State Management:** React Context API (`GlobalProvider`) + `useState`/`useCallback`
- **Backend:** FastAPI on Render (`https://discount-card-api.onrender.com`)
- **BaaS:** Appwrite Cloud (auth, document DB, file storage)
- **Maps:** React Native Maps + Google Places Autocomplete
- **Auth:** Google OAuth 2.0 via Appwrite
- **Error Tracking:** Sentry (configured but not fully active)

### Navigation Structure
```
/sign-in                    - Google OAuth login
/(root)                     - Protected (AppLayout guard)
  /(tabs)
    index.tsx               - Store exploration/search
    my-stores.tsx           - User's created stores
    profile.tsx             - User profile & logout
  /stores/[id]              - Store detail
  /properties/[id]          - Property detail (unused)
/add-store                  - Create new store
/pick-location              - Map-based location picker
```

---

## 2. Data Flow

### Authentication
1. User opens app → `AppLayout` checks `useGlobalContext` for session
2. No session → redirect to `/sign-in`
3. `login()` → opens browser for Google OAuth via Appwrite
4. OAuth callback → extracts `userId`/`secret` from redirect URL
5. `account.createSession(userId, secret)` → Appwrite session created
6. `getCurrentUser()` → populates global context → redirect to home

### Store Fetching
1. Home screen calls `fetchStores()` via `lib/api.ts`
2. Request passes through `cachedRequest()` in `request-cache.ts` (30s TTL)
3. API client → `GET https://discount-card-api.onrender.com/stores/`
4. Response cached with request deduplication
5. Distance calculation (Haversine) sorts results by proximity if location enabled
6. `FlatList` renders with pagination

### Store Creation
1. User fills form in `/add-store` → picks location via `/pick-location`
2. Optional image upload via `expo-image-picker`
3. `createStore()` → `POST /stores/` to backend
4. Success → navigate to `/my-stores`

---

## 3. Folder/File Structure

```
/app/                       - Expo Router pages
  (root)/(tabs)/index.tsx   - Home/explore screen (search, filters, store list)
  (root)/(tabs)/my-stores.tsx - User's own stores
  (root)/(tabs)/profile.tsx - Profile & logout
  (root)/stores/[id].tsx    - Store detail page
  add-store.tsx             - Store creation form
  pick-location.tsx         - Map location picker
  sign-in.tsx               - OAuth login screen
  _layout.tsx               - Root layout with fonts & Sentry

/components/
  Cards.tsx                 - Store card (grid view)
  FeaturedCard.tsx          - Featured/horizontal store card
  Filters.tsx               - Category filter pills
  Search.tsx                - Search bar component
  StoreCard.tsx             - List-view store card

/lib/
  appwrite.ts               - Appwrite client, auth functions, DB/storage queries
  api.ts                    - REST API client (fetch wrapper)
  useAppwrite.ts            - Custom hook for async data fetching
  global-provider.tsx       - Global auth/user context
  request-cache.ts          - Request dedup & TTL cache
  distance.ts               - Haversine distance calculation
  data.ts                   - Data transformation utilities
  types/store.ts            - TypeScript interfaces
  seed.ts                   - Data seeding utilities

/constants/                 - Categories, icons, static images
/assets/                    - Fonts (Rubik family), images
```

---

## 4. Code Quality Issues & Anti-Patterns

### Critical

- **Exposed API Keys in `.env`:**
  - Appwrite Project ID: `695272a5002c9fe4b025`
  - Google Maps API Key: `AIzaSyDGVnAkQrNaE8aEgemJ1SujWYjNzyZrUpM`
  - These ship in the app binary and are extractable by anyone

- **Pervasive `any` types:**
  - `my-stores.tsx:12` — `useState<any[]>([])`
  - `profile.tsx:14` — `useState<any[]>([])`
  - Components receive `Models.Document` without proper typing

- **No error boundaries** on individual screens; only root layout has one

- **Unsafe null access:**
  - `stores/[id].tsx` accesses `store.agent.email` without null coalescing
  - `Image` components receive potentially-undefined `uri` without fallback

### Anti-Patterns

- **Duplicated fetch logic:** `MyStores.tsx` and `Profile.tsx` have identical `loadMyStores` implementations (~20 lines each)
- **Missing `useCallback` deps:** `index.tsx:45` — `useFocusEffect` depends on `debouncedQuery` but recreates on every render
- **Inconsistent error handling:**
  - `api.ts` throws generic "Failed to fetch stores", losing backend error details
  - `useAppwrite.ts` shows `Alert` on every error (spammy during retries)
  - Some async functions silently catch and log
- **Pagination race condition:** `requestVersionRef` prevents stale updates, but is fragile under rapid filter changes
- **Console logging PII:** `sign-in.tsx:26-28` logs user info; `appwrite.ts:77,85` logs redirect URIs

---

## 5. Performance Bottlenecks

| Issue | Location | Impact |
|-------|----------|--------|
| No `React.memo()` on card components | `Cards.tsx`, `FeaturedCard.tsx` | Unnecessary re-renders in lists |
| Distance calculated for ALL stores on every sort | `index.tsx` `displayStores` useMemo | CPU spike on large datasets |
| Cache TTL too short (30s) | `request-cache.ts` | Frequent cache misses, redundant requests |
| No image caching layer | Store images via Expo Image | Fresh fetch every render |
| FlatList not optimized | `index.tsx` | No `windowSize`, no `removeClippedSubviews` |
| No search debounce | `Search.tsx` | Rapid typing spams API requests |
| Memory leak risk | `Profile.tsx`, `MyStores.tsx` | No unmount cleanup for async ops |

---

## 6. Security Issues

### High Severity

| Issue | Details |
|-------|---------|
| **Google Maps API key exposed** | `.env` → compiled into binary. Must restrict to Android/iOS package names in Google Cloud Console |
| **Appwrite IDs public** | Project ID/endpoint in `.env`. Verify DB collection permissions are locked down |
| **OAuth secret unvalidated** | `appwrite.ts:97` — extracts secret from URL, only null-checks (no format validation) |
| **No input sanitization** | `add-store.tsx` — coordinates/name/address sent without validation |

### Medium Severity

| Issue | Details |
|-------|---------|
| **PII in console logs** | User avatar, objects logged in dev (leaks in production logs) |
| **No token refresh** | OAuth session doesn't handle expiry gracefully |
| **No HTTPS cert pinning** | API on Render without certificate pinning |
| **Missing auth on API** | No visible token/auth header sent with REST API calls |

---

## 7. Missing Features (vs. Production Apps)

### Must-Have
- [ ] Input validation on store creation form
- [ ] Retry logic for failed network requests
- [ ] Token refresh / session expiry handling
- [ ] Success feedback (toasts/snackbars on actions)
- [ ] Image upload progress indicator
- [ ] Rate limiting (429) handling
- [ ] Unit and integration tests (none exist)
- [ ] TypeScript strict mode

### Should-Have
- [ ] Offline support / offline-first caching
- [ ] Multiple image upload per store
- [ ] Reviews/ratings system (types exist but UI missing)
- [ ] Advanced search filters (distance range, ratings, price)
- [ ] Push notifications (new store nearby, promotions)
- [ ] User-friendly location permission error handling
- [ ] Crash reporting active via Sentry (currently stub only)
- [ ] Analytics / user flow tracking

### Nice-to-Have
- [ ] Store approval/moderation workflow
- [ ] Deep linking for sharing stores
- [ ] Favorites / saved stores
- [ ] Store owner dashboard (discount analytics)
- [ ] Social features (share to WhatsApp, etc.)
- [ ] Dark mode support
- [ ] Localization / i18n
- [ ] App Store / Play Store optimization (screenshots, metadata)

---

## 8. Prioritized Roadmap

### Phase 1: Fix Critical Issues (Immediate)
1. **Restrict API keys** — Add Google Maps key restrictions in Cloud Console (Android/iOS package names)
2. **Verify Appwrite permissions** — Ensure collection-level read/write rules are strict
3. **Add `.env` to `.gitignore`** — Rotate exposed keys
4. **Add input validation** to `add-store.tsx` (name, coordinates, address)
5. **Fix null safety** in `stores/[id].tsx` and image components

### Phase 2: Code Quality & Stability (Week 1-2)
1. **Extract shared `loadMyStores`** into a custom hook to eliminate duplication
2. **Replace `any` types** with proper `Store` interface throughout
3. **Add search debounce** (300ms) to prevent API spam
4. **Add `React.memo()`** to `Cards.tsx` and `FeaturedCard.tsx`
5. **Optimize FlatList** — add `windowSize`, `removeClippedSubviews`, `getItemLayout`
6. **Remove console.log PII** from production builds
7. **Enable TypeScript strict mode** in `tsconfig.json`

### Phase 3: User Experience (Week 2-4)
1. **Add success toasts** for store creation, profile updates
2. **Implement retry logic** with exponential backoff in `api.ts`
3. **Handle session expiry** — auto-refresh or redirect to login
4. **Add image upload progress** indicator
5. **Improve error messages** — show user-friendly errors, not raw exceptions
6. **Handle location permissions** gracefully with explanation dialogs

### Phase 4: Features (Week 4-8)
1. **Reviews/ratings** — UI for the existing type system
2. **Advanced filters** — distance range slider, rating filter, sort options
3. **Favorites/bookmarks** — save stores for quick access
4. **Push notifications** — Expo Push for nearby store alerts
5. **Multiple store images** — carousel on detail page
6. **Offline caching** — AsyncStorage for recently viewed stores

### Phase 5: Production Readiness (Week 8-12)
1. **Testing** — Jest + React Native Testing Library for critical paths
2. **Sentry integration** — Full crash reporting and performance monitoring
3. **Analytics** — Track user flows, search patterns, conversion
4. **CI/CD pipeline** — EAS Build + automated testing
5. **App Store preparation** — Screenshots, metadata, privacy policy
6. **Performance audit** — Profile on real devices, optimize cold start


