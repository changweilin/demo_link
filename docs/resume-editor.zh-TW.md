# 本地履歷編輯器

履歷編輯器已改為本地端 UI，不需要 Google 登入、GitHub token 或 GitHub Actions。編輯入口仍是：

- 首頁導覽列：`本地編輯履歷`
- 本機網址：`http://localhost:5173/#resume-editor`

## 使用方式

1. 啟動本機開發伺服器：

```bash
npm run dev
```

2. 開啟 `http://localhost:5173/#resume-editor`。
3. 在 UI 中編輯履歷內容。
4. 使用 `下載 JSON` 匯出 `resume.json`，或使用 `複製 JSON` 取得目前草稿內容。

編輯器會把草稿暫存在目前瀏覽器的 `localStorage`，重新整理頁面後仍可繼續編輯。若要帶入其他版本，使用 `匯入 JSON` 選擇本機的 `resume.json`。

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
