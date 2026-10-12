import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';
import { dataURLtoBlob } from '../utils/watermark';

const storage = getStorage(app);

export async function uploadImageToStorage(
  dataUrl: string, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> {
  // Use backend proxy to avoid CORS
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, path }),
  });

  if (!response.ok) {
    throw new Error('Upload failed through proxy');
  }

  const { url } = await response.json();
  if (onProgress) onProgress(100);
  return url;
}
