import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export function apiNotFound(req, res) {
  res.status(404).json({ error: { message: `No API route for ${req.method} ${req.originalUrl}` } });
}

function zodDetails(err) {
  const fields = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let details;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    details = zodDetails(err);
    message = Object.values(details)[0] || 'Some fields are invalid.';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Too many files, or a file was sent in the wrong field.'
          : err.message;
  } else if (err?.name === 'ValidationError') {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(details)[0] || 'Some fields are invalid.';
  } else if (err?.name === 'CastError') {
    status = 404;
    message = 'Not found.';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large.';
  } else if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    status = err.status;
    message = status === 404 ? 'Not found.' : err.expose ? err.message : 'Bad request.';
  }

  if (status >= 500 && !env.isTest) console.error('[error]', err);

  res.status(status).json({ error: { message, ...(details ? { fields: details } : {}) } });
}
