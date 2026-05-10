# ACG API

基于 GitHub Pages 的随机图片接口，支持 JSON 响应和客户端跳转。

## 使用方式

### 获取随机图片（JSON）
```bash
curl https://baifei001.github.io/acg-api/api/random.json
```

### 按分类获取随机图片
```bash
curl https://baifei001.github.io/acg-api/api/anime.json
```

### 批量获取随机图片
```bash
# 浏览器访问（支持参数）
https://baifei001.github.io/acg-api/?api=random&size=5
https://baifei001.github.io/acg-api/?api=random&category=anime&size=3

# curl 只能访问静态文件（不支持参数）
curl https://baifei001.github.io/acg-api/api/random.json
```

### 获取所有分类
```bash
curl https://baifei001.github.io/acg-api/api/categories.json
```

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
