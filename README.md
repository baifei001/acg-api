# ACG API

随机图片接口，支持 JSON 响应和客户端跳转。

- **GitHub Pages**: `https://baifei001.github.io/acg-api` — 静态文件托管
- **Cloudflare Pages**: `https://acg-api.pages.dev` — 动态 API（真正随机）

## 使用方式

### 获取随机图片（真正随机）
```bash
# Cloudflare Pages - 每次调用返回不同结果
curl https://acg-api.pages.dev/api/random
curl https://acg-api.pages.dev/api/random?size=5
```

### 获取随机图片（静态文件）
```bash
# GitHub Pages - 结果固定
curl https://baifei001.github.io/acg-api/api/random.json
```

### 按分类获取随机图片
```bash
curl https://acg-api.pages.dev/api/anime
curl https://acg-api.pages.dev/api/anime?size=3
```

### 获取所有分类
```bash
curl https://acg-api.pages.dev/api/categories
```

### API 端点说明
| 端点 | 说明 |
|------|------|
| `/api/random` | 随机图片（Cloudflare Pages 动态随机） |
| `/api/random.json` | 随机图片（GitHub Pages 静态文件） |
| `/api/{category}` | 指定分类随机图片 |
| `/api/categories` | 所有分类列表 |
| `/api/random?size=N` | 批量获取 N 张（最多 20） |
| `/img/random.html` | 浏览器跳转到随机图片 |
| `/img/{category}.html` | 浏览器跳转到指定分类随机图片 |

### 批量获取（仅浏览器支持）
```
https://baifei001.github.io/acg-api/?api=random&size=5
https://baifei001.github.io/acg-api/?api=random&category=anime&size=3
```
> 注意：批量获取需要浏览器执行 JavaScript，curl 不支持

### 直接跳转到随机图片
浏览器访问：`https://baifei001.github.io/acg-api/img/random.html`

### 按分类跳转
浏览器访问：`https://baifei001.github.io/acg-api/img/anime.html`

## 添加图片

### 本地图片
1. 将图片放入 `images/分类名/` 目录
2. Push 到 master 分支
3. GitHub Actions 自动更新索引

### 外部源
1. 编辑 `data/external.json`，添加外部 API 配置
2. Push 到 master 分支

## 开发

```bash
# 构建图片索引
node scripts/build.js

# 启动本地服务器
npx serve .
```

## 许可证

MIT
