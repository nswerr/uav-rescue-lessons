"""
檢查講義網站是否符合 CLAUDE.md 的規則。
用法：在專案根目錄執行  python tools/check_site.py
只使用 Python 標準函式庫。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSON_DIR = ROOT / "lessons"
UNITS_ALLOWED = {"任務基礎", "路徑規劃", "AI 整合", "多機協作"}
LEVELS = {"入門", "基礎", "進階"}
FIELDS = ["id", "slug", "title", "summary", "unit", "level", "minutes", "tags", "updated"]

errors = []


def err(msg):
    errors.append(msg)


def load_lessons():
    text = (ROOT / "data" / "lessons.js").read_text(encoding="utf-8")
    m = re.search(r"window\.LESSONS\s*=\s*(\[.*?\]);", text, re.S)
    if not m:
        err("data/lessons.js 找不到 window.LESSONS 陣列")
        return []
    body = re.sub(r"//.*", "", m.group(1))
    body = re.sub(r"(\w+):", r'"\1":', body)          # key 加引號
    body = re.sub(r",(\s*[}\]])", r"\1", body)         # 移除結尾逗號
    try:
        return json.loads(body)
    except json.JSONDecodeError as e:
        err(f"data/lessons.js 格式無法解析：{e}")
        return []


def check_entry(i, item, seen):
    where = f"lessons.js 第 {i + 1} 筆"
    for f in FIELDS:
        if f not in item:
            err(f"{where} 缺少欄位 {f}")
    lid, slug = item.get("id", ""), item.get("slug", "")
    if not re.fullmatch(r"\d{2}", lid):
        err(f"{where} id 必須是兩位數字串：{lid!r}")
    if not slug.startswith(lid + "-") or not re.fullmatch(r"\d{2}-[a-z0-9-]+", slug):
        err(f"{where} slug 必須是 '{lid}-英文短名'：{slug!r}")
    if lid in seen:
        err(f"{where} id 重複：{lid}")
    seen.add(lid)
    if item.get("unit") not in UNITS_ALLOWED:
        err(f"{where} unit 不在允許清單：{item.get('unit')!r}")
    if item.get("level") not in LEVELS:
        err(f"{where} level 必須是 入門／基礎／進階")
    if len(item.get("title", "")) > 20:
        err(f"{where} title 超過 20 字")
    if len(item.get("summary", "")) > 40 or not item.get("summary", "").endswith("。"):
        err(f"{where} summary 要在 40 字以內並以句號結尾")
    if not 1 <= len(item.get("tags", [])) <= 4:
        err(f"{where} tags 需要 1～4 個")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item.get("updated", "")):
        err(f"{where} updated 格式應為 YYYY-MM-DD")


def check_page(item):
    path = LESSON_DIR / f"{item['slug']}.html"
    name = f"lessons/{path.name}"
    if not path.exists():
        err(f"{name} 不存在（lessons.js 有登記，但找不到檔案）")
        return
    html = path.read_text(encoding="utf-8")
    if f'data-lesson-id="{item["id"]}"' not in html:
        err(f"{name} 的 <body data-lesson-id> 與編號 {item['id']} 不符")
    h1 = re.search(r"<h1>(.*?)</h1>", html, re.S)
    if not h1 or h1.group(1).strip() != item["title"]:
        err(f"{name} 的 <h1> 與 lessons.js 的 title 不一致")
    for cls in ['class="lesson-head"', 'class="goals"', 'class="recap"', "data-pager", "data-toc"]:
        if cls not in html:
            err(f"{name} 缺少必要區塊 {cls}")
    if re.search(r"<style|style=\"|<script>(?!</script>)", html):
        err(f"{name} 含有 inline style 或 <script> 區塊（請改用共用 CSS/JS）")
    article = html.split("<article>", 1)[-1]
    for h2 in re.findall(r"<h2(?![^>]*\bid=)[^>]*>(.*?)</h2>", article):
        if h2 != "重點回顧":
            err(f"{name} 的 h2「{h2}」缺少 id")
    if "grid-map" not in html:
        err(f"{name} 沒有格子地圖元件（每篇至少一個）")
    for attr in re.findall(r'data-(?:start|goal|blocked|drones|targets)="([^"]*)"', html):
        if attr and not re.fullmatch(r"\d+,\d+(;\d+,\d+)*", attr):
            err(f"{name} 座標格式錯誤：{attr!r}（應為 列,欄;列,欄）")
    for href in re.findall(r'(?:href|src)="(/[^"]*)"', html):
        err(f"{name} 使用了絕對路徑 {href}（請改相對路徑）")


def check_orphans(slugs):
    for f in LESSON_DIR.glob("*.html"):
        if f.name.startswith("_"):
            continue
        if f.stem not in slugs:
            err(f"lessons/{f.name} 沒有登記在 data/lessons.js")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows 終端機也能顯示中文
    except AttributeError:
        pass
    lessons = load_lessons()
    seen = set()
    for i, item in enumerate(lessons):
        check_entry(i, item, seen)
        if "slug" in item and "id" in item:
            check_page(item)
    check_orphans({l.get("slug") for l in lessons})
    ids = [l.get("id") for l in lessons]
    if ids != sorted(ids):
        err("lessons.js 的順序必須依編號遞增")

    if errors:
        print(f"發現 {len(errors)} 個問題：")
        for e in errors:
            print("  ✗", e)
        sys.exit(1)
    print(f"全部通過：共 {len(lessons)} 篇講義")


if __name__ == "__main__":
    main()
