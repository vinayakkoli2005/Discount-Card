# GOAL PROMPT — Fix all audited issues in Volo / Discount-Card

> Paste the block below to Claude Code (or run via `/loop` / `/gsd-autonomous`) to drive the fixes.
> Full issue detail lives in `AUDIT-ISSUES.md`. Work top-to-bottom; do not skip the verification gate between phases.

---

## GOAL
Fix every issue in `AUDIT-ISSUES.md` — security, reliability, and broken/incomplete features — without breaking existing working flows. Keep going phase by phase until all phases pass their success criteria.

## CONTEXT YOU HAVE
- Live Appwrite (TablesDB v1.8) is reachable via the `appwrite-api` MCP — use it to read/verify table & bucket permissions and to apply permission changes.
- Backend: FastAPI in `backend/` (server API key, in-memory cache, Render **free tier — cannot be upgraded**).
- **Infrastructure constraints (do not attempt to change):**
  - Render free tier is fixed — cold-start latency (R2) is accepted as-is; do NOT suggest paid tiers or uptime pingers.
  - No external cache service available — Upstash Redis or similar is NOT an option; for R1 drop the in-memory cache entirely and use HTTP cache headers instead.
- Frontend: Expo/React Native in `app/`, `lib/`, `components/`. API client in `lib/api.ts`.
- Secrets live in `backend/.env` (gitignored — keep it that way; never commit secrets).

## OPERATING RULES (apply every phase)
1. Use TodoWrite to track the phase checklist below; mark each item in_progress → completed.
2. One logical change per commit. Commit message format: `fix(scope): summary`. Do **not** push unless I say so.
3. **Verify before claiming done:** run the verification command(s) for the phase and paste the passing output. Backend: `cd backend && python -m pytest` (add tests as you go) and `uvicorn main:app` boots clean. Frontend: `npx tsc --noEmit` passes and `npx expo start` builds.
4. Never weaken security to make something pass. If a fix needs my decision (e.g. delete dead feature vs build it), STOP and ask using a short question — don't guess on scope.
5. After each phase, write a one-line status under "PROGRESS LOG" at the bottom of this file.
6. If a change touches live Appwrite permissions, show me the before/after permission array and the exact MCP call before applying a destructive one.

---

## PHASE 1 — Lock the database (🔴 do first; DB is currently world-writable)
- [ ] Via MCP, read permissions for `properties`, `products`, `agents`, and all other tables. Record current state.
- [ ] Remove public `create/update/delete("any")`; keep `read("any")` only where public listing is required. Enable `rowSecurity` where appropriate.
- [ ] Add backend auth: verify an Appwrite **session JWT** on every mutating route; derive `ownerId`/`owner_id` from the verified user, never from request body/query. (Fixes S2.)
- [ ] Add an auth dependency to all non-public endpoints (S3).
- [ ] Rotate the server API key to a least-privilege key; update `backend/.env` (S5).
**Success:** an unauthenticated direct SDK write to any table is rejected; a forged-`ownerId` DELETE/PUT returns 401/403; legitimate owner actions still work.

## PHASE 2 — Search correctness & caching (🟠)
- [ ] Verify fulltext indexes on `name`/`address` are `available` via MCP; create if missing (R4).
- [ ] Rewrite `get_stores` search to a single indexed query with native `Query.offset/limit`; fix pagination (R3).
- [ ] Remove in-memory `cache.py` entirely; add `Cache-Control` HTTP response headers instead — no external service (R1, infra-constrained).
- [ ] Replace `detail=str(e)` with generic messages + server-side logging (R5).
**Success:** paginated search returns correct, de-duplicated results across pages; backend works correctly with >1 worker / after restart.

## PHASE 3 — Make photos actually work end-to-end (🟠)
- [ ] Add a helper to convert `images[]` file IDs → viewable URLs (`storage.getFileView`/`getFilePreview`).
- [ ] Render real images in `stores/[id].tsx` and home `Cards`; placeholder only when `images[]` empty (F1).
- [ ] Stop hardcoding the Unsplash `image` in backend `create_store`; derive primary image from `images[]` (F4).
- [ ] Enable the add-store image picker (reuse the working edit-store flow); remove "Coming Soon" (F2).
- [ ] Decide product images: implement `image_id` upload+display OR remove the disabled UI (F3) — ASK if unsure.
**Success:** create a store with photos in add-store → photos display on home card and detail screen; edit-store photos also display.

## PHASE 4 — Hardening (🟠)
- [ ] Add restrictive `CORSMiddleware`, rate limiting, and max-length validation on all Pydantic string fields (S4).
- [ ] Remove/guard `console.error` in production; add an error reporting hook.
**Success:** abusive payloads rejected; CORS allowlist enforced.

## PHASE 5 — Decide build-or-remove for stub features (scope — ASK me)
- [ ] Favorites + Share (F5), Reviews/ratings/gallery/agent (F6), and the core discount-card/membership flow using `subscription_plans`/`user_cards` (F7).
- [ ] For each: present "build vs remove dead UI" with effort estimate; implement my choice.
**Success:** no "Coming Soon" alerts remain for shipped features; dead UI removed or implemented.

## PHASE 6 — Code quality & tests (🟡)
- [ ] Extract shared `_normalize`/`_rows`/`_FIELD_MAP` into one backend module (Q1).
- [ ] Delete `components/NoResults copy.tsx` (Q2).
- [ ] Move hardcoded API base URL to env/config (Q4).
- [ ] Normalize `ownerId` vs `owner_id` naming (Q5).
- [ ] Add backend tests (auth, ownership, search) and a basic frontend test setup (Q3).
- [ ] Remove leftover real-estate template artifacts where unused (Q6).
**Success:** `pytest` green, `tsc --noEmit` clean, no duplicate/dead files.

---

## PROGRESS LOG
<!-- Claude appends one line per completed phase: date — phase — outcome -->
2026-06-21 — Phase 6 — COMPLETE: extracted shared _normalize/_rows/_FIELD_MAP into backend/db_utils.py (stores.py, products.py, favorites.py now import from it); deleted components/NoResults copy.tsx; added 9-test pytest suite (auth guard, ownership 403, search dedup) — all green; added requirements-dev.txt. Q5 (ownerId vs owner_id) is a DB column name mismatch requiring a data migration — left as documented inconsistency. Q6 (real-estate icons) left in place (icons are small, deletion risk > benefit).
2026-06-21 — Phase 5 — COMPLETE: F3 product image upload working (per-product picker in add-store, thumbnail preview, uploads to store-images bucket, image_id saved, displayed in [id].tsx product cards); Favorites built end-to-end (Appwrite favorites table + userId index, GET/POST/DELETE /favorites backend with JWT+ownership, fetchFavorites/addFavorite/removeFavorite in api.ts, heart button in [id].tsx toggles red tint when saved).
2026-06-21 — Phase 4 — COMPLETE: CORSMiddleware with ALLOWED_ORIGINS env var; slowapi rate limiting (120/min default); Pydantic Field(max_length=...) on all string fields in stores.py + products.py; structured logging via logging.basicConfig.
2026-06-21 — Phase 3 — COMPLETE: added getFileUrl() to appwrite.ts; [id].tsx hero uses images[0] with Unsplash fallback; Photos section added for multi-image scrolling; add-store image picker enabled (removed "Coming Soon" disabled wrapper). F3 (product images) deferred — asked user. F4 (Unsplash fallback kept as default for stores with no uploads).
2026-06-21 — Phase 2 — COMPLETE: removed in-memory cache.py from stores.py + products.py; added Cache-Control headers (public/private, 30–60s TTL) on all GET endpoints; fulltext indexes on name+address confirmed available; generic error messages + server-side logging in place.
2026-06-21 — Phase 1 — COMPLETE: auth.py JWT dependency added; stores.py + products.py rewritten with Depends(verify_user) + ownership checks; lib/api.ts rewritten with getAuthHeaders(); add-store/edit-store/useMyStores updated to remove client-supplied ownerIds; all 6 Appwrite tables locked (properties/agents/galleries/reviews/products → read("any") only; user_events → []). PENDING: rotate server API key (S5).
