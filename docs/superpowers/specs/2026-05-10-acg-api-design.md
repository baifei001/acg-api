# acg-api 随机图片 API 设计文档

## 概述

一个基于 GitHub Pages 的纯静态随机图片 API，支持分类筛选、自定义图片来源、JSON 响应和客户端跳转两种模式。

## 技术栈

- **前端**：HTML + 原生 JavaScript（无框架依赖）
- **托管**：GitHub Pages（静态站点）
- **构建**：Node.js 脚本 + GitHub Actions 自动化
- **图片源**：本地目录 + 外部 API 配置

## 项目结构

```
acg-api/
├── index.html                    # 统一入口页面（同时作为 API 文档）
├── js/
│   ├── app.js                    # 路由与 API 逻辑
│   └── config.js                 # 配置（外部源等）
├── images/                       # 本地图片目录
│   ├── anime/
│   │   ├── 001.jpg
│   │   └── 002.png
│   ├── landscape/
│   │   └── 001.jpg
│   └── wallpaper/
│       └── 001.webp
├── data/
│   ├── images.json               # 自动生成的图片索引
│   └── external.json             # 外部 API 源配置
├── scripts/
│   └── build.js                  # Node.js 构建脚本
├── .github/
│   └── workflows/
│       └── build.yml             # GitHub Actions 自动构建
└── README.md
```

## API 设计

### 端点列表

| 路径 | 方法 | 功能 | 返回 |
|------|------|------|------|
| `/` | GET | 首页/API 文档 | HTML 页面 |
| `/api/random` | GET | 随机图片 JSON | JSON |
| `/api/random?category=anime` | GET | 按分类随机图片 JSON | JSON |
| `/api/random?category=anime&size=5` | GET | 按分类随机多张图片 JSON（size 默认 1，最大 20） | JSON |
| `/api/categories` | GET | 所有分类列表 | JSON |
| `/img/random` | GET | 直接跳转到随机图片 | 客户端跳转 |
| `/img/random?category=anime` | GET | 按分类跳转到随机图片 | 客户端跳转 |

### JSON 响应格式

```json
// GET /api/random
{
  "code": 200,
  "data": {
    "url": "https://username.github.io/acg-api/images/anime/001.jpg",
    "category": "anime",
    "type": "local"
  }
}

// GET /api/random?category=anime&size=3
{
  "code": 200,
  "data": [
    { "url": "...", "category": "anime", "type": "local" },
    { "url": "...", "category": "anime", "type": "external" },
    { "url": "...", "category": "anime", "type": "local" }
  ]
}

// GET /api/categories
{
  "code": 200,
  "data": ["anime", "landscape", "wallpaper"]
}

// 错误响应
{
  "code": 404,
  "message": "Category not found"
}
```

### 跳转模式（/img/* 路径）

使用 `window.location.replace()` 实现客户端跳转。浏览器地址栏直接变为图片 URL，不会留下中间页面。

## 数据结构

### images.json（自动生成）

```json
{
  "version": 1,
  "generated": "2026-05-10T12:00:00Z",
  "categories": {
    "anime": [
      { "url": "images/anime/001.jpg", "type": "local" },
      { "url": "https://external.com/img/001.jpg", "type": "external" }
    ],
    "landscape": [
      { "url": "images/landscape/001.jpg", "type": "local" }
    ]
  }
}
```

### external.json（手动配置外部源）

```json
{
  "sources": [
    {
      "name": "example-api",
      "endpoint": "https://api.example.com/images",
      "category": "anime",
      "format": "json",
      "jsonPath": "data.url",       // 点号路径，提取 JSON 中的图片 URL
      "enabled": true
    }
  ]
}
```

**jsonPath 说明**：使用点号路径从外部 API 响应中提取图片 URL。例如 `"data.url"` 表示取 `response.data.url`。如果返回的是数组，使用 `"data.[].url"` 表示遍历数组取每个元素的 `url` 字段。

## 构建系统

### build.js 功能

1. 扫描 `images/` 目录，按子目录名归类生成分类
2. 读取 `data/external.json` 中配置的外部 API 源，在构建时请求外部 API 获取图片列表
3. 合并本地和外部图片列表，写入 `data/images.json`
4. 输出 `data/images.json`

**注意**：外部源在构建时（build.js 运行时）获取并固化到 images.json 中，不是运行时动态请求。这样 GitHub Pages 的静态文件可以直接提供完整数据。

支持的图片格式：jpg, jpeg, png, gif, webp, svg, bmp

### GitHub Actions 自动构建

触发条件：
- push 到 main 分支且 `images/`、`data/external.json`、`scripts/build.js` 有变更
- 支持手动触发（workflow_dispatch）

流程：
1. checkout 代码
2. 安装 Node.js 20
3. 运行 `node scripts/build.js`
4. 自动提交更新后的 `images.json`

## 前端逻辑

### 路由判断（app.js）

```
加载 index.html
  ↓
读取 location.pathname
  ↓
/api/random  → 读取 images.json → 随机选取 → 返回 JSON
/api/categories → 读取 images.json → 返回分类列表
/img/random  → 读取 images.json → 随机选取 → window.location.replace(url)
其他路径     → 显示首页（API 文档）
```

### 首页展示

- 所有可用 API 端点及说明
- 使用示例（curl 命令）
- 当前图片统计（各分类数量）
- 在线测试按钮

## 使用示例

```bash
# 获取随机图片 JSON
curl https://username.github.io/acg-api/api/random

# 获取指定分类的随机图片
curl https://username.github.io/acg-api/api/random?category=anime

# 获取多张随机图片
curl https://username.github.io/acg-api/api/random?category=anime&size=5

# 获取所有分类
curl https://username.github.io/acg-api/api/categories

# 浏览器直接跳转到随机图片
https://username.github.io/acg-api/img/random
https://username.github.io/acg-api/img/random?category=anime
```

## 添加新图片的流程

### 本地图片
1. 将图片放入 `images/分类名/` 目录
2. push 到 main 分支
3. GitHub Actions 自动运行 `build.js` 更新索引
4. 新图片立即可用

### 外部源
1. 编辑 `data/external.json`，添加新的外部 API 配置
2. push 到 main 分支
3. GitHub Actions 自动运行 `build.js` 同步并更新索引

## 局限性

- **非真正 302 重定向**：`/img/*` 路径使用客户端 JS 跳转，非 HTTP 302 状态码
- **GitHub Pages 缓存**：更新索引后可能有几分钟 CDN 缓存延迟
- **仓库大小限制**：建议本地图片总量 < 1GB
- **无服务端逻辑**：所有处理在浏览器端完成，不支持复杂的查询/过滤

## 后续扩展可能

- 支持图片标签（tag）筛选
- 支持图片尺寸/比例筛选
- 提供 HTML 嵌入代码（`<img>` 标签随机图片）
- 支持 RSS 订阅新图片
