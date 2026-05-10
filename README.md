# ACG API

Random Image API hosted on GitHub Pages. Supports JSON responses and client-side redirects.

## Usage

### Get Random Image (JSON)
```bash
curl https://your-username.github.io/acg-api/api/random
```

### Get Random Image by Category
```bash
curl https://your-username.github.io/acg-api/api/random?category=anime
```

### Get Multiple Random Images
```bash
curl https://your-username.github.io/acg-api/api/random?category=anime&size=5
```

### Get All Categories
```bash
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
