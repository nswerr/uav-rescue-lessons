/*
 * 講義清單：網站唯一的目錄資料來源。
 * 新增講義時在陣列「最後」加一筆，欄位規則見 CLAUDE.md 第 5 節。
 * 首頁卡片與每頁的上一篇／下一篇導覽都由這份清單自動產生。
 */
window.SITE = {
  title: "UAV 搜救任務規劃講義",
  units: ["任務基礎", "路徑規劃", "AI 整合", "多機協作"]
};

window.LESSONS = [
  {
    id: "01",
    slug: "01-grid-map",
    title: "把搜救區域變成格子地圖",
    summary: "用列、欄座標描述起點、待查點與禁飛格，建立找路的共同語言。",
    unit: "任務基礎",
    level: "入門",
    minutes: 10,
    tags: ["座標", "禁飛格", "建模"],
    updated: "2026-11-15"
  },
  {
    id: "02",
    slug: "02-bfs-shortest-path",
    title: "BFS：找出步數最少的航線",
    summary: "由近到遠一圈一圈搜尋，第一次碰到待查點時回溯，就是最短路徑。",
    unit: "路徑規劃",
    level: "基礎",
    minutes: 15,
    tags: ["BFS", "最短路徑", "改道"],
    updated: "2026-11-15"
  },
  {
    id: "03",
    slug: "03-ai-tool-use",
    title: "讓 AI 呼叫找路工具",
    summary: "語言模型負責聽懂指令，Python 負責計算，兩者用工具呼叫分工。",
    unit: "AI 整合",
    level: "基礎",
    minutes: 15,
    tags: ["Tool Use", "Groq", "Gradio"],
    updated: "2026-11-15"
  },
  {
    id: "04",
    slug: "04-multi-uav-assignment",
    title: "多架無人機怎麼分配目標",
    summary: "從一架擴充到多架：用 BFS 步數當成本，貪婪地把目標分給最近的無人機。",
    unit: "多機協作",
    level: "進階",
    minutes: 20,
    tags: ["任務分配", "貪婪法", "多代理"],
    updated: "2026-11-15"
  }
];
