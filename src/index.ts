// Core exports
export { ReplyDB } from "./core/ReplyDB.js";
export type { ReplyDBConfig } from "./core/ReplyDB.js";

export type {
  AppendResult,
  ReadResult,
  RecordStore,
  ReplyDBEvent,
  ReplyMeta,
  StoredRecord,
} from "./core/types.js";

export { replayThread } from "./core/replay.js";
export type { ReplayResult } from "./core/replay.js";

export { isReplyDBEvent, parseEventFromText, safeJsonParse } from "./core/validator.js";
export { deriveRecordId, sortRepliesForReplay } from "./core/utils.js";

// Adapter base types
export type { Adapter } from "./adapters/base/Adapter.js";
export type {
  BaseAdapterConfig,
  PostReplyResult,
  ReplyRecord,
} from "./adapters/base/types.js";
