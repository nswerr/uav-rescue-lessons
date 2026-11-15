# UAV 搜救任務規劃講義

延伸自期末專案《無人機搜救任務規劃助手》的講義網站：格子地圖、BFS 最短路徑、AI 工具呼叫、多無人機任務分配。每篇講義都有可點擊的互動地圖。

- 網站：https://nswerr.github.io/uav-rescue-lessons/
- 專案規則：[`CLAUDE.md`](CLAUDE.md)（AI 協作必讀）

## 本機預覽

不需要安裝任何套件，直接用瀏覽器開啟 `index.html` 即可。

## 新增講義

請 AI 依照 `CLAUDE.md` 新增，或手動：

1. 複製 `lessons/_template.html`，命名為 `NN-英文短名.html`
2. 撰寫內容
3. 在 `data/lessons.js` 最後加一筆
4. 執行 `python tools/check_site.py`

## 目錄

```
index.html          首頁（自動列出講義）
lessons/            講義頁面與範本
data/lessons.js     講義清單
assets/css, js      共用樣式與互動元件
tools/              檢查腳本
```
