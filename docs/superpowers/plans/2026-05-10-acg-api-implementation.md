# acg-api 随机图片 API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 GitHub Pages 的纯静态随机图片 API，支持分类筛选、自定义图片来源、JSON 响应和客户端跳转。

**Architecture:** 纯前端方案，HTML + 原生 JavaScript。`index.html` 作为统一入口，`js/app.js` 根据 URL 路径分发路由。`scripts/build.js` 扫描本地图片目录并获取外部 API 源，生成 `data/images.json` 索引。GitHub Pages 部署静态文件。

**Tech Stack:** HTML, 原生 JavaScript, Node.js (构建脚本), GitHub Actions

---

## File Structure

```
acg-api/
├── index.html                          # 统一入口 + API 文档首页
├── js/
│   ├── app.js                          # 路由逻辑、API 响应、随机选取
│   └── config.js                       # base URL 等运行时配置
├── images/                             # 本地图片目录（示例）
│   ├── anime/
│   └── landscape/
├── data/
│   ├── images.json                     # 自动生成的图片索引
│   └── external.json                   # 外部 API 源配置（手动维护）
├── scripts/
│   └── build.js                        # Node.js 构建脚本
├── .github/
│   └── workflows/
│       └── build.yml                   # GitHub Actions 自动构建
└── docs/
    └── superpowers/specs/              # 设计文档（已有）
```

---

## Task 1: 项目初始化与目录结构

**Files:**
- Create: `data/external.json`
- Create: `images/anime/.gitkeep`
- Create: `images/landscape/.gitkeep`
- Create: `images/wallpaper/.gitkeep`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p images/anime images/landscape images/wallpaper data js scripts .github/workflows
```

- [ ] **Step 2: 创建 external.json 初始配置**

写入 `data/external.json`：

```json
{
  "sources": []
}
```

- [ ] **Step 3: 创建 .gitkeep 占位文件**

```bash
touch images/anime/.gitkeep images/landscape/.gitkeep images/wallpaper/.gitkeep
```

- [ ] **Step 4: 创建空的 images.json 初始版本**

写入 `data/images.json`：

```json
{
  "version": 1,
  "generated": "2026-05-10T00:00:00Z",
  "categories": {}
}
```

- [ ] **Step 5: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize project structure"
```

---

## Task 2: 构建脚本 build.js

**Files:**
- Create: `scripts/build.js`

- [ ] **Step 1: 编写 build.js 核心逻辑**

写入 `scripts/build.js`：

```javascript
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const EXTERNAL_CONFIG = path.join(__dirname, '..', 'data', 'external.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'images.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

function scanLocalImages() {
  const categories = {};
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('  No images/ directory found, skipping local scan');
    return categories;
  }

  const dirs = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of dirs) {
    const category = dir.name;
    const categoryPath = path.join(IMAGES_DIR, category);
    const files = fs.readdirSync(categoryPath)
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .map(f => ({
        url: `images/${category}/${f}`,
        type: 'local'
      }));

    if (files.length > 0) {
      categories[category] = files;
      console.log(`  ✓ ${category}: ${files.length} images`);
    }
  }

  return categories;
}

function extractByJsonPath(obj, jsonPath) {
  const parts = jsonPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (part === '[]') {
      if (Array.isArray(current)) {
        return current;
      }
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function fetchExternalSource(source) {
  return new Promise((resolve, reject) => {
    if (!source.enabled) {
      resolve([]);
      return;
    }

    const url = source.endpoint;
    const client = url.startsWith('https') ? https : http;

    console.log(`  Fetching ${source.name}...`);

    client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          let urls = extractByJsonPath(json, source.jsonPath);

          if (!Array.isArray(urls)) {
            urls = urls ? [urls] : [];
          }

          const images = urls
            .filter(u => typeof u === 'string' && u.length > 0)
            .map(u => ({
              url: u,
              type: 'external'
            }));

          console.log(`  ✓ ${source.name}: ${images.length} images`);
          resolve(images);
        } catch (e) {
          console.error(`  ✗ ${source.name}: parse error - ${e.message}`);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error(`  ✗ ${source.name}: fetch error - ${e.message}`);
      resolve([]);
    }).on('timeout', () => {
      console.error(`  ✗ ${source.name}: timeout`);
      resolve([]);
    });
  });
}

async function fetchAllExternalSources() {
  if (!fs.existsSync(EXTERNAL_CONFIG)) {
    return {};
  }

  const config = JSON.parse(fs.readFileSync(EXTERNAL_CONFIG, 'utf-8'));
  if (!config.sources || config.sources.length === 0) {
    return {};
  }

  const categories = {};

  for (const source of config.sources) {
    const images = await fetchExternalSource(source);
    if (images.length > 0) {
      const category = source.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(...images);
    }
  }

  return categories;
}

async function main() {
  console.log('Building image index...\n');

  // Scan local images
  console.log('Scanning local images:');
  const localCategories = scanLocalImages();

  // Fetch external sources
  console.log('\nFetching external sources:');
  const externalCategories = await fetchAllExternalSources();

  // Merge categories
  const allCategories = { ...localCategories };
  for (const [category, images] of Object.entries(externalCategories)) {
    if (allCategories[category]) {
      allCategories[category].push(...images);
    } else {
      allCategories[category] = images;
    }
  }

  // Generate output
  const output = {
    version: 1,
    generated: new Date().toISOString(),
    categories: allCategories
  };

  // Ensure data/ directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print summary
  const totalImages = Object.values(allCategories).reduce((sum, imgs) => sum + imgs.length, 0);
  const totalCategories = Object.keys(allCategories).length;
  console.log(`\n✓ Generated ${OUTPUT_FILE}`);
  console.log(`  ${totalImages} images in ${totalCategories} categories`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: 测试 build.js 运行**

```bash
node scripts/build.js
```

预期输出：`0 images in 0 categories`（因为 images/ 目录为空）

- [ ] **Step 3: 添加测试图片并验证**

创建一个测试图片（用任意小图片文件）：

```bash
# 用 ImageMagick 或手动放一张测试图片
# 或者用 node 创建一个最小的 1x1 PNG
node -e "
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'images', 'anime');
fs.mkdirSync(dir, { recursive: true });
// 1x1 red PNG
const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(dir, 'test.png'), buf);
"
```

再次运行 build.js：

```bash
node scripts/build.js
```

预期：输出 `anime: 1 images`，data/images.json 被更新。

- [ ] **Step 4: 验证 images.json 内容**

```bash
cat data/images.json
```

预期内容：
```json
{
  "version": 1,
  "generated": "2026-05-10T...",
  "categories": {
    "anime": [
      { "url": "images/anime/test.png", "type": "local" }
    ]
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build.js
git commit -m "feat: add build script for image index generation"
```

---

## Task 3: 前端逻辑 app.js

**Files:**
- Create: `js/config.js`
- Create: `js/app.js`

- [ ] **Step 1: 创建 config.js**

写入 `js/config.js`：

```javascript
const API_CONFIG = {
  // GitHub Pages 部署时的基础路径
  // 如果部署在 username.github.io/acg-api/，设为 '/acg-api'
  // 如果使用自定义域名，设为 ''
  basePath: '/acg-api',

  // images.json 的相对路径（相对于 basePath）
  dataPath: '/data/images.json',

  // 随机选取的最大数量限制
  maxBatchSize: 20
};

// 自动检测 basePath（兼容开发环境）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_CONFIG.basePath = '';
}

function getBaseUrl() {
  return API_CONFIG.basePath;
}

function getAbsoluteUrl(relativePath) {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return getBaseUrl() + '/' + relativePath;
}

function getDataUrl() {
  return getBaseUrl() + API_CONFIG.dataPath;
}
```

- [ ] **Step 2: 创建 app.js 核心路由逻辑**

写入 `js/app.js`：

```javascript
let imageData = null;

async function loadImageData() {
  if (imageData) return imageData;
  const response = await fetch(getDataUrl());
  imageData = await response.json();
  return imageData;
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function errorResponse(code, message, status = 404) {
  return jsonResponse({ code, message }, status);
}

async function handleApiRandom(params) {
  const data = await loadImageData();
  const category = params.get('category');
  const size = Math.min(parseInt(params.get('size') || '1', 10), API_CONFIG.maxBatchSize);

  if (category) {
    if (!data.categories[category]) {
      return errorResponse(404, `Category "${category}" not found`);
    }
    const images = data.categories[category];
    const selected = getRandomItems(images, size);
    const result = selected.map(img => ({
      url: getAbsoluteUrl(img.url),
      category,
      type: img.type
    }));
    return jsonResponse({ code: 200, data: size === 1 ? result[0] : result });
  }

  // No category specified - pick from all
  const allImages = Object.entries(data.categories).flatMap(([cat, imgs]) =>
    imgs.map(img => ({
      url: getAbsoluteUrl(img.url),
      category: cat,
      type: img.type
    }))
  );

  if (allImages.length === 0) {
    return errorResponse(404, 'No images available');
  }

  const selected = getRandomItems(allImages, size);
  return jsonResponse({ code: 200, data: size === 1 ? selected[0] : selected });
}

async function handleApiCategories() {
  const data = await loadImageData();
  const categories = Object.entries(data.categories).map(([name, imgs]) => ({
    name,
    count: imgs.length
  }));
  return jsonResponse({ code: 200, data: categories });
}

async function handleImgRandom(params) {
  const data = await loadImageData();
  const category = params.get('category');

  let pool;
  if (category) {
    if (!data.categories[category]) {
      return errorResponse(404, `Category "${category}" not found`);
    }
    pool = data.categories[category];
  } else {
    pool = Object.values(data.categories).flat();
  }

  if (pool.length === 0) {
    return errorResponse(404, 'No images available');
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  const url = getAbsoluteUrl(selected.url);

  // Return HTML page that auto-redirects
  return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<script>window.location.replace("${url}");</script>
<noscript><meta http-equiv="refresh" content="0;url=${url}"></noscript>
<p>Redirecting to <a href="${url}">${url}</a>...</p>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleRoot() {
  // Return the index.html content (same page, but show docs)
  return null; // Let index.html handle its own display
}

async function route() {
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const params = url.searchParams;

  try {
    // API routes
    if (pathname.endsWith('/api/random')) {
      return await handleApiRandom(params);
    }
    if (pathname.endsWith('/api/categories')) {
      return await handleApiCategories();
    }
    if (pathname.endsWith('/img/random')) {
      return await handleImgRandom(params);
    }

    // Root - show docs
    if (pathname === '/' || pathname === getBaseUrl() || pathname === getBaseUrl() + '/') {
      return await handleRoot();
    }

    return errorResponse(404, 'Not found');
  } catch (err) {
    return errorResponse(500, err.message, 500);
  }
}

// Execute route on load
(async function() {
  const response = await route();
  if (response) {
    // If it's a redirect or JSON response, navigate accordingly
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      // For /img/random, replace the page
      const text = await response.text();
      document.open();
      document.write(text);
      document.close();
    } else if (contentType.includes('application/json')) {
      // For API routes, display JSON
      const json = await response.text();
      document.open();
      document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ACG API</title>
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #e0e0e0; padding: 20px; }
    pre { background: #16213e; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .error { color: #ff6b6b; }
  </style>
</head>
<body>
  <pre class="${json.includes('"code": 4') || json.includes('"code": 5') ? 'error' : ''}">${json}</pre>
  <p><a href="${getBaseUrl()}/">← Back to API docs</a></p>
</body>
</html>`);
      document.close();
    }
  }
})();
```

- [ ] **Step 3: Commit**

```bash
git add js/config.js js/app.js
git commit -m "feat: add frontend routing and API logic"
```

---

## Task 4: index.html 首页

**Files:**
- Create: `index.html`

- [ ] **Step 1: 创建 index.html**

写入 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACG API - Random Image API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      background: #0f0f23;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 2.5em;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #888; margin-bottom: 40px; font-size: 1.1em; }
    .section { margin-bottom: 32px; }
    .section h2 {
      font-size: 1.3em;
      margin-bottom: 16px;
      color: #667eea;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
    }
    .endpoint {
      background: #16213e;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 3px solid #667eea;
    }
    .endpoint .path {
      font-family: monospace;
      color: #667eea;
      font-size: 1.1em;
      margin-bottom: 8px;
    }
    .endpoint .desc { color: #aaa; font-size: 0.9em; }
    code {
      background: #1a1a3e;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    pre {
      background: #16213e;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      line-height: 1.5;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: #16213e;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .count { font-size: 2em; color: #667eea; }
    .stat-card .label { color: #888; font-size: 0.9em; }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      text-decoration: none;
      margin: 4px;
    }
    .btn:hover { opacity: 0.9; }
    .test-result {
      margin-top: 12px;
      padding: 12px;
      border-radius: 8px;
      display: none;
    }
    .test-result.success { background: #1a3a1a; display: block; }
    .test-result.error { background: #3a1a1a; display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ACG API</h1>
    <p class="subtitle">Random Image API - JSON responses & client-side redirects</p>

    <div class="section">
      <h2>Quick Start</h2>
      <p>Get a random image as JSON:</p>
      <pre>curl https://<span id="hostname">username.github.io</span>/acg-api/api/random</pre>
      <p>Jump directly to a random image:</p>
      <pre>https://<span id="hostname2">username.github.io</span>/acg-api/img/random</pre>
    </div>

    <div class="section">
      <h2>API Endpoints</h2>
      <div class="endpoint">
        <div class="path">GET /api/random</div>
        <div class="desc">Return a random image as JSON. Add <code>?category=anime</code> to filter by category, <code>&size=5</code> for multiple.</div>
      </div>
      <div class="endpoint">
        <div class="path">GET /api/categories</div>
        <div class="desc">Return all categories with image counts.</div>
      </div>
      <div class="endpoint">
        <div class="path">GET /img/random</div>
        <div class="desc">Redirect to a random image. Add <code>?category=anime</code> to filter.</div>
      </div>
    </div>

    <div class="section">
      <h2>Categories</h2>
      <div class="stats" id="stats">Loading...</div>
    </div>

    <div class="section">
      <h2>Test</h2>
      <button class="btn" onclick="testRandom()">Get Random Image (JSON)</button>
      <button class="btn" onclick="testCategories()">Get Categories</button>
      <button class="btn" onclick="testRedirect()">Random Image Redirect</button>
      <div id="test-result" class="test-result"></div>
    </div>

    <div class="section">
      <h2>Usage Examples</h2>
      <pre>curl https://<span id="hostname3">username.github.io</span>/acg-api/api/random

curl https://<span id="hostname4">username.github.io</span>/acg-api/api/random?category=anime

curl https://<span id="hostname5">username.github.io</span>/acg-api/api/random?category=anime&size=5

curl https://<span id="hostname6">username.github.io</span>/acg-api/api/categories</pre>
    </div>
  </div>

  <script src="js/config.js"></script>
  <script>
    // Update hostname in examples
    const host = window.location.host;
    document.querySelectorAll('[id^="hostname"]').forEach(el => el.textContent = host);

    // Load stats
    fetch(getDataUrl())
      .then(r => r.json())
      .then(data => {
        const statsEl = document.getElementById('stats');
        const categories = Object.entries(data.categories);
        if (categories.length === 0) {
          statsEl.innerHTML = '<div class="stat-card"><div class="count">0</div><div class="label">No images yet</div></div>';
          return;
        }
        const total = categories.reduce((sum, [, imgs]) => sum + imgs.length, 0);
        statsEl.innerHTML = `
          <div class="stat-card"><div class="count">${total}</div><div class="label">Total</div></div>
          ${categories.map(([name, imgs]) =>
            `<div class="stat-card"><div class="count">${imgs.length}</div><div class="label">${name}</div></div>`
          ).join('')}
        `;
      })
      .catch(() => {
        document.getElementById('stats').innerHTML = '<div class="stat-card"><div class="count">?</div><div class="label">Could not load</div></div>';
      });

    // Test functions
    function showResult(el, success, text) {
      el.className = 'test-result ' + (success ? 'success' : 'error');
      el.textContent = text;
    }

    async function testRandom() {
      const el = document.getElementById('test-result');
      try {
        const r = await fetch(getBaseUrl() + '/api/random');
        const data = await r.json();
        showResult(el, data.code === 200, JSON.stringify(data, null, 2));
      } catch (e) {
        showResult(el, false, e.message);
      }
    }

    async function testCategories() {
      const el = document.getElementById('test-result');
      try {
        const r = await fetch(getBaseUrl() + '/api/categories');
        const data = await r.json();
        showResult(el, data.code === 200, JSON.stringify(data, null, 2));
      } catch (e) {
        showResult(el, false, e.message);
      }
    }

    function testRedirect() {
      window.open(getBaseUrl() + '/img/random', '_blank');
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: 本地测试页面**

用浏览器打开 index.html，验证：
1. 页面能正常加载
2. 分类统计能显示（如果有图片）
3. "Get Random Image" 按钮能返回 JSON
4. "Get Categories" 按钮能返回分类列表

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add index.html with API documentation page"
```

---

## Task 5: GitHub Actions 自动构建

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: 创建 workflow 文件**

写入 `.github/workflows/build.yml`：

```yaml
name: Build Image Index

on:
  push:
    branches: [main]
    paths:
      - 'images/**'
      - 'data/external.json'
      - 'scripts/build.js'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build image index
        run: node scripts/build.js

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/images.json
          git diff --staged --quiet || git commit -m "chore: update image index [skip ci]"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add GitHub Actions workflow for auto build"
```

---

## Task 6: 完整测试与最终验证

**Files:**
- Modify: `data/external.json` (添加测试外部源)

- [ ] **Step 1: 添加多个测试图片**

确保 images/ 目录下有多个分类的测试图片，以便完整验证：

```bash
# 创建 landscape 测试图片
node -e "
const fs = require('fs');
const path = require('path');
const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const landscapeDir = path.join(__dirname, 'images', 'landscape');
fs.mkdirSync(landscapeDir, { recursive: true });
fs.writeFileSync(path.join(landscapeDir, 'test1.png'), buf);
fs.writeFileSync(path.join(landscapeDir, 'test2.png'), buf);
"
```

- [ ] **Step 2: 运行构建**

```bash
node scripts/build.js
```

预期：输出 2 个分类（anime, landscape），共 3 张图片。

- [ ] **Step 3: 验证 images.json**

```bash
cat data/images.json | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('Version:', data.version);
console.log('Categories:', Object.keys(data.categories));
for (const [cat, imgs] of Object.entries(data.categories)) {
  console.log('  ' + cat + ':', imgs.length, 'images');
}
"
```

预期：
```
Version: 1
Categories: [ 'anime', 'landscape' ]
  anime: 1 images
  landscape: 2 images
```

- [ ] **Step 4: 本地启动服务器测试**

```bash
npx serve . -p 3000
```

打开 `http://localhost:3000`，验证：
1. 首页显示分类统计
2. 点击 "Get Random Image" 返回 JSON
3. 点击 "Get Categories" 返回分类列表
4. 点击 "Random Image Redirect" 跳转到图片

- [ ] **Step 5: 测试 API 参数**

用浏览器或 curl 测试：

```
http://localhost:3000/api/random
http://localhost:3000/api/random?category=anime
http://localhost:3000/api/random?category=landscape&size=2
http://localhost:3000/api/categories
http://localhost:3000/api/random?category=nonexistent  (应返回 404)
http://localhost:3000/img/random
http://localhost:3000/img/random?category=anime
```

- [ ] **Step 6: Commit 测试数据并清理**

```bash
# 保留测试图片以便后续使用
git add images/
git commit -m "chore: add test images for verification"
```

---

## Task 7: 项目配置与文档

**Files:**
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: 创建 .gitignore**

写入 `.gitignore`：

```
node_modules/
.DS_Store
Thumbs.db
*.log
```

- [ ] **Step 2: 创建 README.md**

写入 `README.md`：

```markdown
# ACG API

Random Image API hosted on GitHub Pages. Supports JSON responses and client-side redirects.

## Usage

### Get Random Image (JSON)
```
curl https://your-username.github.io/acg-api/api/random
```

### Get Random Image by Category
```
curl https://your-username.github.io/acg-api/api/random?category=anime
```

### Get Multiple Random Images
```
curl https://your-username.github.io/acg-api/api/random?category=anime&size=5
```

### Get All Categories
```
curl https://your-username.github.io/acg-api/api/categories
```

### Direct Image Redirect
Open in browser: `https://your-username.github.io/acg-api/img/random`

## Adding Images

### Local Images
1. Add images to `images/<category>/` directory
2. Push to main branch
3. GitHub Actions will auto-build the index

### External Sources
1. Edit `data/external.json`
2. Push to main branch

## Development

```bash
# Build image index
node scripts/build.js

# Start local server
npx serve .
```

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore README.md
git commit -m "chore: add project config and documentation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| 项目目录结构 | Task 1 |
| build.js 扫描本地图片 | Task 2 |
| build.js 获取外部源 | Task 2 |
| images.json 数据格式 | Task 2 |
| external.json 配置格式 | Task 2 |
| js/config.js 运行时配置 | Task 3 |
| js/app.js 路由逻辑 | Task 3 |
| /api/random JSON 响应 | Task 3 |
| /api/random?category=xx 筛选 | Task 3 |
| /api/random?size=xx 批量 | Task 3 |
| /api/categories 分类列表 | Task 3 |
| /img/random 跳转 | Task 3 |
| index.html 首页文档 | Task 4 |
| GitHub Actions 自动构建 | Task 5 |
| 多分类测试 | Task 6 |
| API 参数测试 | Task 6 |
| .gitignore | Task 7 |
| README.md | Task 7 |

All spec requirements covered.
