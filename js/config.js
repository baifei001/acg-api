const API_CONFIG = {
  basePath: '/acg-api',
  dataPath: '/data/images.json',
  maxBatchSize: 20
};

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
