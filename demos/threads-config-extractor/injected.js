/**
 * Injected Script - Runs in MAIN world (page context)
 *
 * Intercepts fetch/XHR requests and sends captured data to bridge.js via postMessage.
 * Captures FULL request bodies for replay.
 */

(function() {
  'use strict';

  const CHANNEL = 'REPLYDB_CONFIG_EXTRACTOR';

  // Send data to the bridge script
  function sendToBridge(type, data) {
    window.postMessage({ channel: CHANNEL, type, data }, '*');
  }

  // Decode shortcode to media ID
  function decodeShortcode(shortcode) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let mediaId = BigInt(0);
    for (const char of shortcode) {
      const index = alphabet.indexOf(char);
      if (index === -1) return null;
      mediaId = mediaId * BigInt(64) + BigInt(index);
    }
    return mediaId.toString();
  }

  // Extract shortcode from URL
  function extractShortcodeFromUrl() {
    const match = window.location.href.match(/threads\.(net|com)\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/);
    if (match) {
      const shortcode = match[2];
      const threadId = decodeShortcode(shortcode);
      sendToBridge('THREAD_INFO', { shortcode, threadId });
    }
  }

  // Parse body to string
  async function parseBody(body) {
    if (!body) return null;

    let bodyStr;

    if (typeof body === 'string') {
      bodyStr = body;
    } else if (body instanceof URLSearchParams) {
      bodyStr = body.toString();
    } else if (body instanceof FormData) {
      const params = new URLSearchParams();
      for (const [key, value] of body.entries()) {
        params.append(key, value.toString());
      }
      bodyStr = params.toString();
    } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      bodyStr = new TextDecoder().decode(body);
    } else if (body instanceof Blob) {
      bodyStr = await body.text();
    } else {
      try {
        bodyStr = String(body);
      } catch (e) {
        return null;
      }
    }

    return bodyStr;
  }

  // Determine request type from friendly name and variables
  function getRequestType(friendlyName, variables) {
    const name = (friendlyName || '').toLowerCase();

    // Check for write operations first
    if (name.includes('createreply') || name.includes('postreply') ||
        name.includes('create_reply') || name.includes('textpostreply')) {
      return 'write';
    }

    // Check variables
    if (variables) {
      try {
        const vars = JSON.parse(variables);

        // Write operation indicators
        if (vars.reply_to_media_id || (vars.text && vars.text.length > 0)) {
          return 'write';
        }

        // Read operation indicators - ANY request with postID is a read
        if (vars.postID || vars.mediaID || vars.threadID) {
          return 'read';
        }
      } catch (e) {}
    }

    // Check friendly name for read patterns
    if (name.includes('post') || name.includes('thread') || name.includes('replies') || name.includes('direct')) {
      // But exclude login/promo queries
      if (!name.includes('login') && !name.includes('promo') && !name.includes('interstitial')) {
        return 'read';
      }
    }

    return 'unknown';
  }

  // Process a captured request
  function processRequest(url, bodyStr, source) {
    try {
      const params = new URLSearchParams(bodyStr);
      const docId = params.get('doc_id');
      const variables = params.get('variables');
      const friendlyName = params.get('fb_api_req_friendly_name');

      if (docId) {
        const type = getRequestType(friendlyName, variables);

        console.log(`[ReplyDB] Captured ${source}:`, friendlyName || docId, `(type: ${type})`);

        // Log variables for debugging
        if (variables) {
          try {
            const vars = JSON.parse(variables);
            console.log('[ReplyDB] Variables:', Object.keys(vars).filter(k => !k.startsWith('__')).join(', '));
          } catch (e) {}
        }

        sendToBridge('GRAPHQL_REQUEST', {
          docId,
          friendlyName,
          variables,  // Pass raw variables string for bridge to analyze
          fullBody: bodyStr,
          type,
          url,
        });

        // If we haven't captured a read template yet and this has postID, log prominently
        if (type === 'read' || (variables && variables.includes('postID'))) {
          console.log('[ReplyDB] *** POTENTIAL READ TEMPLATE ***', friendlyName || docId);
        }
      }
    } catch (e) {
      console.error('[ReplyDB] Error processing request:', e);
    }
  }

  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = (input instanceof Request) ? input.url : String(input);

    if (url.includes('/api/graphql')) {
      try {
        let body = init?.body;
        if (input instanceof Request && !body) {
          body = input.body;
        }

        const bodyStr = await parseBody(body);
        if (bodyStr) {
          processRequest(url, bodyStr, 'fetch');
        }
      } catch (e) {
        console.error('[ReplyDB] Error intercepting fetch:', e);
      }
    }

    return originalFetch.apply(this, arguments);
  };

  // Intercept XHR requests
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._replydb_url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._replydb_url && this._replydb_url.includes('/api/graphql') && body) {
      const url = this._replydb_url;
      (async () => {
        try {
          const bodyStr = await parseBody(body);
          if (bodyStr) {
            processRequest(url, bodyStr, 'XHR');
          }
        } catch (e) {}
      })();
    }
    return originalXHRSend.apply(this, [body]);
  };

  // Extract thread ID from URL on page load
  extractShortcodeFromUrl();

  // Watch for URL changes (SPA navigation)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      extractShortcodeFromUrl();
    }
  });
  observer.observe(document.documentElement || document.body || document, { subtree: true, childList: true });

  // Try to catch any graphql requests that already happened using PerformanceObserver
  // This helps when the script is injected after initial page load
  try {
    const perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name && entry.name.includes('/api/graphql')) {
          console.log('[ReplyDB] Detected graphql request via PerformanceObserver:', entry.name);
          // We can't get the body from PerformanceObserver, but this tells us requests are happening
          // The user will need to trigger a new request (e.g., scroll, click replies)
        }
      }
    });
    perfObserver.observe({ entryTypes: ['resource'] });
  } catch (e) {
    // PerformanceObserver might not be available
  }

  // Also check existing performance entries for graphql requests
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource');
    const graphqlRequests = resources.filter(r => r.name.includes('/api/graphql'));
    if (graphqlRequests.length > 0) {
      console.log('[ReplyDB] Found', graphqlRequests.length, 'previous graphql requests. You may need to trigger a new request (scroll down, click "View replies", etc.)');
    }
  }

  console.log('[ReplyDB] Config Extractor initialized (MAIN world)');
  console.log('[ReplyDB] TIP: If no read template is captured, try scrolling down or clicking "View replies" to trigger a new graphql request.');
})();
