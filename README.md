# 張維麟作品集

Vite + React + TypeScript 建置的個人作品集與本地履歷 UI。內容以繁體中文為主，作品資料集中維護在 `src/data/portfolio.json`，完整版履歷資料維護在 `src/data/resume.json`。

## 專案特色

- 個人首頁：姓名、角色定位、簡介、引言、站內完整版履歷、GitHub 與 LinkedIn。
- 履歷頁：以 `src/data/resume.json` 產生站內完整版履歷，支援列印輸出 PDF。
- 本地履歷編輯器：不需要登入、不使用 GitHub token；透過本機 UI 匯入、複製、下載 `resume.json`。
- 作品索引：支援作品分類篩選、依建立日期 / 最後更新日期排序、Demo 截圖預覽與外部 Demo / repository 連結。
- 響應式版面：桌面與手機皆可閱讀，適合用 Tailscale 在手機上測試。
- 主題切換：支援 day / night 模式，並記住使用者選擇。

## 收錄作品

| 作品 | 類型 | Demo | Repository |
| --- | --- | --- | --- |
| Win Rate Calculator | 勝率計算、機率模型、互動工具 | https://changweilin.github.io/win_rate_calculator/ | https://github.com/changweilin/win_rate_calculator |
| Mapping Elf | 戶外地圖、GPX/KML、路線規劃 | https://changweilin.github.io/mapping_elf/ | https://github.com/changweilin/mapping_elf |
| Hex Snake | 六角格遊戲、AI 對弈、平衡模擬 | https://changweilin.github.io/hex_snake/ | https://github.com/changweilin/hex_snake |
| Railway Elf | 鐵路主題互動網頁 | https://changweilin.github.io/railway_elf/ | https://github.com/changweilin/railway_elf |
| Web TSP App | TSP、最佳化、演算法視覺化 | https://changweilin.github.io/web_tsp_app/ | https://github.com/changweilin/web_tsp_app |
| IIR Filter Tool | DSP、IIR 濾波器、訊號處理視覺化 | https://changweilin.github.io/iir_filter_tool/ | https://github.com/changweilin/iir_filter_tool |

修正紀錄請見：`docs/correction-notes.zh-TW.md`

## 技術棧

- React 19
- TypeScript
- Vite 6
- lucide-react

本機開發建議使用 Node.js 20 以上。

## 本機開發

安裝依賴：

```bash
npm install
```

啟動開發伺服器：

```bash
npm run dev
```

主要入口：

```text
http://localhost:5173/
http://localhost:5173/#full-resume
http://localhost:5173/#resume-editor
```

`npm run dev` 會將 Vite 綁定到 `0.0.0.0`，同一個 Tailscale network 內的手機可以直接打開。先在電腦查 Tailscale IPv4：

```powershell
tailscale ip -4
```

再用手機開啟：

```text
http://<your-tailscale-ip>:5173/
```

如果 5173 被占用，Vite 會在終端機顯示實際 port，手機改用該 port 即可。若手機無法連線，請確認手機與電腦都已連上 Tailscale，並允許 Windows 防火牆讓 Node.js / Vite 接受私人網路連線。

## 常用指令

```bash
npm run dev
npm run build
npm run preview
npm run track:github-updates
```

- `npm run dev`：啟動本機開發伺服器。
- `npm run build`：執行 TypeScript 檢查並建立正式輸出。
- `npm run preview`：預覽 `dist/` build 結果，同樣綁定 `0.0.0.0`。
- `npm run track:github-updates`：手動讀取作品集中的 GitHub repository 連結，將每個 project 的 `updatedAt` 同步成 GitHub 的最後 push 時間，並輸出追蹤快照到 `docs/github-last-updated.*`。

## 履歷編輯

履歷編輯器已改為本地端流程：

1. 開啟 `http://localhost:5173/#resume-editor`。
2. 直接編輯履歷內容，不需要登入。
3. 使用 `匯入 JSON` 載入本機 `resume.json`，或使用 `下載 JSON` 匯出目前草稿。
4. 若要更新專案預設履歷，將匯出的內容放回 `src/data/resume.json` 後重新 build。

草稿會暫存在目前瀏覽器的 `localStorage`，不會提交到 GitHub，也不會觸發 GitHub Actions。

## 資料維護

主要內容來源：

- `src/data/portfolio.json`：姓名、角色、作品列表、作品日期、Demo 截圖與外部連結。
- `src/data/resume.json`：完整版履歷內容。
- `public/project-screenshots/`：作品 Demo 截圖。
- `public/resume-icons/`：履歷公司與學校 icon。

## GitHub 更新日期追蹤

GitHub 專案更新日期追蹤保留為本機手動指令，不再由 GitHub Actions 排程執行。需要同步時執行：

```bash
npm run track:github-updates
```

同步後會更新：

- `src/data/portfolio.json`：回寫每個 project 的 `updatedAt`。
- `docs/github-last-updated.json`：保留最近 30 次檢查快照。
- `docs/github-last-updated.md`：產生方便閱讀的表格摘要。

## 專案結構

```text
.
├─ docs/
├─ public/
├─ scripts/
├─ src/
│  ├─ data/
│  │  ├─ portfolio.json
│  │  └─ resume.json
│  ├─ App.tsx
│  ├─ CakeResumePage.tsx
│  ├─ ResumeEditorPage.tsx
│  ├─ main.tsx
│  └─ styles.css
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 編碼備註

本專案文件與資料檔使用 UTF-8。若在 Windows PowerShell 看到中文亂碼，請用 UTF-8 讀取，例如：

```powershell
Get-Content -Encoding UTF8 -Raw README.md
```
