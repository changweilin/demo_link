# 未完成計畫

## 104 / LinkedIn / Cake 登入對接

目前結論：

- LinkedIn 可先完成官方 OAuth / OpenID Connect 登入對接。官方支援 `openid profile email` scope，可取得會員基本資料與 email；但這只是登入與身分確認，不等於可直接寫回 LinkedIn Profile。若要自動更新 LinkedIn 履歷欄位，後續仍需確認 LinkedIn App 是否取得對應寫入權限與 API 產品。
- 104 目前查到的官方 API 是偏企業招募端的 eRecruitor 履歷與職缺傳輸服務，不是求職者個人履歷的公開 OAuth / 寫回 API。因此現階段只能先導到 104 官方履歷頁登入，登入後由使用者確認或手動更新。
- Cake 目前公開文件主要是登入後的履歷管理操作說明，尚未看到可供個人履歷自動寫回的公開 OAuth / API。因此現階段先導到 Cake 登入頁，後續再評估官方 API、合作介面或本機瀏覽器自動化。

已落地的方向：

- 前端同步面板保留 `平台登入` 區塊。
- 本機新增 `/api/resume-platform-auth` 作為登入狀態入口。
- LinkedIn 預留 OAuth callback：`http://127.0.0.1:43177/api/resume-platform-auth/linkedin/callback`。
- 104 / Cake 暫時採外部登入 handoff，不偽造不存在的公開 API。
- token 與 client secret 只放後端或本機環境變數，不使用 `VITE_` 前綴暴露到前端。

下一步：

1. 建立或設定 LinkedIn Developer App，加入 callback URL，填入 `RESUME_AUTH_LINKEDIN_CLIENT_ID` 與 `RESUME_AUTH_LINKEDIN_CLIENT_SECRET`。
2. 實測 LinkedIn 登入流程，確認本機 auth state 能保存登入狀態與基本 profile。
3. 釐清 104 / Cake 是否有正式個人履歷寫回 API；若沒有，維持手動同步稿或另評估瀏覽器自動化。
4. 在取得明確寫回 API 或自動化策略前，`同步到平台` 不應宣稱已直接修改外部履歷。
