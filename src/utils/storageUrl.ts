import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Extract bucket name and path from a stored URL or path string.
 * Supports both old public URLs and new path format "bucket:path"
 */
export function parseStoragePath(value: string): { bucket: string; path: string } | null {
  // New format: "bucket:path"
  if (value.includes(':') && !value.startsWith('http')) {
    const idx = value.indexOf(':');
    return { bucket: value.substring(0, idx), path: value.substring(idx + 1) };
  }

  // Legacy: full public URL
  const turnaroundMatch = value.match(/turnaround-files\/(.+?)(?:\?|$)/);
  if (turnaroundMatch) return { bucket: 'turnaround-files', path: turnaroundMatch[1] };

  const loadingMatch = value.match(/loading-sheets\/(.+?)(?:\?|$)/);
  if (loadingMatch) return { bucket: 'loading-sheets', path: loadingMatch[1] };

  return null;
}

/**
 * Create a signed URL from a stored path/URL value.
 * Returns the signed URL or null if it fails.
 */
export async function getSignedUrl(value: string | null): Promise<string | null> {
  if (!value) return null;

  const parsed = parseStoragePath(value);
  if (!parsed) return value; // fallback: return as-is if can't parse

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.warn('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Create multiple signed URLs at once.
 */
export async function getSignedUrls(values: string[]): Promise<(string | null)[]> {
  return Promise.all(values.map(v => getSignedUrl(v)));
}

/**
 * Build a storage path string for persisting in the database.
 */
export function buildStoragePath(bucket: string, filePath: string): string {
  return `${bucket}:${filePath}`;
}
