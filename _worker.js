export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // API Routes
    if (pathname.startsWith('/api/')) {
      const category = pathname.split('/')[2];

      // /api/random
      if (category === 'random' || !category) {
        return this.handleRandom(searchParams);
      }

      // /api/categories
      if (category === 'categories') {
        return this.handleCategories();
      }

      // /api/{category}
      return this.handleCategory(category, searchParams);
    }

    // Static files - pass to Pages asset handler
    return env.ASSETS.fetch(request);
  },

  handleRandom(searchParams) {
    const IMAGES_DATA = {"version":1,"generated":"2026-05-10T09:06:32.547Z","categories":{"anime":[{"url":"images/anime/20260510_132059_01.webp","original":"images/anime/20260510_132059_01.png","type":"local"},{"url":"images/anime/20260510_143002_01.webp","original":"images/anime/20260510_143002_01.png","type":"local"}]}};
    const catFilter = searchParams.get('category');
    const size = Math.min(parseInt(searchParams.get('size') || '1', 10), 20);
    const categories = IMAGES_DATA.categories || {};

    let pool = [];
    if (catFilter) {
      if (!categories[catFilter]) {
        return Response.json({ code: 404, message: `Category "${catFilter}" not found` }, { status: 404 });
      }
      pool = categories[catFilter];
    } else {
      pool = Object.values(categories).flat();
    }

    if (pool.length === 0) {
      return Response.json({ code: 404, message: 'No images available' }, { status: 404 });
    }

    const selected = this.getRandomItems(pool, size);
    const result = selected.map(img => ({
      url: img.url.startsWith('http') ? img.url : `https://baifei001.github.io/acg-api/${img.url}`,
      category: catFilter || 'random',
      type: img.type
    }));

    return Response.json({ code: 200, data: size === 1 ? result[0] : result });
  },

  handleCategories() {
    const IMAGES_DATA = {"version":1,"generated":"2026-05-10T09:06:32.547Z","categories":{"anime":[{"url":"images/anime/20260510_132059_01.webp","original":"images/anime/20260510_132059_01.png","type":"local"},{"url":"images/anime/20260510_143002_01.webp","original":"images/anime/20260510_143002_01.png","type":"local"}]}};
    const categories = Object.entries(IMAGES_DATA.categories || {}).map(([name, imgs]) => ({
      name,
      count: imgs.length
    }));

    return Response.json({ code: 200, data: categories });
  },

  handleCategory(category, searchParams) {
    const IMAGES_DATA = {"version":1,"generated":"2026-05-10T09:06:32.547Z","categories":{"anime":[{"url":"images/anime/20260510_132059_01.webp","original":"images/anime/20260510_132059_01.png","type":"local"},{"url":"images/anime/20260510_143002_01.webp","original":"images/anime/20260510_143002_01.png","type":"local"}]}};
    const categories = IMAGES_DATA.categories || {};
    const size = Math.min(parseInt(searchParams.get('size') || '1', 10), 20);

    if (!categories[category]) {
      return Response.json({ code: 404, message: `Category "${category}" not found` }, { status: 404 });
    }

    const pool = categories[category];
    if (pool.length === 0) {
      return Response.json({ code: 404, message: 'No images available' }, { status: 404 });
    }

    const selected = this.getRandomItems(pool, size);
    const result = selected.map(img => ({
      url: img.url.startsWith('http') ? img.url : `https://baifei001.github.io/acg-api/${img.url}`,
      category,
      type: img.type
    }));

    return Response.json({ code: 200, data: size === 1 ? result[0] : result });
  },

  getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }
};
