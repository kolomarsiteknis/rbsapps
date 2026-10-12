import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Initialize Admin SDK
// Uses GOOGLE_APPLICATION_CREDENTIALS environment variable
initializeApp();

const app = express();
app.use(express.json({ limit: '10mb' }));

const storage = getStorage();

app.post('/api/upload-image', async (req, res) => {
  try {
    const { dataUrl, path } = req.body;
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Explicitly use the default bucket or the one from config
    const bucket = storage.bucket('gen-lang-client-0997069506.firebasestorage.app');
    const file = bucket.file(path);
    
    await file.save(buffer, {
      contentType: 'image/jpeg',
      metadata: {
        firebaseStorageDownloadTokens: crypto.randomUUID()
      }
    });
    
    // Instead of makePublic, get signed URL for better security
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });
    
    res.json({ url });
  } catch (error) {
    console.error('Proxy upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
