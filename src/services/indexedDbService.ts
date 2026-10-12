import { openDB } from 'idb';

const DB_NAME = 'SuryalandDB';
const IMAGE_STORE = 'Images';
const CACHE_STORE = 'ImageCache';

export const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
      }
    },
  });
};

// Existing fallback logic
export const saveImageFallback = async (id: string, blob: Blob) => {
  const db = await initDB();
  await db.put(IMAGE_STORE, { id, blob, timestamp: Date.now() });
};

export const getImageFallback = async (id: string): Promise<Blob | null> => {
  const db = await initDB();
  const entry = await db.get(IMAGE_STORE, id);
  return entry ? entry.blob : null;
};

// Caching logic
export const cacheImage = async (url: string, blob: Blob) => {
  const db = await initDB();
  await db.put(CACHE_STORE, { url, blob, timestamp: Date.now() });
};

export const getCachedImage = async (url: string): Promise<Blob | null> => {
  const db = await initDB();
  const entry = await db.get(CACHE_STORE, url);
  return entry ? entry.blob : null;
};

export async function fetchAndCacheImage(url: string): Promise<string> {
  const cachedBlob = await getCachedImage(url);
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob);
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    await cacheImage(url, blob);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to fetch and cache image:', error);
    return url;
  }
}
