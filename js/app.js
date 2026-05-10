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

async function route() {
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const params = url.searchParams;

  try {
    if (pathname.endsWith('/api/random')) {
      return await handleApiRandom(params);
    }
    if (pathname.endsWith('/api/categories')) {
      return await handleApiCategories();
    }
    if (pathname.endsWith('/img/random')) {
      return await handleImgRandom(params);
    }
    if (pathname === '/' || pathname === getBaseUrl() || pathname === getBaseUrl() + '/') {
      return await handleRoot();
    }
    return errorResponse(404, 'Not found');
  } catch (err) {
    return errorResponse(500, err.message, 500);
  }
}

async function handleRoot() {
  return null;
}

(async function() {
  const response = await route();
  if (response) {
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const text = await response.text();
      document.open();
      document.write(text);
      document.close();
    } else if (contentType.includes('application/json')) {
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
