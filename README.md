# 張維麟作品集

Vite + React + TypeScript 建置的個人作品集首頁，展示張維麟的履歷連結、社群入口與公開作品。內容以繁體中文為主，作品資料集中維護在 `src/data/portfolio.json`。

線上頁面：https://changweilin.github.io/demo_link/

## 專案特色

- 個人首頁：姓名、角色定位、簡介、引言、Cake 履歷、GitHub 與 LinkedIn。
- 作品索引：支援作品分類篩選、依建立日期 / 最後更新日期排序、快速切換與外部 Demo / repository 連結。
- 響應式版面：桌面與手機皆可閱讀，適合用 Tailscale 在手機上測試。
- 主題切換：支援 day / night 模式，並記住使用者選擇。
- GitHub Pages 部署：已包含 GitHub Actions workflow，會依 repository name 設定 Vite base path。

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
- GitHub Actions / GitHub Pages

GitHub Actions 使用 Node.js 22；本機開發建議使用 Node.js 20 以上。

## 本機開發

安裝依賴：

```bash
npm install
```

啟動開發伺服器：

```bash
npm run dev
```

`npm run dev` 會將 Vite 綁定到 `0.0.0.0`，同一個 Tailscale network 內的手機可以直接打開：

```text
http://<your-tailscale-ip>:5173/
```

如果 5173 被占用，Vite 會在終端機顯示實際 port，手機改用該 port 即可。

## 常用指令

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`：啟動本機開發伺服器。
- `npm run build`：執行 TypeScript 檢查並建立正式輸出。
- `npm run preview`：預覽 `dist/` build 結果，同樣綁定 `0.0.0.0`。

## 資料維護

主要內容來源是 `src/data/portfolio.json`：

- `profile`：姓名、英文名、角色、地點、履歷連結、簡介、引言與社群連結。
- `projects`：作品標題、摘要、完整描述、標籤、分類、年份、建立日期、最後更新日期與外部連結。

更新作品時，通常只需要修改 `src/data/portfolio.json`。若新增公開圖片或 icon，請放在 `public/`；若要調整 SEO、Open Graph 或 favicon，請修改 `index.html`。

## 部署

專案已包含 GitHub Actions workflow：`.github/workflows/deploy.yml`。

首次部署前請在 GitHub repository 設定：

1. 進入 `Settings` -> `Pages`。
2. 將 `Build and deployment` 的 `Source` 選為 `GitHub Actions`。
3. push 到 `main` 後，workflow 會自動執行 `npm ci`、`npm run build`，並部署 `dist/`。

部署時 workflow 會設定：

```text
VITE_BASE_PATH=/${{ github.event.repository.name }}/
```

因此 repository 名稱為 `demo_link` 時，GitHub Pages 路徑會是 `/demo_link/`。本機開發模式則固定使用 `/` 作為 base path。

## 專案結構

```text
.
├─ .github/workflows/deploy.yml
├─ docs/correction-notes.zh-TW.md
├─ public/
├─ src/
│  ├─ data/portfolio.json
│  ├─ App.tsx
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
