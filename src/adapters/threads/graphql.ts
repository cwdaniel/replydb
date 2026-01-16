import type {
  ThreadsConfig,
  ThreadsGraphQLResponse,
  ThreadsPostResponse,
} from "./types.js";
import { DEFAULT_GRAPHQL_ENDPOINT } from "./types.js";

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/x-www-form-urlencoded",
  "X-IG-App-ID": "238260118697367",
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Threads GraphQL request failed: ${String(response.status)} ${response.statusText}
${text.slice(0, 500)}`
    );
  }

  if (text.trimStart().startsWith("<!") || text.trimStart().startsWith("<html")) {
    throw new Error(
      `Threads returned HTML instead of JSON. This usually means:
` +
      `- Session cookies are invalid or expired
` +
      `- The request template is stale (re-capture from browser)
` +
      `- Rate limiting or IP blocking

` +
      `Response preview: ${text.slice(0, 200)}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse Threads response as JSON: ${text.slice(0, 500)}`);
  }
}

function modifyTemplateVariables(templateBody: string, newPostId: string): string {
  const params = new URLSearchParams(templateBody);
  const variablesStr = params.get("variables");

  if (!variablesStr) {
    throw new Error("Template body does not contain variables parameter");
  }

  try {
    const variables = JSON.parse(variablesStr) as Record<string, unknown>;
    if ("postID" in variables) {
      variables.postID = newPostId;
    }
    if ("mediaID" in variables) {
      variables.mediaID = newPostId;
    }
    params.set("variables", JSON.stringify(variables));
    return params.toString();
  } catch (e) {
    throw new Error(`Failed to parse template variables: ${String(e)}`);
  }
}

export async function executeWithTemplate<T>(
  config: ThreadsConfig,
  templateBody: string,
  postId: string,
  fetchFn: typeof globalThis.fetch
): Promise<T> {
  const endpoint = config.graphqlEndpoint ?? DEFAULT_GRAPHQL_ENDPOINT;
  const body = modifyTemplateVariables(templateBody, postId);

  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (config.cookie) {
    headers["Cookie"] = config.cookie;
  } else if (config.headers?.["Cookie"]) {
    headers["Cookie"] = config.headers["Cookie"];
  }

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers,
    body,
  });

  return parseResponse<T>(response);
}

export async function fetchRepliesGraphQL(
  config: ThreadsConfig,
  threadId: string,
  fetchFn: typeof globalThis.fetch
): Promise<ThreadsGraphQLResponse> {
  if (config.readRequestBody) {
    return executeWithTemplate<ThreadsGraphQLResponse>(
      config,
      config.readRequestBody,
      threadId,
      fetchFn
    );
  }

  if (!config.readDocId) {
    throw new Error(
      "No readRequestBody or readDocId configured. " +
      "Use the Chrome extension to capture a request template from the browser."
    );
  }

  const endpoint = config.graphqlEndpoint ?? DEFAULT_GRAPHQL_ENDPOINT;
  const params = new URLSearchParams();
  params.set("doc_id", config.readDocId);
  params.set("variables", JSON.stringify({ postID: threadId }));

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: { ...DEFAULT_HEADERS, ...config.headers },
    body: params.toString(),
  });

  return parseResponse<ThreadsGraphQLResponse>(response);
}

export async function postReplyGraphQL(
  config: ThreadsConfig,
  threadId: string,
  text: string,
  fetchFn: typeof globalThis.fetch
): Promise<ThreadsPostResponse> {
  if (config.writeRequestBody) {
    const params = new URLSearchParams(config.writeRequestBody);
    const variablesStr = params.get("variables");

    if (variablesStr) {
      const variables = JSON.parse(variablesStr) as Record<string, unknown>;
      variables.reply_to_media_id = threadId;
      variables.text = text;
      params.set("variables", JSON.stringify(variables));
    }

    const endpoint = config.graphqlEndpoint ?? DEFAULT_GRAPHQL_ENDPOINT;
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };

    if (config.cookie) {
      headers["Cookie"] = config.cookie;
    } else if (config.headers?.["Cookie"]) {
      headers["Cookie"] = config.headers["Cookie"];
    }

    const response = await fetchFn(endpoint, {
      method: "POST",
      headers,
      body: params.toString(),
    });

    return parseResponse<ThreadsPostResponse>(response);
  }

  const docId = config.writeDocId ?? config.readDocId;
  if (!docId) {
    throw new Error("No writeRequestBody or writeDocId configured.");
  }

  const endpoint = config.graphqlEndpoint ?? DEFAULT_GRAPHQL_ENDPOINT;
  const params = new URLSearchParams();
  params.set("doc_id", docId);
  params.set("variables", JSON.stringify({ reply_to_media_id: threadId, text }));

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: { ...DEFAULT_HEADERS, ...config.headers },
    body: params.toString(),
  });

  return parseResponse<ThreadsPostResponse>(response);
}
