// 16. PAGES/API/ADMIN/UPLOAD.JS
// ===================================

import { uploadImage } from '../../../lib/cloudinary';
import multer from 'multer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    upload.array('images')(req, res, async err => {
      if (err) {
        return res.status(500).json({ message: 'Erro no upload' });
      }

      const uploadPromises = req.files.map(file => {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString(
          'base64'
        )}`;
        return uploadImage(base64);
      });

      const imageUrls = await Promise.all(uploadPromises);

      return res.status(200).json({ imageUrls });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Erro ao fazer upload das imagens' });
  }
}
