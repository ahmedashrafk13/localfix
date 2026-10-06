import { stripDangerousKeys } from './security.js';

/**
 * Validates part of the request with a zod schema.
 * - body: replaces req.body with the parsed (trimmed, coerced, unknown-keys-stripped) value.
 * - query: Express 5 makes req.query read-only, so the parsed value goes to req.q.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const parsed = schema.parse(source === 'query' ? req.query : req[source] ?? {});
    if (source === 'query') req.q = parsed;
    else req[source] = parsed;
    next();
  };
}

/**
 * For multipart endpoints: the client sends the JSON fields as a string in a "data" field
 * alongside the files. This parses that string before validation.
 */
export function parseMultipartJson(req, res, next) {
  if (typeof req.body?.data === 'string') {
    try {
      req.body = stripDangerousKeys(JSON.parse(req.body.data));
    } catch {
      req.body = {};
    }
  }
  next();
}
