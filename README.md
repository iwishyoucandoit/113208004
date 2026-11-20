# 個人行程與任務管理

這是可部署到 GitHub Pages 的靜態前端。Firebase Authentication 負責 Google／LINE 登入，Firestore 儲存每位使用者自己的行程與待辦事項。

## 1. Firebase 專案

Firebase 專案 ID：`personal-planner-893b0`。Web app「Personal Planner Web」已註冊，設定值已填入根目錄的 `firebase-config.js`。這些 Web 設定值會出現在瀏覽器中；資料存取由 Firestore Security Rules 保護。

Cloud Firestore 已建立在 `asia-east1`（台灣），並已發布本專案的 `firestore.rules`。資料結構使用 `users/{Firebase UID}/events/{文件 ID}` 和 `users/{Firebase UID}/tasks/{文件 ID}`；規則只允許登入者讀寫自己的行程與待辦事項。

`firebase.json` 已連結此規則檔。若之後更新規則，可使用 Firebase CLI 登入後執行 `firebase deploy --only firestore:rules`。

Google 登入已啟用；專案公開名稱和支援電子郵件已設定在 Firebase Authentication。

## 2. 設定 LINE 登入

LINE 登入透過 Firebase Authentication 的 OpenID Connect (OIDC) 提供者。這需要 Firebase 專案升級為 **Identity Platform**；升級前先確認 Firebase 專案的計費方案與用量限制。

1. 在 [LINE Developers Console](https://developers.line.biz/console/) 建立 LINE Login channel，設定 LINE Login callback URL 為 Firebase 控制台 OIDC 提供者頁面顯示的 redirect URI。
2. 在 Firebase Console 啟用 Identity Platform，前往 Authentication 的 OIDC 提供者設定並新增提供者，Provider ID 設為 `oidc.line`。
3. Issuer 填 `https://access.line.me`；輸入 LINE Login channel 的 Channel ID 與 Channel secret，並設定所需的 `openid`、`profile`、`email` scopes。若 LINE channel 未申請 email 權限，可移除 `email` scope。
4. 儲存 Firebase 顯示的回呼網址，並確認它已登錄在 LINE Login channel。

Channel secret 只填在 Firebase Console，**不要**放進此 GitHub Pages 專案或 `firebase-config.js`。LINE 登入使用 `OAuthProvider("oidc.line")`，提供者 ID 必須與 Firebase 設定一致。

## 3. 設定網域與發布

1. 推送到 GitHub repository 的 `main` 或 `master` 分支。
2. 在 GitHub repository 的 **Settings → Pages → Build and deployment** 將來源設為 **GitHub Actions**。`.github/workflows/deploy.yml` 會自動部署根目錄的 `index.html`。
3. 從 GitHub Pages 網址複製網域（例如 `username.github.io`），加入 Firebase Console **Authentication → Settings → Authorized domains**。較新的 Firebase 專案不一定預先包含 GitHub Pages 網域。
4. 在 Firebase Authentication 的 Google provider 和 LINE channel 確認 OAuth 網域／回呼網址設定正確，再開啟 GitHub Pages 網站登入。

一般 GitHub Pages 網站網址為 `https://<帳號>.github.io/<repository>/`；Firebase 授權網域填主機名稱，不要填路徑。

本機預覽請雙擊 `本機預覽.bat`，再瀏覽 `http://localhost:8765/`。直接以 `file://` 開啟 HTML 會被瀏覽器擋住 Firebase 模組與登入流程。本機 Google 登入若出現 `auth/unauthorized-domain`，請將 `localhost` 加入 Firebase Authentication 的 Authorized domains。
