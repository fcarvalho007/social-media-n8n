import { getImageDimensions, getVideoDimensions } from '@/lib/mediaValidation';

interface Dimensions {
  width: number;
  height: number;
}

/**
 * Per-validation-run dimension cache. A WeakMap keyed by File means entries
 * are GC'd as soon as the user removes a file from the carousel — no manual
 * eviction needed. Multiple validators (gbp, mediaResolution, mediaAspect)
 * therefore decode each image/video at most once per run.
 */
const cache = new WeakMap<File, Promise<Dimensions>>();

export function getDimensionsCached(file: File): Promise<Dimensions> {
  const hit = cache.get(file);
  if (hit) return hit;
  const promise = (file.type.startsWith('video/')
    ? getVideoDimensions(file)
    : getImageDimensions(file)
  ).catch(err => {
    cache.delete(file); // allow retry on transient failure
    throw err;
  });
  cache.set(file, promise);
  return promise;
}
