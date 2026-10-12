import { uploadImageToStorage } from './imageUploadService';
import { saveImageFallback } from './indexedDbService';
import { dataURLtoBlob } from '../utils/watermark';

const MAX_SIZE_BYTES = 800 * 1024; // 800KB

/**
 * Compresses a dataURL image if it exceeds the size limit.
 */
async function compressImage(dataUrl: string, maxSize = MAX_SIZE_BYTES): Promise<string> {
  const sizeInBytes = (dataUrl.length * 3) / 4;
  console.log('Original image size:', sizeInBytes, 'bytes');
  if (sizeInBytes <= maxSize) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded for compression');
      const canvas = document.createElement('canvas');
      const scale = Math.sqrt(maxSize / sizeInBytes);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Compressed image size:', (compressed.length * 3) / 4, 'bytes');
      resolve(compressed);
    };
    img.src = dataUrl;
  });
}

/**
 * Uploads an image to Firebase Storage, with fallback to local storage if it fails.
 */
export async function uploadImageWithFallback(
  dataUrl: string, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const compressedDataUrl = await compressImage(dataUrl);
    return await uploadImageToStorage(compressedDataUrl, path, onProgress);
  } catch (error) {
    console.error(`Failed to upload ${path} to storage, keeping local dataURL:`, error);
    throw error; // Propagate error so caller knows upload failed
  }
}

/**
 * Specifically handles fallback to IndexedDB if Firestore sync fails.
 */
export async function saveImageToIndexedDB(id: string, dataUrl: string): Promise<void> {
  try {
    const blob = dataURLtoBlob(dataUrl);
    await saveImageFallback(id, blob);
  } catch (error) {
    console.error(`Failed to save image ${id} to IndexedDB:`, error);
  }
}
