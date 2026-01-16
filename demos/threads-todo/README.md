# Threads TODO - Next.js Demo

A TODO list application powered by ReplyDB and Threads, built with Next.js App Router.

Your TODO items are stored as replies to a Threads post. The app uses Server Actions for mutations and provides a clean, responsive UI with shadcn/ui components.

## Features

- Add, edit, complete, and delete TODOs
- Real-time updates via Server Actions
- Responsive design with Tailwind CSS
- Clean UI with shadcn/ui components
- Like counts displayed from Threads

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **ReplyDB** - Database layer using Threads

## How It Works

Each operation posts a JSON reply to your Threads post:

```json
// Add a TODO
{"v":1,"op":"ins","content":{"content":"Buy groceries","done":false}}

// Mark as done
{"v":1,"op":"upd","id":"r_1234567890","content":{"done":true}}

// Rename
{"v":1,"op":"upd","id":"r_1234567890","content":{"content":"Buy milk"}}

// Delete
{"v":1,"op":"del","id":"r_1234567890"}
```

## Setup

### Quick Start (Interactive Wizard)

The easiest way to configure the app:

```bash
# Install dependencies first
npm install

# Run the setup wizard
npm run setup
```

The wizard will:
1. Decode your Threads post URL to get the media ID
2. Guide you through getting the required credentials
3. Generate your `.env.local` file

### Utility Commands

```bash
# Decode a Threads URL or shortcode to media ID
npm run setup:decode "https://www.threads.com/@user/post/DTdl3mxEg_u"
npm run setup:decode DTdl3mxEg_u

# Validate your existing configuration
npm run setup:validate
```

### Manual Setup

If you prefer to configure manually:

#### 1. Get Your Thread ID

Either use the decode command above, or extract from the URL:
- URL: `https://www.threads.com/@user/post/DTdl3mxEg_u`
- Shortcode: `DTdl3mxEg_u`
- Run: `npm run setup:decode DTdl3mxEg_u`

#### 2. Get GraphQL Doc IDs

1. Open your Threads post in a browser
2. Open DevTools → Network tab → filter "graphql"
3. Refresh the page
4. Click a GraphQL request → Payload tab
5. Copy the `doc_id` value

You need:
- **READ_DOC_ID**: From requests that fetch post/reply data
- **WRITE_DOC_ID**: From requests when posting a reply (optional, defaults to READ_DOC_ID)

#### 3. Get Authentication Headers

From the same GraphQL request, go to Headers tab and copy:
- Full `Cookie` header value
- `X-CSRFToken` header value

#### 4. Create .env.local

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
THREAD_ID=3809367408742895598
READ_DOC_ID=7891234567890123
WRITE_DOC_ID=9876543210987654
HEADERS_JSON={"Cookie":"sessionid=xxx;...","X-CSRFToken":"yyy"}
```

### Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
demos/threads-todo/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page (server component)
│   ├── actions.ts        # Server Actions
│   ├── loading.tsx       # Loading state
│   └── globals.css       # Tailwind styles
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── header.tsx        # App header
│   ├── add-todo-form.tsx # Form component
│   ├── todo-item.tsx     # Individual TODO
│   └── todo-list.tsx     # TODO list
├── lib/
│   ├── db.ts             # ReplyDB factory
│   ├── utils.ts          # Utilities (cn)
│   └── todoContent.ts    # TODO helpers
└── ...config files
```

## Server Actions

The app uses Next.js Server Actions for all mutations:

- `getTodos()` - Fetch all TODOs
- `addTodo(formData)` - Add a new TODO
- `toggleTodo(id, done)` - Toggle done status
- `renameTodo(id, content)` - Update TODO text
- `deleteTodo(id)` - Remove a TODO

## Limitations

- Uses the reverse-engineered Threads GraphQL API (may break without notice)
- No pagination support (limited to first page of replies)
- Session cookies expire - you'll need to refresh them periodically
- Rate limits apply based on Threads' policies

## License

MIT
