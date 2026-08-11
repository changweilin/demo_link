# 修正紀錄

更新日期：2026-05-06

## 修正目標

本次修正將原本的範例作品集內容，改為以張維麟個人履歷與公開作品為主的繁體中文版本。修正重點是移除假資料、保留可維護的資料結構，並確認本機與手機測試流程可用。

## 已完成修正

- 清除範例個人資訊與作品資料：移除 `Atlas`、`PayFlow`、`CoreKit`、`Nimbus`、`Lumen`、`Orbit`、`example.com` 與假 email。
- 重建繁體中文個人介紹：姓名、英文名、角色定位、地點、履歷連結、星空引言與社群連結集中於 `src/data/portfolio.json`。
- 重建作品資料：新增 `Mapping Elf`、`Hex Snake`、`Railway Elf` 的 Demo 與 GitHub 連結。
- 調整首頁視覺內容：右側區塊由假 dashboard 改為真實作品摘要與履歷重點。
- 保留手機版：包含 sticky pill 導覽、手機 hero、精選作品橫向滑動、作品列表橫向 snap 與滿版外部連結按鈕。
- 履歷編輯改為本地端 UI：不需要 Google 登入、GitHub token 或 GitHub Actions 部署流程。
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
- `src/ResumeEditorPage.tsx`：本地履歷編輯器、匯入、複製與下載 JSON。
- `README.md`：本機開發、Tailscale 手機測試與本地履歷維護說明。

## 驗證結果

- `npm.cmd run build` 已成功。
- in-app browser DOM 驗證已確認頁面包含 `張維麟`、`Mapping Elf`、`Hex Snake`、`Railway Elf`。
- 已確認主要原始碼與文件中沒有舊範例作品或假連結殘留。

## 待補事項

- `Railway Elf` 的公開 README 目前無法解析，因此繁體中文描述先採保守版本；後續可補上實際功能、技術棧與設計細節。
- 若要建立英文版，可在目前 JSON 結構上新增語系欄位，或建立獨立 `portfolio.en.json`。
- 若有正式 email、個人網域或作品截圖，可再補進聯絡區與作品卡片。

---

# 作品內容同步更新

更新日期：2026-08-12

## 更新目標

依各作品專案本機 repository 的最新內容重寫作品介紹、移除過時資訊，並針對主要更新的作品補拍核心功能截圖。`updatedAt` 一律對齊該專案本機 repo 的最後 commit 時間（UTC）。

## 已完成更新

- **Steel vs Swarm**（2026-07-14 → 2026-08-11）：補上雲端／區網（Tailscale）／單機瀏覽器內主機三種連線機制、雙陣營各六章的劇情戰役與觀戰、手機虛擬搖桿與陀螺儀瞄準、四種定位的電腦玩家、伺服器端 LOS 遮蔽。新增截圖：真實地圖建圖、劇情戰役、手機橫式虛擬搖桿。
- **YOLO Elf**（2026-07-15 → 2026-08-11）：全面改寫。移除過時的「YOLOv8／快速與精準雙模式」為主的敘述，改以 YOLO26 與 NMS-free 推論、七種任務通道（偵測／實例分割／姿態／OBB／開放詞彙／語意分割／單目深度）、六種追蹤器、ROI 區域、規則告警與 webhook、SQLite 偵測歷史、多相機輕量 NVR、Florence-2 VLM 語意通道、存取控制、Prometheus 指標與 TensorRT/ONNX 匯出為主。新增截圖：多相機檢視端、VLM 語意通道。
- **Breeze Elf**（2026-07-15 → 2026-08-11）：補上調性偵測主音、節拍估計與含附點的音符時值簡譜、依時長加權的音準評分、歌詞對齊、台語／歌唱 LoRA 後訓練模型 A/B 熱切換與部署腳本、搜尋結果直接摘要、`breeze doctor` 環境診斷。
- **Mapping Elf**（2026-07-15 → 2026-08-11）：補上繪圖板（畫形狀 → 於目前位置附近規劃最接近的 O 繞跑步路線，含路網吸附、方位搜尋、里程校準與相似度回報）、集水區邊界改用 D∞ 貢獻度連續場等值線、3D 地形上的集水範圍繪製、整合式量測工具。新增截圖：繪圖板星形 O 繞路線。
- **Agent Task Manager**（2026-05-22 → 2026-08-09）：補上 node-pty + xterm.js 分頁式終端、Terminal Pipeline 連續提示自動化、跨裝置同步記事本、AI 額度監控（Claude Code／Codex CLI／Antigravity CLI）、每專案 Local／LAN／Tailscale 入口獨立開關、多框架 dev server 辨識。更新管理台與手機版截圖，新增 AI 額度監控截圖。
- **Astro ELF**（2026-07-15 → 2026-08-11）：補上中子星／白矮星／主序星等中心天體、Web Worker 重力透鏡、知識庫爬取監測後台與檢索品質 eval 基準、科學家檔案頁。
- **Elven Chewing**、**Hex Snake**：分別補上原生設定程式、對局回放封存與分享。
- **AI Tycoon**、**Mapping Star**、**Novel Elf**、**Music Elf**：僅同步 `updatedAt`，功能敘述維持不變。
- **Railway Elf**、**Win Rate Calculator**、**Web TSP App**、**IIR Filter Tool**：本機 repo 無新 commit，未更動。
- `README.md` 收錄作品表補齊先前缺漏的 Mapping Star、Elven Chewing、Novel Elf、Agent Task Manager、Music Elf 五項，並更新各作品類型敘述。

## 版面調整

作品描述變長後在手機上會擠成一整片文字，因此改為以空行分段：`portfolio.json` 的 `description` 支援以空行切段，`App.tsx` 依空行拆成多個 `<p>`，`styles.css` 新增 `.project-description` 控制段距。長篇作品（Steel vs Swarm、YOLO Elf、Breeze Elf、Mapping Elf、Astro ELF、Agent Task Manager、AI Tycoon）已分成 2–5 段，其餘維持單段。

## 截圖方式

以 Playwright 對各作品已部署的 GitHub Pages Demo 操作後截圖，未在任何作品專案目錄內新增或修改檔案。

線上 Demo 涵蓋不到的兩項功能，改以**本機歷史儲存資料重播**補齊，同樣不寫回作品專案：

- **YOLO Elf 設定頁與偵測歷史**：把 `static/` 與 `events.db` 複製到暫存區，另寫一支唯讀重播伺服器，依 `app/events.py` 的 `_row_to_public` 與 `app/config.py` 的實際預設值回應 `/api/events`、`/api/cameras`、`/api/detector/*`。歷史頁顯示的 83 筆出現紀錄全部來自 2026-08-10 實際跑過的偵測。
- **Breeze Elf 簡譜與逐字詳情**：取 `remote_transcripts/` 的歷史逐字稿複本，由重播伺服器回應 `/api/transcribe/file` 與 `/api/transcript/analyze`，讓正式的 `web/` 前端渲染。另已驗證可用專案現行的 `_analyze_blocks_pitch` 對保存的錄音重跑後處理（該筆錄音得到主音 55.1 Hz、音準 80.2 分；因屬自由速度素材，節拍與音符時值依設計不輸出）。

## 主要修改檔案

- `src/data/portfolio.json`：作品描述、標籤、截圖清單與 `updatedAt`。
- `public/project-screenshots/`：新增 12 張、更新 2 張截圖。
- `src/App.tsx`：作品描述依空行分段輸出。
- `src/styles.css`：新增 `.project-description` 段落間距。
- `README.md`：收錄作品表。
- `.gitignore`：忽略本地端專案位置對照表。

## 待補事項

- Breeze Elf 的歌詞對齊、節奏／音符時值與翻譯尚無截圖：現有歷史錄音沒有可量測的固定拍子，依設計不會輸出音符時值；歌詞對齊需要對應歌曲的完整歌詞。下次實際使用時順手保存一份逐字稿即可補上。
- YOLO Elf 的「整張畫面」任務（語意分割、單目深度）與多相機格狀監看的實跑畫面，需要有實際串流才拍得到，目前僅有靜態展示版的示意畫面。
