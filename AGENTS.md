# AGENTS.md

本專案的完整規則寫在 [`CLAUDE.md`](CLAUDE.md)，任何 AI 代理（Codex、Claude、Gemini 等）在修改檔案前都必須先閱讀它。

最重要的三條：

1. 新增講義：複製 `lessons/_template.html` → 命名 `NN-英文短名.html` → 登記到 `data/lessons.js`。
2. 不手改 `index.html` 的講義列表，不在講義中寫 inline style 或 `<script>`。
3. 完成後執行 `python tools/check_site.py`，必須顯示「全部通過」。
