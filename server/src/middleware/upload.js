import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { badRequest } from '../utils/http.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function fileFilter(req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(badRequest('Only JPG, PNG or WebP images are allowed.'));
  }
  cb(null, true);
}

/** Files are kept in memory, then re-encoded by sharp before anything touches the disk. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 6, fields: 20 },
  fileFilter,
});

/**
 * Re-encodes an uploaded image to WebP. Re-encoding verifies the file really is an image (sharp throws
 * otherwise), strips EXIF metadata such as GPS location, and keeps file sizes small for mobile users.
 */
export async function saveImage(file, folder, { maxWidth = 1600, maxHeight = 1600, square = false, privateDir = false } = {}) {
  let pipeline;
  try {
    pipeline = sharp(file.buffer, { failOn: 'error' }).rotate();
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) throw new Error('not an image');
  } catch {
    throw badRequest(`"${file.originalname}" is not a valid image.`);
  }
  pipeline = square
    ? pipeline.resize(maxWidth, maxWidth, { fit: 'cover' })
    : pipeline.resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true });

  const root = privateDir ? env.PRIVATE_UPLOAD_DIR : env.UPLOAD_DIR;
  const dir = path.join(root, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.webp`;
  await pipeline.webp({ quality: 80 }).toFile(path.join(dir, name));
  return privateDir ? path.join(folder, name) : `/uploads/${folder}/${name}`;
}

/** Deletes a file previously returned by saveImage. Seed images and foreign URLs are left alone. */
export async function removeUpload(publicUrl) {
  if (typeof publicUrl !== 'string' || !publicUrl.startsWith('/uploads/') || publicUrl.startsWith('/uploads/seed/')) return;
  const target = path.resolve(env.UPLOAD_DIR, publicUrl.replace(/^\/uploads\//, ''));
  if (!target.startsWith(env.UPLOAD_DIR)) return;
  await fs.unlink(target).catch(() => {});
}
