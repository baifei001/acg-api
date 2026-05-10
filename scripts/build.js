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

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  // Generate static API JSON files for curl access
  const API_DIR = path.join(__dirname, '..', 'api');
  if (!fs.existsSync(API_DIR)) {
    fs.mkdirSync(API_DIR, { recursive: true });
  }

  const allImages = Object.entries(allCategories).flatMap(([cat, imgs]) =>
    imgs.map(img => ({
      url: img.url.startsWith('http') ? img.url : `https://baifei001.github.io/acg-api/${img.url}`,
      category: cat,
      type: img.type
    }))
  );

  // api/random.json
  if (allImages.length > 0) {
    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
    fs.writeFileSync(path.join(API_DIR, 'random.json'), JSON.stringify({ code: 200, data: randomImg }, null, 2) + '\n');
  } else {
    fs.writeFileSync(path.join(API_DIR, 'random.json'), JSON.stringify({ code: 404, message: 'No images available' }, null, 2) + '\n');
  }

  // api/categories.json
  const catList = Object.entries(allCategories).map(([name, imgs]) => ({ name, count: imgs.length }));
  fs.writeFileSync(path.join(API_DIR, 'categories.json'), JSON.stringify({ code: 200, data: catList }, null, 2) + '\n');

  // api/{category}.json for each category
  for (const [category, images] of Object.entries(allCategories)) {
    const catImages = images.map(img => ({
      url: img.url.startsWith('http') ? img.url : `https://baifei001.github.io/acg-api/${img.url}`,
      category,
      type: img.type
    }));
    if (catImages.length > 0) {
      const randomImg = catImages[Math.floor(Math.random() * catImages.length)];
      fs.writeFileSync(path.join(API_DIR, `${category}.json`), JSON.stringify({ code: 200, data: randomImg }, null, 2) + '\n');
    }
  }

  // Generate static HTML redirect files in img/ directory
  const IMG_DIR = path.join(__dirname, '..', 'img');
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  function makeRedirectHtml(imageUrl) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${imageUrl}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="${imageUrl}">${imageUrl}</a>...</p>
</body>
</html>`;
  }

  // img/random.html
  if (allImages.length > 0) {
    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
    fs.writeFileSync(path.join(IMG_DIR, 'random.html'), makeRedirectHtml(randomImg.url));
  }

  // img/{category}.html for each category
  for (const [category, images] of Object.entries(allCategories)) {
    const catImages = images.map(img => ({
      url: img.url.startsWith('http') ? img.url : `https://baifei001.github.io/acg-api/${img.url}`,
      category,
      type: img.type
    }));
    if (catImages.length > 0) {
      const randomImg = catImages[Math.floor(Math.random() * catImages.length)];
      fs.writeFileSync(path.join(IMG_DIR, `${category}.html`), makeRedirectHtml(randomImg.url));
    }
  }

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
