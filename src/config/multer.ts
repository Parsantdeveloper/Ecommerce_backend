// config/multer.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    
    return {
      folder: 'products',
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, 
      resource_type: isVideo ? 'video' : 'image',
    };
  },
});

export const destroy = async (public_id: string, resource_type: 'image' | 'video' = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, { resource_type });
    console.log(`Successfully deleted ${resource_type} with public_id: ${public_id}`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting ${resource_type} with public_id: ${public_id}`, error);
    throw error;
  }
};

export const upload = multer({ storage });