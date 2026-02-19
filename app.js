const serverUrlInput = document.getElementById('serverUrl');
const levelInput = document.getElementById('levelInput');
const proxyInput = document.getElementById('proxyInput');
const loadButton = document.getElementById('loadButton');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const statusElement = document.getElementById('status');
const metadataElement = document.getElementById('metadata');
const jsonOutputElement = document.getElementById('jsonOutput');

let loadedChart = null;

const setStatus = (text, isError = false) => {
  statusElement.textContent = text;
  statusElement.style.color = isError ? '#fca5a5' : '#93c5fd';
};

const normalizeUrl = (value) => value.trim().replace(/\/$/, '');

const parseLevelName = (raw) => {
  const input = raw.trim();
  if (!input) return null;

  try {
    const parsed = new URL(input);
    const pieces = parsed.pathname.split('/').filter(Boolean);
    const levelIndex = pieces.lastIndexOf('levels');
    if (levelIndex >= 0 && pieces[levelIndex + 1]) {
      return decodeURIComponent(pieces[levelIndex + 1]);
    }
  } catch {
    // Not a URL, treat as plain level name.
  }

  return input;
};

const normalizeLevelResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Server returned empty response.');
  }

  if (payload.item) return payload.item;
  if (payload.level) return payload.level;
  if (payload.data && payload.name) return payload;
  if (payload.items && payload.items[0]) return payload.items[0];

  return payload;
};

const possibleLevelUrls = (baseUrl, levelName) => {
  const safeName = encodeURIComponent(levelName);
  return [
    `${baseUrl}/sonolus/levels/${safeName}`,
    `${baseUrl}/levels/${safeName}`,
    `${baseUrl}/sonolus/levels/list?keywords=${safeName}`,
    `${baseUrl}/sonolus/levels/info/${safeName}`
  ];
};

const withProxy = (url) => {
  const proxy = normalizeUrl(proxyInput.value);
  if (!proxy) return url;
  if (proxy.endsWith('=')) return `${proxy}${encodeURIComponent(url)}`;
  return `${proxy}/${url}`;
};

const fetchLevel = async (baseUrl, levelName) => {
  const urls = possibleLevelUrls(baseUrl, levelName);
  let lastError = null;

  for (const candidate of urls) {
    try {
      const response = await fetch(withProxy(candidate));
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} on ${candidate}`);
        continue;
      }
      const payload = await response.json();
      const level = normalizeLevelResponse(payload);
      if (level && (level.data || level.name || level.title)) {
        return { level, endpoint: candidate };
      }
      lastError = new Error(`Unknown schema from ${candidate}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Could not load level.');
};

const renderChart = (level, endpoint) => {
  loadedChart = level;
  metadataElement.textContent = JSON.stringify({
    endpoint,
    name: level.name ?? null,
    title: level.title ?? null,
    engine: level.engine?.name ?? level.engine ?? null,
    hasData: Boolean(level.data)
  }, null, 2);

  const chartPayload = level.data ?? level;
  jsonOutputElement.textContent = JSON.stringify(chartPayload, null, 2);
  copyButton.disabled = false;
  downloadButton.disabled = false;
};

loadButton.addEventListener('click', async () => {
  const baseUrl = normalizeUrl(serverUrlInput.value);
  const levelName = parseLevelName(levelInput.value);

  if (!baseUrl || !levelName) {
    setStatus('Please provide both server URL and level name.', true);
    return;
  }

  setStatus('Loading chart...');
  copyButton.disabled = true;
  downloadButton.disabled = true;

  try {
    const { level, endpoint } = await fetchLevel(baseUrl, levelName);
    renderChart(level, endpoint);
    setStatus('Chart loaded successfully.');
  } catch (error) {
    loadedChart = null;
    metadataElement.textContent = 'No chart loaded.';
    jsonOutputElement.textContent = 'No chart loaded.';
    setStatus(`Failed to load chart: ${error.message}`, true);
  }
});

copyButton.addEventListener('click', async () => {
  if (!loadedChart) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(loadedChart.data ?? loadedChart, null, 2));
    setStatus('Chart JSON copied to clipboard.');
  } catch {
    setStatus('Clipboard copy failed. Try the download button.', true);
  }
});

downloadButton.addEventListener('click', () => {
  if (!loadedChart) return;
  const blob = new Blob([JSON.stringify(loadedChart.data ?? loadedChart, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${loadedChart.name || 'sonolus-chart'}.json`;
  a.click();
  URL.revokeObjectURL(href);
  setStatus('Chart JSON downloaded.');
});
