# 多益學習專案

以 SQLite 為核心的 TOEIC 錯誤單字庫。

## 規則
- 每篇文章獨立保存單字。
- 不同文章允許出現相同單字，例如 present。
- 同一篇文章同一單字只保存一次。
- `position` 代表單字在該篇原文第一次出現的順序。
- 單字正規化為 lemma/base form。
- 保留中文多義、詞性、常見搭配、本文用法、重要性、熟悉度與加入日期。

## 重要性
- S：必背
- A：高頻
- B：建議
- C：認得即可

## 資料
`data/seed.sql` 可直接用 SQLite 建立目前從 Notion 匯入的資料庫：

```bash
sqlite3 toeic.db < data/seed.sql
```

目前包含：
- Test 1｜Q158–160
- Test 1｜Q161–163

來源：Notion「多益錯誤單字庫」。
