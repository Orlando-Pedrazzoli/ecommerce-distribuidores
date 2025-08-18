// 6. LIB/CLOUDINARY.JS
// ===================================

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async file => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'ecommerce-distribuidores',
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Erro ao fazer upload da imagem');
  }
};

export default cloudinary;
