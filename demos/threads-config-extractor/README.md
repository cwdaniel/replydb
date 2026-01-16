# ReplyDB Threads Config Extractor

A Chrome extension that automatically extracts the configuration needed to use ReplyDB with Threads posts.

## What It Does

This extension captures:

- **Thread ID (Media ID)** - Extracted from the post URL
- **GraphQL Doc IDs** - Captured from network requests when you interact with Threads
- **Session Cookies** - Retrieved securely for authentication
- **CSRF Token** - Captured from request headers

It then generates a ready-to-use `.env.local` file for the ReplyDB Threads TODO demo.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `threads-config-extractor` folder

## Usage

1. **Navigate to your Threads post**
   - Go to a post you want to use with ReplyDB
   - Example: `https://www.threads.net/@username/post/ABC123`

2. **Refresh the page**
   - The extension needs to intercept network requests
   - Refresh after the extension is installed

3. **Interact with the post**
   - Scroll to load replies
   - Post a test reply (you can delete it later)
   - This helps capture more `doc_id` values

4. **Open the extension popup**
   - Click the extension icon in your toolbar
   - You should see captured configuration

5. **Generate your config**
   - Click "Generate .env.local Config"
   - Copy the output to your `.env.local` file

## Captured Data

### Thread Info
- **THREAD_ID**: The numeric media ID derived from the post's shortcode
- **Shortcode**: The alphanumeric code from the URL (e.g., `DTdl3mxEg_u`)

### Doc IDs
The extension captures GraphQL `doc_id` values used by Threads:
- **READ**: Used for fetching post data and replies
- **WRITE**: Used for posting new replies

### Authentication
- Session status indicator
- Cookie string for API requests
- CSRF token for mutations

## Privacy & Security

- All data stays local in your browser
- No data is sent to external servers
- Cookies are only accessible because you granted permission
- The extension only runs on threads.net domains

## Troubleshooting

### "No doc_ids captured"
- Refresh the Threads page
- Scroll down to load some replies
- Try posting a reply

### "Not logged in"
- Make sure you're logged into Threads
- Try logging out and back in
- Refresh the page

### Extension not working
- Check that Developer mode is enabled
- Try removing and re-adding the extension
- Check the console (F12) for errors

## Development

### File Structure
```
threads-config-extractor/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for cookies
├── content.js          # Injected script for request interception
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── icons/              # Extension icons
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── generate-icons.cjs  # Script to regenerate icons
```

### Regenerating Icons
```bash
node generate-icons.cjs
```

## License

MIT - Part of the ReplyDB project.
