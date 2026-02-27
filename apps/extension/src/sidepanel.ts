import { API_BASE_URL, WEB_BASE_URL, MAX_EXTRACT_CHARS } from './config';

// Simple markdown parser
function renderMarkdown(text: string): string {
  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (```)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code (`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Headers (### -> h4, ## -> h3, # -> h2)
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Unordered lists (- or *)
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists (1. 2. etc)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

// State
let currentRecordId: string | null = null;
let currentTab: chrome.tabs.Tab | null = null;
let pageContent: string | null = null;

// DOM elements
const pageDomain = document.getElementById('pageDomain') as HTMLDivElement;
const chatArea = document.getElementById('chatArea') as HTMLDivElement;
const welcomeState = document.getElementById('welcomeState') as HTMLDivElement;
const chatInput = document.getElementById('chatInput') as HTMLInputElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const summarizeBtn = document.getElementById('summarizeBtn') as HTMLButtonElement;
const brainstormBtn = document.getElementById('brainstormBtn') as HTMLButtonElement;
const saveCardBtn = document.getElementById('saveCardBtn') as HTMLButtonElement;
const dashboardBtn = document.getElementById('dashboardBtn') as HTMLButtonElement;

// Initialize
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      pageDomain.textContent = url.hostname;
    } catch {
      pageDomain.textContent = 'Unknown';
    }
  }
}

// Extract page content
async function extractPageContent(): Promise<string> {
  if (!currentTab?.id) throw new Error('No active tab');

  const results = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: () => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript, iframe, svg').forEach((el) => el.remove());
      let text = clone.innerText || clone.textContent || '';
      return text.replace(/\s+/g, ' ').trim();
    },
  });

  if (results?.[0]?.result) {
    pageContent = results[0].result.slice(0, MAX_EXTRACT_CHARS);
    return pageContent;
  }
  throw new Error('Failed to extract text');
}

// Hide welcome state
function hideWelcome() {
  if (welcomeState) {
    welcomeState.style.display = 'none';
  }
}

// Add user message
function addUserMessage(text: string) {
  hideWelcome();
  const div = document.createElement('div');
  div.className = 'message message-user';
  div.textContent = text;
  chatArea.appendChild(div);
  scrollToBottom();
}

// Add AI message
function addAIMessage(content: string, options: { keyPoints?: string[]; tags?: string[] } = {}) {
  hideWelcome();
  const div = document.createElement('div');
  div.className = 'message message-ai';

  let html =
    '<div class="message-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>AI 助手</div>';
  html += `<div class="message-content">${renderMarkdown(content)}</div>`;

  if (options.keyPoints?.length) {
    html += '<ul class="key-points">' + options.keyPoints.map((p) => `<li>${p}</li>`).join('') + '</ul>';
  }

  if (options.tags?.length) {
    html += '<div class="tags">' + options.tags.map((t) => `<span class="tag">${t}</span>`).join('') + '</div>';
  }

  div.innerHTML = html;
  chatArea.appendChild(div);
  scrollToBottom();
  return div;
}

// Add typing indicator
function addTypingIndicator() {
  hideWelcome();
  const div = document.createElement('div');
  div.className = 'message message-ai typing-container';
  div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  chatArea.appendChild(div);
  scrollToBottom();
  return div;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typing = chatArea.querySelector('.typing-container');
  if (typing) typing.remove();
}

// Scroll to bottom
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Show toast
function showToast(message: string, type: '' | 'success' | 'error' = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// Ingest content to server
async function ingestContent(): Promise<string> {
  if (!pageContent) {
    await extractPageContent();
  }

  const res = await fetch(`${API_BASE_URL}/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: currentTab?.url || '',
      title: currentTab?.title || 'Untitled',
      domain: new URL(currentTab?.url || 'http://unknown').hostname,
      text: pageContent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save');
  }

  const data = await res.json();
  currentRecordId = data.recordId;
  return currentRecordId!;
}

// Set buttons disabled state
function setButtonsDisabled(disabled: boolean) {
  summarizeBtn.disabled = disabled;
  brainstormBtn.disabled = disabled;
  sendBtn.disabled = disabled;
  chatInput.disabled = disabled;
}

// Summarize action
async function handleSummarize() {
  try {
    setButtonsDisabled(true);
    addUserMessage('帮我总结这个页面的内容');
    addTypingIndicator();

    await extractPageContent();
    await ingestContent();

    const res = await fetch(`${API_BASE_URL}/v1/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: currentRecordId }),
    });

    if (!res.ok) throw new Error('Failed to summarize');

    const data = await res.json();
    removeTypingIndicator();

    addAIMessage(data.summary, {
      keyPoints: data.keyPoints,
      tags: data.tags,
    });

    saveCardBtn.disabled = false;
  } catch (err) {
    removeTypingIndicator();
    addAIMessage(`抱歉，出错了：${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setButtonsDisabled(false);
  }
}

// Brainstorm action
async function handleBrainstorm() {
  try {
    setButtonsDisabled(true);
    addUserMessage('帮我进行头脑风暴，多角度思考');
    addTypingIndicator();

    await extractPageContent();
    await ingestContent();

    const res = await fetch(`${API_BASE_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId: currentRecordId,
        message: `基于这个页面的内容，请帮我进行深度头脑风暴。请从以下几个角度来思考：

1. **核心问题**：这篇内容试图解决什么核心问题？
2. **另一种视角**：如果从相反或不同的角度看，会有什么发现？
3. **类比思考**：这个主题可以类比到哪些其他领域？
4. **延伸问题**：基于这些内容，还有哪些值得深入探索的问题？
5. **实践应用**：如何将这些知识应用到实际中？

请用清晰的结构回答。`,
      }),
    });

    if (!res.ok) throw new Error('Failed to brainstorm');

    const data = await res.json();
    removeTypingIndicator();

    addAIMessage(data.reply);
    saveCardBtn.disabled = false;
  } catch (err) {
    removeTypingIndicator();
    addAIMessage(`抱歉，出错了：${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setButtonsDisabled(false);
  }
}

// Save card action
async function handleSaveCard() {
  if (!currentRecordId) {
    showToast('请先生成总结', 'error');
    return;
  }

  try {
    saveCardBtn.disabled = true;

    const res = await fetch(`${API_BASE_URL}/v1/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: currentRecordId }),
    });

    if (!res.ok) throw new Error('Failed to save card');

    showToast('卡片已保存！', 'success');
    addAIMessage('知识卡片已成功保存到你的卡片库中！');
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Error', 'error');
  } finally {
    saveCardBtn.disabled = false;
  }
}

// Custom chat
async function handleChat(message: string) {
  if (!message.trim()) return;

  try {
    setButtonsDisabled(true);
    addUserMessage(message);
    chatInput.value = '';
    addTypingIndicator();

    if (!pageContent) {
      await extractPageContent();
    }

    if (!currentRecordId) {
      await ingestContent();
    }

    const res = await fetch(`${API_BASE_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId: currentRecordId,
        message: message,
      }),
    });

    if (!res.ok) throw new Error('Failed to get response');

    const data = await res.json();
    removeTypingIndicator();
    addAIMessage(data.reply);
  } catch (err) {
    removeTypingIndicator();
    addAIMessage(`抱歉，出错了：${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setButtonsDisabled(false);
  }
}

// Event listeners
summarizeBtn.addEventListener('click', handleSummarize);
brainstormBtn.addEventListener('click', handleBrainstorm);
saveCardBtn.addEventListener('click', handleSaveCard);

dashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_BASE_URL}/dashboard` });
});

sendBtn.addEventListener('click', () => {
  handleChat(chatInput.value);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChat(chatInput.value);
  }
});

// Initialize
init();
