# ACG API

基于 GitHub Pages 的随机图片接口，支持 JSON 响应和客户端跳转。

## 使用方式

### 获取随机图片（JSON）
```bash
curl https://your-username.github.io/acg-api/api/random
```

### 按分类获取随机图片
```bash
curl https://your-username.github.io/acg-api/api/random?category=anime
```

### 获取多张随机图片
```bash
curl https://your-username.github.io/acg-api/api/random?category=anime&size=5
```

### 获取所有分类
```bash
curl https://your-username.github.io/acg-api/api/categories
```

### 直接跳转到随机图片
浏览器访问：`https://your-username.github.io/acg-api/img/random`

## 添加图片

### 本地图片
1. 将图片放入 `images/分类名/` 目录
2. Push 到 main 分支
3. GitHub Actions 自动更新索引

### 外部源
1. 编辑 `data/external.json`，添加外部 API 配置
2. Push 到 main 分支

## 开发

```bash
# 构建图片索引
node scripts/build.js

# 启动本地服务器
npx serve .
```

## 许可证

MIT
