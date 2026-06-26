# WO-006 — Capacitor WebView: Post-Merge Handover

**Date:** 2026-06-26  
**Status:** Open — follow-up items after PR #32 merged to main  
**Context:** The native Kotlin/Compose Android app was replaced with a Capacitor 7.6.7
WebView shell (`web/android/`). The migration is live on `main`. These are the remaining
items in priority order.

---

## 1. On-device APK verification ⚠️ Highest priority

CI builds pass (`ci-android.yml` → `build-apk` job produces the APK artifact) but no
runtime verification has been done yet.

**What to verify on a physical or emulated Android device (API 26+):**
- APK installs without error
- WebView loads — app opens to the login screen (React UI, not a blank page)
- Supabase email/password auth works end-to-end (login → dashboard)
- All five mobile tabs render and are interactive: Analytics, Erg, Log, Strength, Recovery
- Back navigation and tab switching behave correctly

**How to get the APK:**
Download the `erg-dashboard-debug` artifact from the latest `ci-android.yml` run on `main`.

---

## 2. GitHub secret names — confirm before relying on CI

`ci-android.yml` maps existing repo secrets into Vite env vars at web build time:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

If `SUPABASE_URL` or `SUPABASE_ANON_KEY` don't exist in GitHub → Settings → Secrets and
variables → Actions, the web build will succeed but the built app will have empty Supabase
credentials and silently fail to connect at runtime.

**Action:** Confirm both secrets exist in the repo's Actions secrets. They are already used
by the web CI (`ci-web.yml`) and any Vercel deploy, so they should be present.

---

## 3. Local dev prerequisite — Android Studio

The web assets in `web/android/app/src/main/assets/public/` are **gitignored** (generated
at build time). Opening `web/android/` in Android Studio without syncing will result in an
empty WebView.

**Required before opening in Android Studio:**

```bash
cd web
npm run build          # compile React → web/dist/
npx cap sync android   # copy assets + regenerate capacitor.settings.gradle
```

This is documented in `web/android/CLAUDE.md`.

---

## 4. App icons — replace generic Capacitor defaults

The scaffold ships generic Capacitor launcher icons. The app currently shows the default
Capacitor icon on the Android home screen.

**Files to replace** (drop in brand-appropriate PNGs of the correct size):
```
web/android/app/src/main/res/mipmap-mdpi/ic_launcher.png        (48×48)
web/android/app/src/main/res/mipmap-hdpi/ic_launcher.png        (72×72)
web/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png       (96×96)
web/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png      (144×144)
web/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png     (192×192)
```
Round variants (`ic_launcher_round.png`) at the same sizes.
After replacing, run `npx cap sync android` and rebuild.

---

## 5. `test-fixtures/` — now web-only

`test-fixtures/training-load/fixtures.json` was previously validated by both:
- Kotlin `GetTrainingLoadUseCaseTest` (deleted with the native Android app)
- Vitest `web/src/utils/__tests__/trainingLoad.test.js`

**Vitest is now the sole consumer.** No action needed — the fixtures and the Vitest suite
are unchanged. This is noted so a future session agent doesn't assume the Kotlin test still
exists.

---

## 6. Safe-area insets on Android — monitor, don't fix yet

`MobileApp.jsx` uses `env(safe-area-inset-bottom)` for bottom tab bar padding. This was
written for PWA/iOS behaviour. Capacitor on Android with gesture navigation may render the
bottom bar flush against the system navigation area.

**Status:** Out of scope for the migration. Monitor during on-device testing (item 1).
If padding looks wrong, a follow-on spec in `web/src/views/mobile/MobileApp.jsx` is the
right fix.

---

## References

- PR #32 — the migration commit
- `web/android/CLAUDE.md` — Android WebView architecture docs
- `web/capacitor.config.json` — Capacitor config (`appId`, `webDir`, `androidScheme`)
- `.github/workflows/ci-android.yml` — two-job CI pipeline
