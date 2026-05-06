# 修正紀錄

更新日期：2026-05-06

## 修正目標

本次修正將原本的範例作品集內容，改為以張維麟個人履歷與公開作品為主的繁體中文版本。修正重點是移除假資料、保留可維護的資料結構，並確認本機、手機與 GitHub Pages 部署流程可用。

## 已完成修正

- 清除範例個人資訊與作品資料：移除 `Atlas`、`PayFlow`、`CoreKit`、`Nimbus`、`Lumen`、`Orbit`、`example.com` 與假 email。
- 重建繁體中文個人介紹：姓名、英文名、角色定位、地點、履歷連結、星空引言與社群連結集中於 `src/data/portfolio.json`。
- 重建作品資料：新增 `Mapping Elf`、`Hex Snake`、`Railway Elf` 的 Demo 與 GitHub 連結。
- 調整首頁視覺內容：右側區塊由假 dashboard 改為真實作品摘要與履歷重點。
- 保留手機版：包含 sticky pill 導覽、手機 hero、精選作品橫向滑動、作品列表橫向 snap 與滿版外部連結按鈕。
- 保留部署設定：GitHub Actions 會依 repository name 設定 `VITE_BASE_PATH` 並部署 `dist/` 到 GitHub Pages。
- 保留 Tailscale 開發設定：`npm run dev` 與 `npm run preview` 均綁定 `0.0.0.0`。

## 資料來源

- Cake 履歷：https://www.cake.me/wei-lin-chang
- Mapping Elf repository：https://github.com/changweilin/mapping_elf
- Mapping Elf demo：https://changweilin.github.io/mapping_elf/
- Hex Snake repository：https://github.com/changweilin/hex_snake
- Hex Snake demo：https://changweilin.github.io/hex_snake/
- Railway Elf repository：https://github.com/changweilin/railway_elf
- Railway Elf demo：https://changweilin.github.io/railway_elf/

## 主要修改檔案

- `src/data/portfolio.json`：個人資料與作品資料來源。
- `src/App.tsx`：首頁結構、作品互動、履歷連結與作品 console。
- `src/styles.css`：桌面與手機 responsive 視覺樣式。
- `index.html`：頁面標題與 SEO description。
- `.github/workflows/deploy.yml`：GitHub Pages 部署流程。
- `README.md`：本機開發、Tailscale 手機測試與 GitHub Pages 部署說明。

## 驗證結果

- `npm.cmd run build` 已成功。
- in-app browser DOM 驗證已確認頁面包含 `張維麟`、`Mapping Elf`、`Hex Snake`、`Railway Elf`。
- 已確認主要原始碼與文件中沒有舊範例作品或假連結殘留。

## 待補事項

- `Railway Elf` 的公開 README 目前無法解析，因此繁體中文描述先採保守版本；後續可補上實際功能、技術棧與設計細節。
- 若要建立英文版，可在目前 JSON 結構上新增語系欄位，或建立獨立 `portfolio.en.json`。
- 若有正式 email、個人網域或作品截圖，可再補進聯絡區與作品卡片。
