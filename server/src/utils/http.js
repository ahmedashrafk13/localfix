import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);

export function isObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return true;
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export function assertObjectId(value, label = 'Item') {
  if (!isObjectId(value)) throw notFound(`${label} not found.`);
  return value;
}

export function sameId(a, b) {
  if (!a || !b) return false;
  const idA = a._id ? a._id.toString() : a.toString();
  const idB = b._id ? b._id.toString() : b.toString();
  return idA === idB;
}

export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function paginate(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageResult(items, total, { page, limit }) {
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
