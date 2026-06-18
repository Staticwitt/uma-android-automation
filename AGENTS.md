# AGENTS.md

## Cursor Cloud specific instructions

This repo is a hybrid React Native (Expo) frontend + Kotlin/OpenCV Android backend for the
"Uma Musume Automation For Android" app. In the Cloud VM there is **no Android device/emulator**,
so the JS/TS dev loop is what runs headless here. See `README.md` ("For Developers") and
`package.json` scripts for the canonical commands.

### What runs headless (the core dev/test loop)

All of these run on the Cloud VM with only Node + the installed `node_modules`:

- `yarn typecheck` — TypeScript (`tsc --noEmit`)
- `yarn lint` — `expo lint` (exits 0 with warnings; CI only fails on errors)
- `yarn test` — Jest (JS + jest-expo component tests)
- `yarn perf:nav:validate` — validates navigation scenarios (part of CI)
- `yarn start` — Metro dev server on `http://localhost:8081`. You can't attach a device, but you
  can prove the whole app bundles by fetching the bundle:
  `curl "http://localhost:8081/index.bundle?platform=android&dev=true"` (Metro logs `Android Bundled ... (N modules)`).

These mirror the CI `test` job in `.github/workflows/ci.yml`.

### Key gotcha: the `uma-scoring` package

`uma-scoring` is a `file:` dependency resolving to `android/scoring-shared/build/dist/js/productionLibrary`,
which is a Kotlin Multiplatform → JS build output **committed to the repo**. Because it's committed,
`yarn install --frozen-lockfile` alone is enough for typecheck / lint / test / Metro — you do NOT need
to rebuild it normally.

If you change the shared scoring Kotlin code under `android/scoring-shared`, regenerate it with
`yarn build:scoring` (Gradle, needs a JDK; the project targets JDK 17) and re-run `yarn install` so the
`file:` package picks up the new output. `yarn setup:cloud` does both (build:scoring + install) but is
heavier and not needed for routine JS work.

### Not available / heavy in the Cloud VM

- `yarn android` (install/launch the app) and a full `yarn perf:nav` need a connected Android device/emulator — not available here.
- `yarn build` / `yarn build:debug` (Gradle `assembleRelease/assembleDebug`) require the full Android SDK + NDK (not installed) and are not part of the JS dev loop.
- `yarn build:doc-index` and the Python data scraper (`yarn scrape:data`) need network downloads
  (HuggingFace ONNX model / Chrome+Selenium) and are optional/release-only.
- The `onnxruntime-node` devDependency runs a postinstall that downloads a native binary; this can
  occasionally fail with a transient network error (`ECONNRESET`). It only affects `yarn build:doc-index`,
  so a failed postinstall does not block the core dev loop — just re-run `yarn install` if needed.
