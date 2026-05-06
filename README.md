# 張維麟作品集

Vite + React + TypeScript 建置的個人作品集首頁。繁體中文內容集中在 `src/data/portfolio.json`，目前收錄 Cake 履歷與五個公開作品：

- Mapping Elf: https://changweilin.github.io/mapping_elf/
- Hex Snake: https://changweilin.github.io/hex_snake/
- Railway Elf: https://changweilin.github.io/railway_elf/
- Web TSP App: https://changweilin.github.io/web_tsp_app/
- IIR Filter Tool: https://changweilin.github.io/iir_filter_tool/

修正紀錄請見：`docs/correction-notes.zh-TW.md`

## 本機開發

```bash
npm install
npm run dev
```

開發伺服器會綁定 `0.0.0.0`，同一個 Tailscale network 內的手機可以直接打開：

```text
http://<your-tailscale-ip>:5173/
```

如果 5173 被占用，Vite 會顯示實際 port，手機改用該 port 即可。

## GitHub Pages 部署

專案已包含 GitHub Actions workflow：`.github/workflows/deploy.yml`。

部署前請在 GitHub repository 設定：

1. 進入 `Settings` -> `Pages`。
2. `Build and deployment` 的 `Source` 選 `GitHub Actions`。
3. push 到 `main` 後，workflow 會自動 build 並部署 `dist/`。

workflow 會用 repository name 自動設定 Vite base path，例如 repo 名稱是 `demo_link` 時，部署路徑會是 `/demo_link/`。
