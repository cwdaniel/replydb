/**
 * Bridge Script - Runs in ISOLATED world (content script context)
 *
 * Injects the interceptor into the page's MAIN world and receives data via postMessage.
 * Has access to Chrome extension APIs.
 */

(function() {
  'use strict';

  const CHANNEL = 'REPLYDB_CONFIG_EXTRACTOR';

  // Inject the interceptor script into the page's MAIN world
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Current captured data
  let capturedData = {
    docIds: {},
    requestTemplates: {},
    threadId: null,
    shortcode: null,
    url: window.location.href,
    timestamp: Date.now()
  };

  // Load existing data from storage
  chrome.storage.local.get('threadsConfig', (result) => {
    if (result.threadsConfig) {
      capturedData = {
        ...capturedData,
        ...result.threadsConfig,
        docIds: { ...result.threadsConfig.docIds },
        requestTemplates: { ...(result.threadsConfig.requestTemplates || {}) }
      };
    }
  });

  // Save data to storage and notify popup
  function saveAndNotify() {
    capturedData.url = window.location.href;
    capturedData.timestamp = Date.now();

    chrome.storage.local.set({ threadsConfig: capturedData }, () => {
      chrome.runtime.sendMessage({ type: 'CONFIG_UPDATED', data: capturedData }).catch(() => {});
    });
  }

  // Listen for messages from injected.js
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const message = event.data;
    if (!message || message.channel !== CHANNEL) return;

    console.log('[ReplyDB Bridge] Received:', message.type);

    switch (message.type) {
      case 'THREAD_INFO':
        if (message.data.threadId) {
          capturedData.threadId = message.data.threadId;
          capturedData.shortcode = message.data.shortcode;
          console.log('[ReplyDB Bridge] Thread ID:', message.data.threadId);
          saveAndNotify();
        }
        break;

      case 'GRAPHQL_REQUEST':
        if (message.data.docId && message.data.fullBody) {
          const { docId, friendlyName, type, fullBody, url, variables } = message.data;

          capturedData.docIds[docId] = {
            type: type,
            friendlyName: friendlyName || null,
            timestamp: Date.now()
          };

          // Check if this looks like a post/thread read request by examining variables
          let isLikelyReadRequest = type === 'read';
          if (!isLikelyReadRequest && variables) {
            try {
              const vars = JSON.parse(variables);
              // If it has postID, mediaID, or threadID, it's likely a read request
              if (vars.postID || vars.mediaID || vars.threadID) {
                isLikelyReadRequest = true;
                console.log('[ReplyDB Bridge] Detected postID/mediaID in variables, treating as read');
              }
            } catch (e) {}
          }

          // Check if this looks like a write request
          let isLikelyWriteRequest = type === 'write';
          if (!isLikelyWriteRequest && variables) {
            try {
              const vars = JSON.parse(variables);
              if (vars.reply_to_media_id || (vars.text && vars.text.length > 0)) {
                isLikelyWriteRequest = true;
              }
            } catch (e) {}
          }

          // Store full request template - prefer better templates over older ones
          if (isLikelyReadRequest && !capturedData.requestTemplates.read) {
            capturedData.requestTemplates.read = {
              docId,
              friendlyName,
              fullBody,
              url,
              capturedAt: Date.now()
            };
            console.log('[ReplyDB Bridge] Captured READ template:', friendlyName || docId);
          }

          if (isLikelyWriteRequest && !capturedData.requestTemplates.write) {
            capturedData.requestTemplates.write = {
              docId,
              friendlyName,
              fullBody,
              url,
              capturedAt: Date.now()
            };
            console.log('[ReplyDB Bridge] Captured WRITE template:', friendlyName || docId);
          }

          saveAndNotify();
        }
        break;

      case 'DOC_ID':
        if (message.data.docId) {
          capturedData.docIds[message.data.docId] = {
            type: message.data.type || 'unknown',
            friendlyName: message.data.fbFriendlyName || null,
            timestamp: Date.now()
          };
          saveAndNotify();
        }
        break;

      case 'CSRF_TOKEN':
        if (message.data.csrfToken) {
          if (!capturedData.headers) capturedData.headers = {};
          capturedData.headers['X-CSRFToken'] = message.data.csrfToken;
          saveAndNotify();
        }
        break;
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CONFIG') {
      sendResponse(capturedData);
    }
    return true;
  });

  // Inject the script into the page
  injectScript();

  console.log('[ReplyDB Bridge] Initialized');
})();
