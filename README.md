# Private Finance Agent

高隱私、local-first 的個人財務規劃 Web MVP。

## 目前功能

- 匿名 / 不登入即可試算
- 資產負債總覽
- 財務健康指標
- 退休規劃計算器
- 65 歲前橋接期分析
- 瀏覽器 localStorage 保存資料
- 匯出 JSON / 重設資料

## 本地開發

```bash
npm install
npm run dev
```

## 下一步建議

- 改用 IndexedDB + client-side encryption
- 加入多情境比較：保守 / 基準 / 樂觀
- 加入圖表與 PDF 匯出
- 加入對話式訪談 agent
- 部署到 Vercel

## 隱私原則

- 預設不需要帳號
- 預設不將資料送到後端
- 不要求姓名、手機、帳戶名稱
- 使用者可自行匯出或清除本地資料
