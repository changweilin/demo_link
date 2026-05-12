# 線上履歷編輯器設定

這個專案部署在 GitHub Pages，因此前端不能安全保存可寫入 repo 的秘密。編輯器採用兩段式權限：

- Google 帳戶登入：控制誰能進入編輯介面。
- GitHub fine-grained token：只在瀏覽器當次輸入，用來把 `src/data/resume.json` 提交回 repo。

## Google 登入

1. 到 Google Cloud 建立 OAuth 2.0 Web Client。
2. Authorized JavaScript origins 加入：
   - `https://changweilin.github.io`
   - `http://localhost:5173`
3. 在部署環境設定：

```text
VITE_GOOGLE_CLIENT_ID=你的 OAuth Client ID
VITE_RESUME_EDITOR_ALLOWED_EMAILS=x111281@gmail.com
```

GitHub Pages 部署會從 repository variables 讀取 `VITE_GOOGLE_CLIENT_ID` 與 `VITE_RESUME_EDITOR_ALLOWED_EMAILS`。請到 `Settings` → `Secrets and variables` → `Actions` → `Variables` 新增這兩個值。

Google Identity Services 的 JavaScript API 會回傳 ID token，前端會檢查 `aud`、`iss`、到期時間、信箱驗證狀態與允許信箱。

## GitHub 儲存

建立 fine-grained personal access token：

- Repository access：只選 `changweilin/demo_link`
- Permissions：`Contents` 設為 `Read and write`
- 到期日：建議短期，需要時再重建

在編輯器輸入 token 後，按「儲存到 GitHub」會透過 GitHub Contents API 更新 `src/data/resume.json`。token 不會寫進程式碼、JSON 或 localStorage。

## 編輯入口

- 首頁導覽列：`編輯履歷`
- 直接網址：`https://changweilin.github.io/demo_link/#resume-editor`
- 本機網址：`http://localhost:5173/#resume-editor`
