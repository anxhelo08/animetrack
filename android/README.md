# AnimeTrack for Android

This APK opens the production PWA in a Trusted Web Activity using Google's Android Browser Helper. It uses the same HTTPS origin and browser storage as the website, so web releases do not require another APK installation. There is no embedded WebView or separate copy of the catalogue. Android 8.0+ and a TWA-capable browser such as Chrome are required; without TWA support the browser may show a normal Custom Tab.

The iPhone version is the existing PWA installed through Safari. The public instructions and Android download are at https://animetrack-flax.vercel.app/install.html.

## Build a signed APK

Requirements: JDK 17 or 21, Android SDK platform 36 and build tools 36.0.0. The Gradle 8.13 wrapper checks its distribution checksum.

Keep the release signing key and its password outside this repository. Use the original key for future APK updates. Losing or replacing it prevents existing Android installations from accepting an update under the same package name.

Set these variables in your build environment without placing their values in source control:

- `ANDROID_HOME`: Android SDK directory.
- `ANDROID_KEYSTORE_PATH`: private PKCS12 or JKS signing key.
- `ANDROID_KEYSTORE_PASSWORD`: signing password.
- `ANDROID_KEY_ALIAS`: defaults to `animetrack`.

From the repository root run `npm run android:build`. The script checks the signature, ZIP alignment, package name, release configuration and public Digital Asset Links fingerprint before copying anything into `public/downloads`.

The output files are `public/downloads/AnimeTrack.apk` and `public/downloads/android.json`. The JSON includes the APK's version, size and SHA-256 checksum. The private key never enters these files. Builds fail if signing variables are missing or the signer does not match `public/.well-known/assetlinks.json`.

For a native shell update, increment `versionCode` and set `versionName` in `app/build.gradle`, then rebuild with the same key. Web-only updates do not require changing these values.

## Domain association and validation

`public/.well-known/assetlinks.json` binds `com.animetrack.app` to the production HTTPS origin using the public certificate fingerprint. The Android manifest restricts incoming app links to `/` and `/index.html`; installation and APK download links remain browser pages. Test TWA fullscreen after the association is deployed; certificate verification can be cached by Android/Chrome.

Before distribution on a physical Android phone:

1. Install the APK and confirm the icon, launch, back navigation and rotation.
2. Sign in with an existing account and confirm library/Diary sync.
3. Open an external catalogue/watch link and return to the app.
4. Reload online, then open previously cached data offline.
5. Confirm installing an APK signed with the same key and a higher versionCode updates the app without deleting its data.

Web Push continues to depend on the browser and the existing site permission. This initial APK does not add a separate native notification service or an app-store listing.
