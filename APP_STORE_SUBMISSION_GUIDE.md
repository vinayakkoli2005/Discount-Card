# Volo — App Store & Play Store Submission Guide

> App: **Volo** · Package: `com.ds.discountcard` · Version: `1.0.0`
> Stack: React Native (Expo 54) + EAS Build/Submit

---

## PHASE 0 — Accounts (Do This First, Takes Time)

### Apple Developer Program
- **Cost:** $99 USD / year
- **URL:** https://developer.apple.com/account
- **Enrollment:** Sign in → Enroll → Individual or Organization
- **Time:** Usually 24–48 hours for approval (can take up to a week)
- **What you need:** Government ID, Apple ID with 2FA enabled

### Google Play Console
- **Cost:** $25 USD one-time
- **URL:** https://play.google.com/console/signup
- **Time:** Account approved within hours, sometimes instant
- **What you need:** Google account, credit card for the fee

---

## PHASE 1 — Fix eas.json (Fill in Your Real Values)

After enrolling in Apple Developer, open `eas.json` and replace the placeholders:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",        // your Apple ID email
      "ascAppId": "1234567890",                      // from App Store Connect (see below)
      "appleTeamId": "XXXXXXXXXX"                    // 10-char string from developer.apple.com
    },
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal"
    }
  }
}
```

**Where to find appleTeamId:** https://developer.apple.com/account → Membership → Team ID

**Where to find ascAppId:** App Store Connect → My Apps → Your App → General → App Information → Apple ID (a 10-digit number)

---

## PHASE 2 — iOS Setup (Apple)

### Step 1: Register App ID in Apple Developer Portal
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click `+` → App IDs → App
3. Description: `Volo`
4. Bundle ID (Explicit): `com.ds.discountcard`
5. Capabilities to enable: **Push Notifications** (if needed), **Maps**
6. Click Continue → Register

### Step 2: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. My Apps → `+` → New App
3. Fill in:
   - Platform: iOS
   - Name: `Volo`
   - Primary Language: English (or your language)
   - Bundle ID: `com.ds.discountcard` (should appear after Step 1)
   - SKU: `volo-discount-card` (unique internal identifier)
4. Save → note the **Apple ID** number (this is your `ascAppId`)

### Step 3: Set Up EAS iOS Credentials
Run this once — EAS will auto-generate your Distribution Certificate and Provisioning Profile:
```bash
eas credentials --platform ios
```
Choose "Expo manages my credentials" (recommended).

### Step 4: Build for iOS
```bash
eas build --platform ios --profile production
```
This uploads to EAS servers and builds a signed `.ipa`. Takes ~15–30 minutes.

### Step 5: Submit to App Store
```bash
eas submit --platform ios --profile production
```
This uploads the `.ipa` to App Store Connect automatically.

### Step 6: Fill App Store Connect Metadata
Go to your app in App Store Connect and fill in **all** of these:

| Field | Notes |
|-------|-------|
| App Name | Volo |
| Subtitle | Up to 30 chars, e.g. "Discover Local Discount Stores" |
| Description | Up to 4000 chars — explain what the app does |
| Keywords | Comma-separated, up to 100 chars total |
| Support URL | Your website or backend URL |
| Marketing URL | Optional |
| Privacy Policy URL | **Required** (see Phase 5) |
| Age Rating | Fill questionnaire (likely 4+) |
| Category | Shopping or Lifestyle |

### Step 7: Screenshots (Required Sizes)
You MUST provide screenshots for these sizes (use Simulator or real device):

| Size | Device | Required? |
|------|--------|-----------|
| 6.9" | iPhone 16 Pro Max | **Required** |
| 6.7" | iPhone 15 Plus | Optional (auto-scaled from 6.9") |
| 6.5" | iPhone 11 Pro Max | Optional |
| 5.5" | iPhone 8 Plus | Optional |
| iPad 13" | iPad Pro 13" | If `supportsTablet: true` — **Required** |
| iPad 12.9" | iPad Pro 12.9" (2nd gen) | Required if submitting for iPad |

**Tool:** Use Expo's simulator + macOS Simulator screenshot tool, or a service like Shotbot / AppLaunchpad.

**Size spec:** PNG or JPEG, 72 DPI, RGB color space. No alpha channel.

### Step 8: Export Compliance
When asked about encryption: your app uses **HTTPS only** (standard). Select:
- "Does your app use encryption?" → **Yes** (HTTPS counts)
- "Does it qualify for exemption?" → **Yes** (uses standard TLS, no custom encryption)
- This gets you the **exempt** classification with no extra paperwork.

---

## PHASE 3 — Android Setup (Google Play)

### Step 1: Create App in Play Console
1. Go to https://play.google.com/console
2. Create app → Name: `Volo` → App or Game: App → Free or Paid
3. Accept policies → Create app

### Step 2: Create Google Play Service Account (for EAS Submit)
1. Go to Play Console → Setup → API access
2. Link to a Google Cloud project (or create one)
3. In Google Cloud Console → IAM & Admin → Service Accounts → Create
4. Name: `eas-submit` → Create
5. Grant role: **Service Account User** + **Release Manager** in Play Console
6. Create key → JSON → Download → save as `google-play-service-account.json` in project root
   - This file is already in `.gitignore` ✓

### Step 3: Set Up EAS Android Credentials
```bash
eas credentials --platform android
```
Choose "Expo manages my credentials" — EAS will generate a keystore.

> **CRITICAL:** After EAS generates your keystore, download and back it up:
> `eas credentials --platform android` → Download keystore
> Store it in a safe place (password manager, etc.) — losing it means you can never update the app.

### Step 4: First Manual Upload (Required!)
Google Play requires the **first** upload to be done manually:
1. Build: `eas build --platform android --profile production`
2. Download the `.aab` from https://expo.dev/accounts/vinayaksensei/projects/discount-card/builds
3. In Play Console → Internal Testing → Create new release → Upload the `.aab`
4. Save → Review → Roll out

After this first manual upload, `eas submit --platform android` will work automatically.

### Step 5: Future Submissions
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

### Step 6: Store Listing Metadata
Fill in Play Console → Store Presence → Main Store Listing:

| Field | Notes |
|-------|-------|
| App name | Volo (up to 30 chars) |
| Short description | Up to 80 chars |
| Full description | Up to 4000 chars |
| App icon | 512×512 PNG, no alpha |
| Feature graphic | **1024×500 PNG or JPEG** — required |
| Screenshots (Phone) | Min 2, JPEG/PNG, 16:9 or 9:16 |
| Privacy policy URL | **Required** |
| Category | Shopping |

### Step 7: Data Safety Form
In Play Console → Policy → App content → Data safety. Declare what your app collects:

| Data Type | Collected? | Why |
|-----------|-----------|-----|
| Precise location | Yes | Show nearby stores |
| Approximate location | Yes | Show nearby stores |
| Photos/videos | Yes | Store listing images |
| User ID (Appwrite auth) | Yes | Account management |
| Device ID | Maybe | App analytics |

Sharing: mark location as "shared with service providers" (Google Maps SDK).

### Step 8: Content Rating Questionnaire
Play Console → Policy → App content → Content rating → Start questionnaire:
- Category: Shopping
- Violence/Sexual content: None
- Expected rating: **Everyone (E)**

### Step 9: Target Audience
- Target age: 18+ (adults, store owners)
- Contains ads: No (unless you add them later)

---

## PHASE 4 — Restrict Your Google Maps API Key

Your Maps key `AIzaSyDGVnAkQrNaE8aEgemJ1SujWYjNzyZrUpM` is currently unrestricted.

1. Go to https://console.cloud.google.com/apis/credentials
2. Click on that key → Application restrictions:
   - Add **Android apps** → Package: `com.ds.discountcard`, SHA-1 (get from EAS)
   - Add **iOS apps** → Bundle ID: `com.ds.discountcard`
3. API restrictions → Restrict to:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Geocoding API

To get your Android SHA-1 fingerprint:
```bash
eas credentials --platform android
```
It will show the keystore SHA-1.

---

## PHASE 5 — Privacy Policy (REQUIRED for Both Stores)

Both stores **require** a privacy policy URL since your app collects:
- Location data
- Photos/media
- User account data (Appwrite auth)

**Minimum the policy must cover:**
1. What data you collect (location, photos, account info)
2. Why you collect it (show nearby stores, store listings)
3. Who you share it with (Appwrite Cloud, Google Maps)
4. How users can request deletion
5. Contact email for privacy inquiries

**Free options to create one:**
- https://www.privacypolicygenerator.info
- https://app.termly.io/

**Where to host it:**
- GitHub Pages (free) — simplest: create a `privacy-policy.html` in a public repo
- Or add a `/privacy` route to your backend at `https://discount-card-api.onrender.com/privacy`

---

## PHASE 6 — Things to Fix Before Submission

### High Priority (will cause rejection)
- [ ] Create privacy policy and host it at a public URL
- [ ] Fill in all App Store Connect / Play Console metadata
- [ ] Provide required screenshots in correct dimensions
- [ ] Complete Data Safety form (Android)
- [ ] Complete Content Rating questionnaire (Android)

### Medium Priority (best practice)
- [ ] Restrict Google Maps API key to your app's bundle IDs (see Phase 4)
- [ ] Test the production build on a real device (not simulator)
- [ ] Remove or hide all "Coming Soon" placeholder screens before submission
- [ ] Verify all deep links work (Appwrite OAuth callback uses scheme `appwrite-callback-695272a5002c9fe4b025`)

### Already Good ✓
- [x] iOS `bundleIdentifier` added → `com.ds.discountcard`
- [x] Android `package` already set → `com.ds.discountcard`
- [x] `autoIncrement: true` in production → build numbers auto-managed
- [x] Android production uses `.aab` (required by Play Store)
- [x] Location permission strings written
- [x] Photo library permission string written
- [x] EAS project ID configured
- [x] `google-play-service-account.json` in `.gitignore`

---

## PHASE 7 — Full Command Sequence (When Ready)

```bash
# 1. Install/update EAS CLI
npm install -g eas-cli

# 2. Login to EAS
eas login

# 3. Set up credentials (do iOS and Android)
eas credentials --platform ios
eas credentials --platform android

# 4. Build production binaries
eas build --platform ios --profile production
eas build --platform android --profile production

# 5. Submit (iOS goes automatically; Android needs first manual upload - see Phase 3 Step 4)
eas submit --platform ios --profile production
eas submit --platform android --profile production   # only after first manual upload
```

---

## Timeline Estimate

| Step | Time |
|------|------|
| Apple Developer enrollment approval | 24–72 hours |
| Google Play Console setup | Same day |
| EAS builds (iOS + Android) | 30–60 min each |
| Apple App Review | 1–3 days (first submission) |
| Google Play Review | 3–7 days (first submission) |
| **Total minimum** | **~1 week** |

---

## Useful URLs

| Resource | URL |
|----------|-----|
| Apple Developer Portal | https://developer.apple.com/account |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| EAS Dashboard | https://expo.dev/accounts/vinayaksensei/projects/discount-card |
| Google Cloud Console (API keys) | https://console.cloud.google.com/apis/credentials |
| EAS Docs — iOS Submit | https://docs.expo.dev/submit/ios |
| EAS Docs — Android Submit | https://docs.expo.dev/submit/android |
| Google Play Service Account Guide | https://github.com/expo/fyi/blob/main/creating-google-service-account.md |
