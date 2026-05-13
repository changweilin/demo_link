# 本地履歷編輯器

履歷編輯器已改為本地端 UI，不需要 Google 登入、GitHub token 或 GitHub Actions。編輯入口仍是：

- 首頁導覽列：`本地編輯履歷`
- 本機網址：`http://localhost:43177/#resume-editor`

## 使用方式

1. 啟動本機開發伺服器：

```bash
npm run dev
```

2. 開啟 `http://localhost:43177/#resume-editor`。
3. 在 UI 中編輯履歷內容。
4. 使用 `下載 JSON` 匯出 `resume.json`，或使用 `複製 JSON` 取得目前草稿內容。

編輯器會把草稿暫存在目前瀏覽器的 `localStorage`，重新整理頁面後仍可繼續編輯。若要帶入其他版本，使用 `匯入 JSON` 選擇本機的 `resume.json`。

站內完整版履歷會優先讀取這份本機草稿，因此在編輯器修改後點擊 `查看履歷`，可以直接預覽最新 Cake 版履歷。

自我介紹使用單一多行文字區編輯，每一行會轉成一個自我介紹項目。

技能使用縮排文字區編輯：不縮排的行是技能分類，Tab 或四個半形空格縮排的行會成為該分類下的技能項目。

```text
演算法與深度學習
    Python
    CNN / Transformer
音訊與嵌入式
    C / Assembly
```

工作經歷與學歷的重點條列使用縮排文字區編輯：每一行是一個條列，開頭的 Tab 或四個半形空格會轉成子條列。若條列需要連結，可使用 Markdown 格式：

```text
主要條列
    子條列
    [連結條列](https://example.com)
```

## 104 / LinkedIn / Cake 同步資料

編輯器會在每次草稿變動時，同步產生 104 / LinkedIn / Cake 的一對一區塊資料包，並暫存在瀏覽器的 `localStorage`。

| 來源區塊 | 104 | LinkedIn | Cake |
| --- | --- | --- | --- |
| 個人資料 | 基本資料 | Intro | Profile |
| 自我介紹 | 自傳 / 自我介紹 | About | Summary |
| 技能 | 專長技能 | Skills | Skills |
| 工作經歷 | 工作經歷 | Experience | Work Experience |
| 學歷 | 學歷 | Education | Education |
| 個人連結 | 附件 / 作品連結 | Contact info / Featured | Social Links / Portfolio |

同步面板的每個平台區塊都可直接手動編輯，也可按 `複製區塊` 把該區塊內容放進剪貼簿。手動覆寫會保存於本機，只影響同步包、複製內容與下載 JSON；不會反向改動主履歷草稿。需要回到履歷來源內容時，可按單一區塊的 `還原來源` 或整體的 `清除手動覆寫`。

同步面板提供下列操作：

- `同步到平台`：若 `.env` 設定 `VITE_RESUME_SYNC_ENDPOINT`，會把全平台 JSON `POST` 到該 endpoint。
- `產生同步包`：未設定 endpoint 時，同一顆按鈕會改為複製全平台 JSON。
- `複製區塊`：直接複製目前平台某一個對應區塊。
- `開啟履歷頁`：打開目前平台的外部履歷編輯頁。
- `複製目前平台` / `下載全平台 JSON`：用於整包交給後端同步流程或人工備份。

外部平台的 OAuth token、帳號登入與實際寫回應由後端 endpoint 或人工操作處理，不存放在前端專案內。

本機同步 API 已整合在 Vite 服務，`.env.local` 設定如下：

```env
VITE_RESUME_SYNC_ENDPOINT=/api/resume-sync
VITE_RESUME_SYNC_104_URL=https://pda.104.com.tw/profile
VITE_RESUME_SYNC_LINKEDIN_URL=https://www.linkedin.com/in/your-id/
VITE_RESUME_SYNC_CAKE_URL=https://www.cake.me/resumes/your-resume
```

啟動前端即可同時啟動履歷編輯器與同步 API：

```bash
npm run dev
```

按下 `同步到平台` 後，endpoint 會把最新同步包保存到：

```text
C:\tmp\resume-platform-sync-latest.json
```

也會同步產生每個平台的 Markdown 與 JSON，方便人工核對、複製貼上或交給後續自動化：

```text
C:\tmp\resume-platform-sync\104.md
C:\tmp\resume-platform-sync\104.json
C:\tmp\resume-platform-sync\linkedin.md
C:\tmp\resume-platform-sync\linkedin.json
C:\tmp\resume-platform-sync\cake.md
C:\tmp\resume-platform-sync\cake.json
C:\tmp\resume-platform-sync\index.json
C:\tmp\resume-platform-sync\sync-report.md
C:\tmp\resume-platform-sync\sync-report.json
```

`sync-report.md` 會列出每個平台的 adapter 狀態、目標網址、區塊同步計畫與下一步。三個平台目前都是 manual-assist，不會自動送出或保存外部平台。

若要改本機服務 port 或同步輸出位置，可在啟動前設定：

```powershell
$env:VITE_DEV_PORT="8788"
$env:RESUME_SYNC_OUTFILE="C:\tmp\my-resume-sync.json"
$env:RESUME_SYNC_OUTDIR="C:\tmp\my-resume-sync-files"
npm.cmd run dev
```

若要改各平台的目標履歷網址，可設定：

```powershell
$env:RESUME_SYNC_104_URL="https://pda.104.com.tw/profile"
$env:RESUME_SYNC_LINKEDIN_URL="https://www.linkedin.com/in/your-id/"
$env:RESUME_SYNC_CAKE_URL="https://www.cake.me/resumes/your-resume"
npm.cmd run dev
```

## 更新專案內建履歷

若要讓完整版履歷頁預設載入新的內容，請把匯出的 JSON 內容更新到：

```text
src/data/resume.json
```

更新後重新執行：

```bash
npm run build
npm run preview
```

## 已移除的遠端流程

- Google OAuth 登入檢查
- GitHub fine-grained token 輸入
- GitHub Contents API 寫回 repo
- GitHub Actions 部署與排程同步 workflow
