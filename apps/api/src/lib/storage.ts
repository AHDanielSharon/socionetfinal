/**
 * Storage adapter — uses Cloudinary when USE_CLOUDINARY=true (Render),
 * falls back to MinIO for local Docker development.
 * The exported function signatures are identical either way.
 */
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logger';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  width?: number;
  height?: number;
  blurhash?: string;
}

const useCloudinary = process.env.USE_CLOUDINARY === 'true';

// ─────────────────────────────────────────────
// Cloudinary implementation
// ─────────────────────────────────────────────
let _cloudinary: any = null;

const getCloudinary = async () => {
  if (_cloudinary) return _cloudinary;
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  _cloudinary = v2;
  return v2;
};

const cloudinaryUpload = (
  buffer: Buffer,
  folder: string,
  opts: Record<string, any> = {}
): Promise<UploadResult> =>
  new Promise(async (resolve, reject) => {
    const cld = await getCloudinary();
    const stream = cld.uploader.upload_stream(
      { folder: `socionet/${folder}`, resource_type: 'auto', ...opts },
      (err: any, result: any) => {
        if (err) return reject(err);
        resolve({
          url:    result.secure_url,
          key:    result.public_id,
          bucket: 'cloudinary',
          size:   result.bytes   ?? 0,
          width:  result.width,
          height: result.height,
        });
      }
    );
    stream.end(buffer);
  });

// ─────────────────────────────────────────────
// MinIO implementation (local dev only)
// ─────────────────────────────────────────────
let _minioClient: any = null;

const getMinio = async () => {
  if (_minioClient) return _minioClient;
  const Minio = await import('minio');
  _minioClient = new Minio.Client({
    endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
    port:      parseInt(process.env.MINIO_PORT ?? '9000'),
    useSSL:    process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  });
  return _minioClient;
};

const minioUpload = async (
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  bucket: string,
  folder: string
): Promise<UploadResult> => {
  const client = await getMinio();
  const ext = path.extname(originalName) || '.bin';
  const key = `${folder}/${uuidv4()}${ext}`;
  await client.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': mimeType });
  const publicUrl = process.env.NEXT_PUBLIC_MINIO_URL ?? 'http://localhost:9000';
  return { url: `${publicUrl}/${bucket}/${key}`, key, bucket, size: buffer.length };
};

// ─────────────────────────────────────────────
// Sharp-based image processing (optional)
// ─────────────────────────────────────────────
const processImage = async (
  buffer: Buffer,
  opts: { width?: number; height?: number; quality?: number; fit?: string } = {}
): Promise<{ data: Buffer; width: number; height: number }> => {
  try {
    const sharp = (await import('sharp')).default;
    let inst = sharp(buffer).withMetadata();
    if (opts.width || opts.height) {
      inst = inst.resize(opts.width, opts.height, {
        fit: (opts.fit as any) ?? 'inside',
        withoutEnlargement: true,
      });
    }
    const { data, info } = await inst
      .webp({ quality: opts.quality ?? 85 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    // sharp not available — return original
    return { data: buffer, width: 0, height: 0 };
  }
};

// ─────────────────────────────────────────────
// Public API (same interface for both backends)
// ─────────────────────────────────────────────

export const initStorage = async (): Promise<void> => {
  if (useCloudinary) {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      logger.warn('Cloudinary not configured — uploads will fail');
      return;
    }
    logger.info('Storage: Cloudinary', { cloud: process.env.CLOUDINARY_CLOUD_NAME });
  } else {
    logger.info('Storage: MinIO', { endpoint: process.env.MINIO_ENDPOINT ?? 'localhost' });
    // Ensure buckets exist — best-effort, non-fatal
    try {
      const client = await getMinio();
      const buckets = ['socionet-media', 'socionet-avatars', 'socionet-videos', 'socionet-audio'];
      for (const b of buckets) {
        if (!(await client.bucketExists(b))) await client.makeBucket(b, 'us-east-1');
      }
    } catch (err) {
      logger.warn('MinIO bucket init skipped', { error: String(err) });
    }
  }
};

export const uploadImage = async (
  buffer: Buffer,
  originalName: string,
  opts: { width?: number; height?: number; quality?: number } = {}
): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'posts', {
      transformation: [{ width: opts.width ?? 1920, height: opts.height, crop: 'limit', quality: opts.quality ?? 85, fetch_format: 'auto' }],
    });
  }
  const { data, width, height } = await processImage(buffer, opts);
  const result = await minioUpload(data, 'image.webp', 'image/webp', 'socionet-media', 'images');
  return { ...result, width, height };
};

export const uploadVideo = async (
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'videos', { resource_type: 'video' });
  }
  const ext = path.extname(originalName) || '.mp4';
  return minioUpload(buffer, originalName, 'video/mp4', 'socionet-videos', 'videos');
};

export const uploadAudio = async (
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'audio', { resource_type: 'video' });
  }
  return minioUpload(buffer, originalName, 'audio/mpeg', 'socionet-audio', 'audio');
};

export const uploadFile = async (
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'files', { resource_type: 'raw' });
  }
  return minioUpload(buffer, originalName, mimeType, 'socionet-media', 'files');
};

export const uploadAvatar = async (buffer: Buffer): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'avatars', {
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 90, fetch_format: 'auto' }],
    });
  }
  const { data, width, height } = await processImage(buffer, { width: 400, height: 400, fit: 'cover', quality: 90 });
  const result = await minioUpload(data, 'avatar.webp', 'image/webp', 'socionet-avatars', 'avatars');
  return { ...result, width, height };
};

export const uploadBanner = async (buffer: Buffer): Promise<UploadResult> => {
  if (useCloudinary) {
    return cloudinaryUpload(buffer, 'banners', {
      transformation: [{ width: 1500, height: 500, crop: 'fill', quality: 85, fetch_format: 'auto' }],
    });
  }
  const { data, width, height } = await processImage(buffer, { width: 1500, height: 500, fit: 'cover' });
  const result = await minioUpload(data, 'banner.webp', 'image/webp', 'socionet-media', 'banners');
  return { ...result, width, height };
};

export const deleteObject = async (bucket: string, key: string): Promise<void> => {
  try {
    if (useCloudinary) {
      const cld = await getCloudinary();
      await cld.uploader.destroy(key);
    } else {
      const client = await getMinio();
      await client.removeObject(bucket, key);
    }
  } catch (err) {
    logger.warn('Delete object failed', { bucket, key, error: String(err) });
  }
};

export const getPresignedUrl = async (bucket: string, key: string, expiry = 3600): Promise<string> => {
  if (useCloudinary) return key; // Cloudinary URLs are public
  const client = await getMinio();
  return client.presignedGetObject(bucket, key, expiry);
};
