// Content script - extracts text from the page

export function extractPageText(): string {
  // Remove script, style, and other non-content elements
  const elementsToRemove = document.querySelectorAll(
    'script, style, noscript, iframe, svg, canvas, video, audio, nav, footer, header, aside, .ad, .advertisement, .sidebar, [role="navigation"], [role="banner"], [role="complementary"]'
  );

  // Clone body to avoid modifying actual page
  const bodyClone = document.body.cloneNode(true) as HTMLElement;

  // Remove unwanted elements from clone
  elementsToRemove.forEach((el) => {
    const selector = el.tagName.toLowerCase() +
      (el.className ? '.' + Array.from(el.classList).join('.') : '') +
      (el.id ? '#' + el.id : '');
    bodyClone.querySelectorAll(selector).forEach((cloneEl) => cloneEl.remove());
  });

  // Get text content
  let text = bodyClone.innerText || bodyClone.textContent || '';

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return text;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractText') {
    const text = extractPageText();
    sendResponse({ text });
  }
  return true;
});
