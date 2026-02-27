import { API_BASE_URL, WEB_BASE_URL, MAX_EXTRACT_CHARS } from './config';

// State
let currentRecordId: string | null = null;
let currentTab: chrome.tabs.Tab | null = null;

// DOM elements
const pageTitle = document.getElementById('pageTitle') as HTMLDivElement;
const pageDomain = document.getElementById('pageDomain') as HTMLDivElement;
const grabBtn = document.getElementById('grabBtn') as HTMLButtonElement;
const cardBtn = document.getElementById('cardBtn') as HTMLButtonElement;
const dashboardBtn = document.getElementById('dashboardBtn') as HTMLButtonElement;
const statusArea = document.getElementById('statusArea') as HTMLDivElement;
const resultArea = document.getElementById('resultArea') as HTMLDivElement;

// Initialize
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab?.title) {
    pageTitle.textContent = tab.title;
  }
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      pageDomain.textContent = url.hostname;
    } catch {
      pageDomain.textContent = 'Unknown';
    }
  }
}

// Show status
function showStatus(message: string, type: 'loading' | 'success' | 'error' = 'loading') {
  if (type === 'loading') {
    statusArea.innerHTML = `
      <div class="status">
        <div class="spinner"></div>
        <p style="margin-top: 12px">${message}</p>
      </div>
    `;
  } else {
    statusArea.innerHTML = `<div class="status ${type}">${message}</div>`;
  }
}

// Clear status
function clearStatus() {
  statusArea.innerHTML = '';
}

// Show result
function showResult(summary: string, keyPoints?: string[], tags?: string[]) {
  let html = `
    <div class="result">
      <div class="result-title">Summary</div>
      <div class="result-content">${summary}</div>
  `;

  if (keyPoints && keyPoints.length > 0) {
    html += `
      <ul class="key-points">
        ${keyPoints.map((p) => `<li>${p}</li>`).join('')}
      </ul>
    `;
  }

  if (tags && tags.length > 0) {
    html += `
      <div class="tags">
        ${tags.map((t) => `<span class="tag">${t}</span>`).join('')}
      </div>
    `;
  }

  html += '</div>';
  resultArea.innerHTML = html;
}

// Extract text from page using scripting API (works even if content script not loaded)
async function extractText(): Promise<string> {
  if (!currentTab?.id) throw new Error('No active tab');

  // Use chrome.scripting.executeScript to dynamically extract text
  // This works even on pages opened before extension installation
  const results = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: () => {
      // Remove script and style content
      const clone = document.body.cloneNode(true) as HTMLElement;
      const scripts = clone.querySelectorAll('script, style, noscript, iframe, svg');
      scripts.forEach((el) => el.remove());

      // Get text content
      let text = clone.innerText || clone.textContent || '';

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();

      return text;
    },
  });

  if (results && results[0] && results[0].result) {
    return results[0].result;
  }

  throw new Error('Failed to extract text from page');
}

// API calls
async function ingest(url: string, title: string, domain: string, text: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, domain, text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to ingest');
  }

  const data = await res.json();
  return data.recordId;
}

async function summarize(recordId: string): Promise<{ summary: string; keyPoints?: string[]; tags?: string[] }> {
  const res = await fetch(`${API_BASE_URL}/v1/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to summarize');
  }

  return res.json();
}

async function createCard(recordId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/v1/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create card');
  }
}

// Event handlers
grabBtn.addEventListener('click', async () => {
  try {
    grabBtn.disabled = true;
    resultArea.innerHTML = '';

    showStatus('Extracting page content...');

    const text = await extractText();
    if (!text || text.length < 50) {
      throw new Error('Not enough content to extract');
    }

    const truncatedText = text.slice(0, MAX_EXTRACT_CHARS);

    showStatus('Uploading to server...');

    const url = currentTab?.url || '';
    const title = currentTab?.title || 'Untitled';
    let domain = 'unknown';
    try {
      domain = new URL(url).hostname;
    } catch {}

    const recordId = await ingest(url, title, domain, truncatedText);
    currentRecordId = recordId;

    showStatus('Generating summary with AI...');

    const result = await summarize(recordId);

    clearStatus();
    showResult(result.summary, result.keyPoints, result.tags);
    showStatus('Success! Summary generated.', 'success');

    cardBtn.disabled = false;
  } catch (err) {
    clearStatus();
    showStatus(err instanceof Error ? err.message : 'An error occurred', 'error');
  } finally {
    grabBtn.disabled = false;
  }
});

cardBtn.addEventListener('click', async () => {
  if (!currentRecordId) return;

  try {
    cardBtn.disabled = true;
    showStatus('Creating knowledge card...');

    await createCard(currentRecordId);

    showStatus('Card saved successfully!', 'success');
  } catch (err) {
    showStatus(err instanceof Error ? err.message : 'Failed to save card', 'error');
  } finally {
    cardBtn.disabled = false;
  }
});

dashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_BASE_URL}/dashboard` });
});

// Initialize on load
init();
