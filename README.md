# 多益單字庫

個人 TOEIC 錯誤單字資料庫與 Web UI。資料以 SQLite 結構管理，網站透過 GitHub Pages 發佈。

網站：<https://hubharveykuo.github.io/toeic/>

## 主要功能

- 依文章／題組分組顯示單字
- 每篇文章內依「單字第一次出現在原文的位置」排序
- 跨文章允許相同單字各自存在
- 同一篇文章內，同一單字只保存一次
- 搜尋 Word、中文多義、常見搭配與本文用法
- 依文章、重要性、熟悉度篩選
- 「今天新增」快速篩選
- S／A／B／C TOEIC 學習重要性
- 陌生／模糊／熟悉熟悉度

## 資料欄位

每筆單字包含：

- Word
- 中文多義
- 詞性
- 常見搭配
- 本文用法
- 重要性：S / A / B / C
- 熟悉度：陌生 / 模糊 / 熟悉
- 加入日期
- 所屬文章
- 單字在原文第一次出現的位置

## 排序規則

`position` 代表單字在該篇原文中第一次出現的順序。

例如：

```text
Test 1｜Q161–163
01 apartment
02 tenant
03 maintenance
...
21 present
```

同一個單字可以存在於不同文章，例如 `present` 可分別存在於 Q158–160 與 Q161–163，並保留各自的本文用法與 position。

## 重要性

| 等級 | 用途 |
| --- | --- |
| S | 必背 |
| A | 高頻 |
| B | 建議 |
| C | 認得即可 |

## 專案結構

```text
toeic/
├── index.html
├── app.js
├── styles.css
├── schema.sql
├── data/
│   └── seed.sql
├── scripts/
│   └── validate.sql
└── .github/
    └── workflows/
        └── validate-data.yml
```

## SQLite

建立本機資料庫：

```bash
sqlite3 toeic.db < data/seed.sql
```

主要資料表：

- `articles`：文章／題組
- `vocabulary`：單字資料

## 資料驗證

Repository 會自動檢查：

- SQLite integrity
- foreign key 是否有效
- 同篇文章是否有重複單字
- 同篇文章是否有重複 position
- position 是否從 1 開始且連續
- importance 是否只使用 S / A / B / C
- familiarity 是否只使用 陌生 / 模糊 / 熟悉
- Word、中文多義等必要資料是否缺漏

每次修改 `data/`、`schema.sql` 或驗證規則時，GitHub Actions 都會自動執行檢查。若資料有問題，Actions 會顯示失敗，避免錯誤資料持續累積。

## 資料來源

初始資料由 Notion「多益錯誤單字庫」匯入。後續以此 repository 的 SQLite 資料結構與排序規則為準。
