import { ReplyDB } from "replydb";
import { ThreadsAdapter } from "replydb/adapters/threads";

export type DbConfig = {
  threadId: string;
  readRequestBody?: string;
  writeRequestBody?: string;
  cookie?: string;
  readDocId?: string;
  writeDocId?: string;
  headers?: Record<string, string>;
};

function getConfig(): DbConfig | null {
  const threadId = process.env.THREAD_ID;

  if (!threadId) {
    return null;
  }

  const readRequestBody = process.env.READ_REQUEST_BODY;
  const cookie = process.env.THREADS_COOKIE;

  if (readRequestBody && cookie) {
    return {
      threadId,
      readRequestBody,
      writeRequestBody: process.env.WRITE_REQUEST_BODY,
      cookie,
    };
  }

  const readDocId = process.env.READ_DOC_ID;
  const headersJson = process.env.HEADERS_JSON;

  if (!readDocId) {
    console.error(
      "Missing configuration. Set READ_REQUEST_BODY + THREADS_COOKIE (recommended) " +
      "or READ_DOC_ID + HEADERS_JSON (legacy)."
    );
    return null;
  }

  let headers: Record<string, string> = {};
  if (headersJson) {
    try {
      headers = JSON.parse(headersJson) as Record<string, string>;
    } catch {
      console.error("Failed to parse HEADERS_JSON");
      return null;
    }
  }

  return {
    threadId,
    readDocId,
    writeDocId: process.env.WRITE_DOC_ID,
    headers,
  };
}

let dbInstance: ReplyDB | null = null;

export function getDb(): ReplyDB | null {
  if (dbInstance) {
    return dbInstance;
  }

  const config = getConfig();
  if (!config) {
    return null;
  }

  const adapter = new ThreadsAdapter({
    readRequestBody: config.readRequestBody,
    writeRequestBody: config.writeRequestBody,
    cookie: config.cookie,
    readDocId: config.readDocId,
    writeDocId: config.writeDocId,
    headers: config.headers,
  });

  dbInstance = new ReplyDB({
    adapter,
    threadId: config.threadId,
  });

  return dbInstance;
}

export function isConfigured(): boolean {
  return getConfig() !== null;
}
