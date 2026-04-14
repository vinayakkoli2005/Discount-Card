# Implementation Plan — Volo App UI/UX Changes

Source: `docs/Things_To_Do`
Date: 2026-04-13

---

## Phase 1 — Login Page Overhaul (`app/sign-in.tsx`)

| #   | Task                                                                                                                      | Notes |
|-----|---------------------------------------------------------------------------------------------------------------------------|-------|
| 1.1 | Set heading to **"Volo"**                                                                                                 | Brand name |
| 1.2 | Add subtitle **"Vocal for local"**                                                                                        | Tagline beneath heading |
| 1.3 | Add description text **"discover local Stores nearby"**                                                                   | Below tagline |
| 1.4 | Replace primary CTA with **"Continue with Google"** button                                                                | Google OAuth login |
| 1.5 | Show **"No stores"** empty state when search/explore returns no results (it already shows No result but i want No Stores) | Not specific to login but noted here |

---

## Phase 2 — Global / Navigation Changes

| # | Task | Notes |
|---|------|-------|
| 2.1 | **Remove the bottom tab bar** | Remove task/navigation bar from global layout |
| 2.2 | **Disable notifications** | Comment out or hide notification bell/icon; leave wiring in place for future |
| 2.3 | Add a **back button** on relevant screens | Screens that currently lack one (store profile, add store, etc.) |

---

## Phase 3 — Home Page (`app/(root)/(tabs)/index.tsx`)

| # | Task | Notes |
|---|------|-------|
| 3.1 | **Remove** "Vinayak" name text from top-left header | |
| 3.2 | **Remove** VK / avatar icon from top-left | |
| 3.3 | Add **hamburger menu icon** (top-left) | On tap → navigate to Profile screen |
| 3.4 | Rename stores section label to **"Stores near you"** | |
| 3.5 | **Remove location icon** from the right side of the search bar | Keep search input, drop the pin/location icon |

---

## Phase 4 — Store Profile Page (`app/(root)/stores/[id].tsx`)

| # | Task | Notes |
|---|------|-------|
| 4.1 | Show **distance** to the store | Use user's current location + store coordinates |
| 4.2 | **Remove** likes, favourites, heart, stars, and reviews UI | Strip all engagement/rating elements |
| 4.3 | Rename "About store" section label to just **"About"** | |
| 4.4 | Reorder layout: **Map** on top → **About** below map | |
| 4.5 | **Phone number**: tapping it opens the device dialler (`tel:` link) | |
| 4.6 | **WhatsApp**: tapping it opens WhatsApp with the store's number (`whatsapp://` / `https://wa.me/`) | |

---

## Phase 5 — Add Store Form (`app/add-store.tsx`)

| # | Task | Notes |
|---|------|-------|
| 5.1 | Add **phone number field** with validation (format + required) | E.g. 10-digit or E.164 format |
| 5.2 | Add **image upload** field | Pick from gallery / camera; upload to storage |
| 5.3 | Rename submit button from **"Create Store"** → **"Add Store"** | |

---

## Phase 6 — Profile & Store Management

| # | Task | Notes |
|---|------|-------|
| 6.1 | Add **"Designed & Developed by Vinayak"** credit on Profile screen | Link to LinkedIn or profile URL |
| 6.2 | **Delete store**: add confirmation dialog with **OK / Cancel** before deleting | |
| 6.3 | **Edit store**: form must have explicit **Save** and **Cancel** buttons | No auto-save |

---

## Affected Files

| File | Phases |
|------|--------|
| `app/sign-in.tsx` | 1 |
| `app/(root)/_layout.tsx` | 2.1, 2.2 |
| `app/(root)/(tabs)/index.tsx` | 3 |
| `app/(root)/stores/[id].tsx` | 4 |
| `app/add-store.tsx` | 5 |
| `app/(root)/(tabs)/profile.tsx` | 6.1 |
| `app/(root)/(tabs)/my-stores.tsx` | 6.2, 6.3 |

---

## Implementation Order (recommended)

1. Phase 2 (global nav — unblocks other pages)
2. Phase 1 (login page)
3. Phase 3 (home page)
4. Phase 4 (store profile)
5. Phase 5 (add store)
6. Phase 6 (profile + management)
