/**
 * Background Service Worker
 *
 * Handles cookie extraction and message passing.
 */

// Get all Threads cookies
async function getThreadsCookies() {
  try {
    // Get cookies from both domains
    const cookiesNet = await chrome.cookies.getAll({ domain: '.threads.net' });
    const cookiesCom = await chrome.cookies.getAll({ domain: '.threads.com' });
    const allCookies = [...cookiesNet, ...cookiesCom];

    // Deduplicate by name (prefer .net cookies)
    const cookieMap = new Map();
    for (const c of allCookies) {
      if (!cookieMap.has(c.name)) {
        cookieMap.set(c.name, c.value);
      }
    }

    const cookieString = Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    return cookieString;
  } catch (e) {
    console.error('Error getting cookies:', e);
    return '';
  }
}

// Get specific important cookies
async function getImportantCookies() {
  const important = ['sessionid', 'csrftoken', 'ds_user_id', 'ig_did'];
  const urls = ['https://www.threads.net', 'https://www.threads.com'];
  const result = {};

  for (const name of important) {
    for (const url of urls) {
      try {
        const cookie = await chrome.cookies.get({ url, name });
        if (cookie) {
          result[name] = cookie.value;
          break; // Found it, no need to check other URL
        }
      } catch (e) {}
    }
  }

  return result;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_COOKIES') {
    (async () => {
      const cookieString = await getThreadsCookies();
      const importantCookies = await getImportantCookies();
      sendResponse({
        cookieString,
        importantCookies
      });
    })();
    return true; // Keep channel open for async response
  }
});

// Log when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('ReplyDB Config Extractor installed');
});
