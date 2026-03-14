# Play Store CI/CD – ForLok Mobile App

This document describes the automated Play Store deployment for the **mobile app** and how to ensure production signing (SHA keys) is correctly set up.

---

## 1. Deployment flow

| Branch       | Trigger              | Play Store track | Use case                    |
|-------------|----------------------|------------------|-----------------------------|
| **`main`**  | Push to `main`       | **production**   | Live production releases    |
| **`playstore`** | Push to `playstore` | **alpha** (Closed testing) | Closed testing before prod  |

- **Code location:** All Play Store–related code lives under **`mobile-app/`**. The workflow runs only when files under `mobile-app/**` or `.github/workflows/play-store.yml` change.
- **Recommended:** Make **`playstore`** a protected branch (e.g. no direct push; only merge from `main` or a release branch) so that only reviewed code is deployed to the internal track. Deploy to production by merging to **`main`**.

---

## 2. Required GitHub secrets

Configure these in **Settings → Secrets and variables → Actions** for the ForLok repo.

**Important:** Add them as **Secrets** (under the **Secrets** tab), not as **Repository variables**. The workflow reads `secrets.*`; variables are not used. Secrets are also encrypted and safer for keystores and passwords.

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Release keystore file (`.jks` or `.keystore`) encoded as **base64**. Used only in CI to sign the AAB. |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password. |
| `ANDROID_KEY_ALIAS` | Key alias inside the keystore. |
| `ANDROID_KEY_PASSWORD` | Key password for the alias. |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | Full JSON content of the Google Play service account key (single line or multiline string). |

Without these, the workflow will fail when building or uploading to Play Store.

---

## 3. Production keystore and SHA keys (Play Console)

### 3.1 Generate a release keystore (one-time)

If you don’t have a release keystore yet:

```bash
cd mobile-app/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release-keystore.jks -alias forlok-release -keyalg RSA -keysize 2048 -validity 10000
```

Store the `.jks` file and passwords securely. **Do not commit** the keystore (it’s in `.gitignore`).

### 3.2 Get SHA-1 and SHA-256 for Play Console

Play Store (and Firebase/Google APIs) often require the **SHA-1** and **SHA-256** of your **upload key**. From your release keystore:

```bash
keytool -list -v -keystore release-keystore.jks -alias forlok-release
```

Copy the **SHA1** and **SHA256** lines and add them where required:

- **Google Play Console:**  
  **Setup → App signing** (or **Release → Setup → App signing**).  
  If you use **Play App Signing**, Google may use an app signing key and an upload key. The certificate you register there must match the key you use to sign the AAB in CI (this keystore). Add the **SHA-1** and **SHA-256** of this keystore’s certificate as the **upload key** if the console asks for it.

- **Firebase / Google APIs:**  
  If the app uses Firebase or other Google APIs, add the same SHA-1 and SHA-256 in the Firebase project (Project settings → Your apps → Android app → Add fingerprint).

### 3.3 Encode keystore for GitHub

```bash
# Linux/macOS (from repo root)
base64 -w 0 mobile-app/android/app/release-keystore.jks | pbcopy   # macOS
base64 -w 0 mobile-app/android/app/release-keystore.jks            # then copy output

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mobile-app\android\app\release-keystore.jks"))
```

Paste the result into the **`ANDROID_KEYSTORE_BASE64`** secret. Use the same keystore’s **alias**, **store password**, and **key password** for the other secrets.

---

## 4. Google Play service account (step-by-step)

You need a **service account** so GitHub Actions can upload your AAB to the Play Console. Follow these steps in order.

---

### Step 4.1 – Find your Play Console’s Google Cloud project

1. Open **[Google Play Console](https://play.google.com/console)** and sign in.
2. Click the **gear icon** (Settings) in the left sidebar.
3. Under **Developer account**, open **API access** (or **Users and permissions** → **API access**).
4. You’ll see either:
   - **A linked project** (e.g. “Project: your-project-name”). Note that project name.
   - Or **“Link”** / **“Create new project”**. If nothing is linked yet, click **Link** and create/link a Google Cloud project. Remember the project you use.

You’ll use this **same** Google Cloud project in the next step.

---

### Step 4.2 – Create the service account in Google Cloud Console

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Use the **project dropdown** at the top and select the **same project** linked to Play Console (from Step 4.1).
3. Open the **hamburger menu** (≡) → **IAM & Admin** → **Service accounts**.
4. Click **+ CREATE SERVICE ACCOUNT**.
5. Fill in:
   - **Service account name:** e.g. `play-store-deploy` or `forlok-play-upload`.
   - **Service account ID:** (auto-filled; you can leave it).
   - **Description:** e.g. “CI/CD upload to Google Play”.
6. Click **CREATE AND CONTINUE**.
7. **Grant this service account access to the project (optional):**  
   You can skip (click **CONTINUE**) — Play Console permissions are set separately. If you prefer a role here, choose e.g. **Editor** or leave none.
8. Click **DONE**.

---

### Step 4.3 – Create and download the JSON key

1. On the **Service accounts** list, click the **email** of the service account you just created (e.g. `play-store-deploy@your-project.iam.gserviceaccount.com`).
2. Open the **KEYS** tab.
3. Click **ADD KEY** → **Create new key**.
4. Choose **JSON** and click **CREATE**.
   - A JSON file will download (e.g. `your-project-abc123.json`). **Keep this file private**; it’s like a password.
5. **Copy the entire file contents** (all lines, from `{` to `}`). You’ll paste this into GitHub in Step 4.5.

---

### Step 4.4 – Invite the service account in Play Console

1. Go back to **[Google Play Console](https://play.google.com/console)**.
2. Click the **gear icon** (Settings) → **Users and permissions** (or **API access**).
3. Under **API access**, find **Service accounts**. Click **Invite new user** (or **Link existing service account** / **Add user** depending on UI).
4. You may be taken to **Google Cloud Console** to grant access:
   - If you see **“Link Google Cloud project”**, ensure the correct project is linked (Step 4.1).
   - Then under **Service accounts**, select the service account you created (e.g. `play-store-deploy@...`) and continue.
5. Back in **Play Console**, when **inviting** or **editing** the service account user:
   - **Account permissions:** Choose one of these:
     - **Admin (all permissions)** — full access; or
     - **Release to production, exclude devices, and use Play App Signing** — enough to upload to production; or
     - **Release apps to testing tracks** — if you only want internal/closed/open testing first.
   - For CI/CD that deploys to both **internal** and **production**, use at least **Release to production, exclude devices, and use Play App Signing** (or Admin).
6. Under **App permissions**, either:
   - Select **All apps** (recommended for a single-app account), or  
   - Select only the **ForLok** app if you have multiple apps and want to limit access.
7. Save / send invite. The service account should now appear under **Users and permissions** with **API access: Yes**.

---

### Step 4.5 – Add the JSON to GitHub

1. Open your **ForLok** repo on GitHub.
2. Go to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
4. **Name:** `PLAY_STORE_SERVICE_ACCOUNT_JSON`
5. **Value:** Paste the **entire** contents of the JSON key file (from Step 4.3). Include the first `{` and the last `}`. You can paste multiline as-is.
6. Click **Add secret**.

The workflow uses this secret to authenticate with the Play Console when uploading the AAB.

---

### Permissions summary

| If you want to…                          | Use this permission (or higher) |
|------------------------------------------|----------------------------------|
| Upload only to internal/testing tracks   | Release apps to testing tracks   |
| Upload to production and use App Signing | Release to production, exclude devices, and use Play App Signing |
| Full control (e.g. also manage store listing) | Admin (all permissions)   |

---

## 5. Where the “current code” for Play Store deploy lives

- **Source code:** **`mobile-app/`** (React Native / Expo app).
- **Android build:** **`mobile-app/android/`** (Gradle, `app/build.gradle`, signing config).
- **Workflow:** **`.github/workflows/play-store.yml`** (builds AAB and uploads to Play Store).
- **Production signing:**  
  - In CI: release keystore comes from **`ANDROID_KEYSTORE_BASE64`** and is written to `mobile-app/android/app/release-keystore.jks` during the run (not committed).  
  - **`mobile-app/android/app/build.gradle`** uses a **release** `signingConfig` only when `RELEASE_STORE_FILE` (and related props) are set; otherwise it falls back to debug for release builds (local only).

So the “current code” that gets deployed to the Play Store is whatever is on **`main`** (for production) or **`playstore`** (for internal) at the time of the push, limited to the **`mobile-app/`** tree.

---

## 6. Checklist before first production deploy

- [ ] Release keystore generated and stored safely.
- [ ] SHA-1 and SHA-256 of the **upload** key added in Play Console (and Firebase/APIs if needed).
- [ ] All five GitHub secrets set: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_STORE_SERVICE_ACCOUNT_JSON`.
- [ ] Service account has the right permissions in Play Console.
- [ ] Optional: Branch protection for **`playstore`** and **`main`** so only intended code is deployed.

After that, pushing to **`playstore`** deploys to the closed testing track, and pushing to **`main`** deploys to production (after the workflow runs successfully).

---

## 7. Troubleshooting: "Package not found: com.forlok.mobile"

This error means the Google Play API does not see your app. Fix it as follows:

### A. App must exist in Play Console

1. In **[Google Play Console](https://play.google.com/console)**, create an app if you haven’t already.
2. Set the **package name** to exactly **`com.forlok.mobile`** (must match `applicationId` in your app).
3. Complete the required **App content** and **Policy** steps so the app is no longer a bare “draft” (at least enough to create a release).

### B. First release: upload one AAB manually (required if you’ve never added an AAB)

Google often requires the **first** release on a track to be done **manually** in Play Console. Once that’s done, the API will accept uploads from the workflow.

**Option 1 – Build the AAB on your machine**

1. Open a terminal in the repo and go to the mobile app:
   ```bash
   cd mobile-app
   npm ci
   cd android
   ```
2. Sign the release build (use your release keystore; if you use the same as CI, you’ll need the `.jks` file in `mobile-app/android/app/` and the passwords):
   ```bash
   # From mobile-app folder (Windows PowerShell):
   cd android
   .\gradlew bundleRelease -PRELEASE_STORE_FILE=app/release-keystore.jks -PRELEASE_STORE_PASSWORD=YOUR_STORE_PASSWORD -PRELEASE_KEY_ALIAS=forlok-release -PRELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
   ```
   On macOS/Linux (from `mobile-app`):
   ```bash
   cd android
   chmod +x gradlew
   ./gradlew bundleRelease -PRELEASE_STORE_FILE=app/release-keystore.jks -PRELEASE_STORE_PASSWORD=YOUR_STORE_PASSWORD -PRELEASE_KEY_ALIAS=forlok-release -PRELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
   ```
   Replace `YOUR_STORE_PASSWORD`, `forlok-release`, and `YOUR_KEY_PASSWORD` with your real values. The keystore file must be at `mobile-app/android/app/release-keystore.jks`.
3. The AAB is created at:
   `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`

**Option 2 – Download the AAB from a GitHub Actions run**

1. Push to **`playstore`** (or **`main`**) so the workflow runs. It will build the AAB and upload it as an artifact even if the “Upload AAB to Google Play” step fails.
2. In GitHub go to **Actions** → open that **Play Store Deploy** run.
3. At the bottom of the run **Summary**, in **Artifacts**, download **app-release-aab**. Unzip it; inside is **app-release.aab**.
4. Use that file in Play Console as in “Then in Play Console” below.

**Then in Play Console**

1. Go to **Testing** → **Closed testing**.
2. Click **Create new release** (or **Create closed testing release**).
3. Under **App bundles**, click **Upload** and select the **app-release.aab** file.
4. Add a **Release name** (e.g. `1.0.0 (1)`) and click **Save** → **Review release** → **Start rollout to Closed testing** (or **Save as draft** then rollout when ready).
5. After this first manual release, the package is known to the API and the GitHub Action can upload to Closed testing on the next run.

### C. Service account must have access to this app

1. **Settings** → **Users and permissions** (or **API access**).
2. Find your **service account** and open it.
3. Under **App permissions**, ensure **`com.forlok.mobile`** (or “All apps”) is selected and has at least **“Release apps to testing tracks”** or **“Release to production…”**.
4. Save. Permissions can take a few minutes (or up to 24–48 hours in rare cases) to apply.

### D. Track name

- **`playstore`** branch → workflow uses track **`alpha`** (= Closed testing in Play Console).
- **`main`** branch → track **`production`**.

If you use a different track in the workflow, ensure that track exists and the app has at least one release on it (or do the first release manually as in B).
