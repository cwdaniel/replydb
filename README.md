# ReplyDB

### A database where replies are writes

ReplyDB is an experimental, append-only database framework that uses **social platform replies as the write layer**. It implements event sourcing with deterministic replay, where each reply is an immutable event in the log.

> **Warning**: This is experimental software. Do not use in production. Your data lives in social media replies. Think about that.

---

## Why?

Modern databases assume controlled write access, trusted clients, and private infrastructure.

ReplyDB assumes:
- **Untrusted writers** - anyone can reply
- **Public append-only logs** - replies are immutable events
- **Social platforms as infrastructure** - Threads is your database

It explores what happens when *anyone* can write, but **only valid events affect state**.

---

## Core Concepts

### Event Sourcing
State is reconstructed by replaying all replies in order. Invalid JSON or malformed events are silently ignored. Only schema-valid events affect the final state.

### Canonical Event Envelope
All applications using ReplyDB share the same base event structure:

```typescript
type ReplyDBEvent<C = unknown> = {
  v: 1;                           // Schema version
  op: "ins" | "upd" | "del";      // Operation type
  id?: string;                    // Record ID (required for upd/del)
  content?: C;                    // App-specific payload
  ts?: number;                    // Timestamp override
};
```

Apps define their own `content` type. The core handles parsing, ordering, and replay.

### Deterministic Replay
1. Sort replies by `createdAt`, then `replyId` for stability
2. Parse JSON and validate event shape
3. Apply operations to build final state:
   - `ins`: Create record with derived ID (`r_{replyId}`)
   - `upd`: Shallow merge content into existing record
   - `del`: Remove record

---

## ThreadsDB

The flagship adapter uses **Threads** as the storage backend.

```typescript
import { ReplyDB } from "replydb";
import { ThreadsAdapter } from "replydb/adapters/threads";

const adapter = new ThreadsAdapter({
  readDocId: "YOUR_DOC_ID",
  writeDocId: "YOUR_WRITE_DOC_ID",
  headers: {
    Cookie: "sessionid=YOUR_SESSION",
    "X-CSRFToken": "YOUR_CSRF_TOKEN",
  },
});

const db = new ReplyDB({
  adapter,
  threadId: "YOUR_THREAD_MEDIA_ID",
});
```

---

## Quick Example

Define your content type and use ReplyDB:

```typescript
import { ReplyDB, type ReplyDBEvent } from "replydb";
import { ThreadsAdapter } from "replydb/adapters/threads";

// Define your app-specific content type
type TodoContent = {
  content: string;
  done: boolean;
};

// Create the database
const db = new ReplyDB({
  adapter: new ThreadsAdapter({ /* config */ }),
  threadId: "123456789",
});

// Read current state
const { store } = await db.read<TodoContent>();

for (const [id, record] of store) {
  console.log(`${id}: ${record.content.content} [${record.content.done ? "done" : "todo"}]`);
}

// Append a new TODO
await db.append<TodoContent>({
  v: 1,
  op: "ins",
  content: { content: "Buy milk", done: false },
});

// Update a TODO
await db.append<Partial<TodoContent>>({
  v: 1,
  op: "upd",
  id: "r_1234567890",
  content: { done: true },
});

// Delete a TODO
await db.append({
  v: 1,
  op: "del",
  id: "r_1234567890",
});
```

---

## Consistency Model

ReplyDB uses what we call **vibe-based consistency**:

| Property | Status |
|----------|--------|
| Eventual consistency | Yes |
| Strong consistency | No |
| ACID transactions | Definitely not |
| CAP theorem | More like "CAPish vibes" |
| Durability | As durable as your social media posts |
| Isolation | None. It's literally public replies |

In practice:
- **Writes** propagate as fast as the platform allows
- **Reads** always replay the full log for current state
- **Conflicts** resolve by timestamp (first writer wins)
- **Failures** are silent (invalid events are ignored)

---

## Installation

```bash
npm install replydb
```

Requirements:
- Node.js 20+
- ESM-only (no CommonJS support)

---

## Setup

### 1. Create a Thread

Create a new post on Threads. This is your "database". Note the media ID from the URL or network requests.

### 2. Get GraphQL Doc IDs

Open Threads in your browser, open DevTools, and inspect GraphQL requests. Find the `doc_id` values for:
- Reading replies (`readDocId`)
- Posting replies (`writeDocId`)

### 3. Get Authentication

From the network requests, copy your session cookie and CSRF token.

### 4. Configure and Run

```bash
# Set environment variables
export THREAD_ID="your_media_id"
export READ_DOC_ID="your_read_doc_id"
export WRITE_DOC_ID="your_write_doc_id"
export HEADERS_JSON='{"Cookie":"sessionid=xxx","X-CSRFToken":"yyy"}'

# Run the demo
npm run build
node dist/demos/threads-todo/server.js list
```

---

## Demo: Threads TODO

A complete TODO list backed by a single Threads thread.

```bash
# List TODOs
node dist/demos/threads-todo/server.js list

# Add a TODO
node dist/demos/threads-todo/server.js add "Buy groceries"

# Mark as done
node dist/demos/threads-todo/server.js done r_123456 true

# Rename
node dist/demos/threads-todo/server.js rename r_123456 "Buy organic groceries"

# Delete
node dist/demos/threads-todo/server.js del r_123456
```

---

## API Reference

### `ReplyDB`

```typescript
class ReplyDB {
  constructor(config: { adapter: Adapter; threadId: string });

  // Read current state
  async read<C>(): Promise<{
    store: Map<string, StoredRecord<C>>;
    accepted: Array<{ event: ReplyDBEvent<C>; meta: ReplyMeta }>;
  }>;

  // Append an event
  async append<C>(event: ReplyDBEvent<C>): Promise<{ replyId: string }>;
}
```

### `Adapter` Interface

```typescript
interface Adapter {
  fetchReplies(threadId: string): Promise<ReplyRecord[]>;
  postReply(threadId: string, text: string): Promise<{ replyId: string }>;
}
```

### Core Utilities

```typescript
// Replay a thread's replies to reconstruct state
function replayThread<C>(replies: ReplyRecord[]): ReplayResult<C>;

// Validate event shape
function isReplyDBEvent(x: unknown): x is ReplyDBEvent<unknown>;

// Derive canonical record ID
function deriveRecordId(replyId: string): string; // Returns r_{replyId}
```

---

## Project Structure

```
replydb/
├── src/
│   ├── core/
│   │   ├── ReplyDB.ts       # Main database class
│   │   ├── types.ts         # Core type definitions
│   │   ├── replay.ts        # Deterministic replay logic
│   │   ├── validator.ts     # Event validation
│   │   └── utils.ts         # Utility functions
│   ├── adapters/
│   │   ├── base/            # Adapter interface
│   │   └── threads/         # Threads implementation
│   └── index.ts             # Public exports
├── demos/
│   └── threads-todo/        # Example TODO app
└── scripts/
    ├── replay.ts            # Replay utility
    └── snapshot.ts          # Export state to JSON
```

---

## Future Adapters (maybe)

- X (Twitter)
- Mastodon
- GitHub Issues
- YouTube Comments
- Discord Messages

---

## Caveats

- Uses reverse-engineered Threads API (may break without notice)
- No pagination support (limited to first page of replies)
- No offline support
- No encryption
- Your data is public
- This is a terrible idea

---

## License

MIT

---

*Remember: just because you can doesn't mean you should. But sometimes you should anyway.*
