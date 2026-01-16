/**
 * Popup Script
 *
 * Displays captured configuration and generates config for ReplyDB.
 */

let currentConfig = null;
let cookies = null;

// DOM Elements
const statusEl = document.getElementById('status');
const threadIdEl = document.getElementById('thread-id');
const shortcodeEl = document.getElementById('shortcode');
const docIdsEl = document.getElementById('doc-ids');
const sessionStatusEl = document.getElementById('session-status');
const generateBtn = document.getElementById('generate-btn');
const refreshBtn = document.getElementById('refresh-btn');
const clearBtn = document.getElementById('clear-btn');
const outputEl = document.getElementById('output');
const outputContentEl = document.getElementById('output-content');
const copyBtn = document.getElementById('copy-btn');
const notOnThreadsEl = document.getElementById('not-on-threads');
const configDisplayEl = document.getElementById('config-display');

// Check if we're on a Threads page
async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || (!tab.url.includes('threads.net') && !tab.url.includes('threads.com'))) {
    notOnThreadsEl.style.display = 'block';
    configDisplayEl.style.display = 'none';
    generateBtn.style.display = 'none';
    refreshBtn.style.display = 'none';
    statusEl.className = 'status error';
    statusEl.textContent = 'Please navigate to a Threads post first.';
    return false;
  }

  return true;
}

// Load saved configuration
async function loadConfig() {
  const isOnThreads = await checkCurrentTab();
  if (!isOnThreads) return;

  const result = await chrome.storage.local.get('threadsConfig');
  currentConfig = result.threadsConfig;

  cookies = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_COOKIES' }, resolve);
  });

  updateUI();
}

// Identify doc_id type
function identifyDocIdType(info) {
  const type = info.type || '';
  const name = (info.friendlyName || '').toLowerCase();

  if (type === 'write' || name.includes('reply') && (name.includes('create') || name.includes('post'))) {
    return { type: 'write', label: 'WRITE' };
  }
  if (type === 'read' || name.includes('post') || name.includes('thread') || name.includes('replies')) {
    return { type: 'read', label: 'READ' };
  }
  return { type: 'unknown', label: '?' };
}

// Update the UI with current data
function updateUI() {
  // Thread info
  if (currentConfig?.threadId) {
    threadIdEl.textContent = currentConfig.threadId;
    threadIdEl.classList.remove('missing');
  } else {
    threadIdEl.textContent = 'Navigate to a post URL';
    threadIdEl.classList.add('missing');
  }

  if (currentConfig?.shortcode) {
    shortcodeEl.textContent = currentConfig.shortcode;
    shortcodeEl.classList.remove('missing');
  } else {
    shortcodeEl.textContent = '--';
    shortcodeEl.classList.add('missing');
  }

  // Doc IDs and request templates
  const docIds = currentConfig?.docIds || {};
  const templates = currentConfig?.requestTemplates || {};
  const docIdEntries = Object.entries(docIds);

  let docIdsHtml = '';

  // Show request templates status
  if (templates.read) {
    docIdsHtml += `
      <div class="doc-id-item">
        <span class="doc-id-value">${templates.read.docId}</span>
        <span class="doc-id-type read">READ (full template)</span>
      </div>
    `;
  }

  if (templates.write) {
    docIdsHtml += `
      <div class="doc-id-item">
        <span class="doc-id-value">${templates.write.docId}</span>
        <span class="doc-id-type write">WRITE (full template)</span>
      </div>
    `;
  }

  // Show other doc_ids
  for (const [id, info] of docIdEntries) {
    if (templates.read?.docId === id || templates.write?.docId === id) continue;
    const typeInfo = identifyDocIdType(info);
    docIdsHtml += `
      <div class="doc-id-item">
        <span class="doc-id-value">${id}</span>
        <span class="doc-id-type ${typeInfo.type}">${typeInfo.label}</span>
      </div>
    `;
  }

  if (docIdsHtml) {
    docIdsEl.innerHTML = docIdsHtml;
  } else {
    docIdsEl.innerHTML = '<div class="field-value missing">No requests captured yet. Refresh the Threads page.</div>';
  }

  // Session status
  if (cookies?.importantCookies?.sessionid) {
    sessionStatusEl.textContent = '✓ Logged in';
    sessionStatusEl.style.color = '#22c55e';
  } else {
    sessionStatusEl.textContent = '✗ Not logged in or cookies not accessible';
    sessionStatusEl.style.color = '#ef4444';
  }

  updateStatus();

  // Enable generate button if we have a read template
  const canGenerate = currentConfig?.threadId &&
                      templates.read &&
                      cookies?.cookieString;
  generateBtn.disabled = !canGenerate;
}

// Update status message
function updateStatus() {
  const hasThreadId = !!currentConfig?.threadId;
  const hasReadTemplate = !!currentConfig?.requestTemplates?.read;
  const hasCookies = !!cookies?.cookieString;

  if (hasThreadId && hasReadTemplate && hasCookies) {
    statusEl.className = 'status success';
    statusEl.textContent = '✓ Full request template captured! Click "Generate" to create your config.';
  } else if (hasThreadId || hasReadTemplate) {
    statusEl.className = 'status warning';
    const missing = [];
    if (!hasThreadId) missing.push('thread ID');
    if (!hasReadTemplate) missing.push('request template');
    if (!hasCookies) missing.push('cookies');
    let hint = '';
    if (!hasReadTemplate) {
      hint = ' Try: scroll down, click "View replies", or navigate to another post.';
    }
    statusEl.textContent = `Partially captured. Missing: ${missing.join(', ')}.${hint}`;
  } else {
    statusEl.className = 'status warning';
    statusEl.textContent = 'Navigate to a Threads post and interact with it to capture data.';
  }
}

// Generate config content
function generateEnvContent() {
  if (!currentConfig || !cookies) return '';

  const templates = currentConfig.requestTemplates || {};

  // Build cookie header
  const cookieHeader = cookies.cookieString;

  // Generate content
  let content = `# Threads TODO Demo Configuration
# Generated by ReplyDB Config Extractor
# ${new Date().toISOString()}

# Thread ID (from URL shortcode)
THREAD_ID=${currentConfig.threadId || 'YOUR_THREAD_ID'}

# Cookie header for authentication
THREADS_COOKIE=${cookieHeader}
`;

  // Add read template
  if (templates.read) {
    content += `
# Full read request template (captured from browser)
# This contains all the dynamic parameters needed for the Threads API
READ_REQUEST_BODY=${templates.read.fullBody}
`;
  }

  // Add write template if available
  if (templates.write) {
    content += `
# Full write request template (for posting replies)
WRITE_REQUEST_BODY=${templates.write.fullBody}
`;
  }

  content += `
# Note: These request bodies contain session-specific tokens that may expire.
# If you get errors, re-capture the config by refreshing the Threads page.
`;

  return content;
}

// Generate button click handler
generateBtn.addEventListener('click', () => {
  const content = generateEnvContent();
  outputContentEl.textContent = content;
  outputEl.classList.add('visible');
});

// Copy button click handler
copyBtn.addEventListener('click', async () => {
  const content = outputContentEl.textContent;
  await navigator.clipboard.writeText(content);
  copyBtn.textContent = 'Copied!';
  copyBtn.classList.add('copied');
  setTimeout(() => {
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');
  }, 2000);
});

// Refresh button click handler
refreshBtn.addEventListener('click', async () => {
  // Clear stored templates to force re-capture
  if (currentConfig) {
    currentConfig.requestTemplates = {};
    await chrome.storage.local.set({ threadsConfig: currentConfig });
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONFIG' });
      if (response) {
        currentConfig = response;
        updateUI();
      }
    } catch (e) {
      statusEl.className = 'status warning';
      statusEl.textContent = 'Please refresh the Threads page first.';
    }
  }
  loadConfig();
});

// Clear button click handler
clearBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove('threadsConfig');
  currentConfig = null;
  outputEl.classList.remove('visible');
  loadConfig();
  statusEl.className = 'status warning';
  statusEl.textContent = 'Data cleared. Refresh the Threads page to capture new data.';
});

// Listen for updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONFIG_UPDATED') {
    currentConfig = message.data;
    updateUI();
  }
});

// Initialize
loadConfig();
