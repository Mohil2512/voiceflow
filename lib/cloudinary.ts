import { v2 as cloudinary } from 'cloudinary';
import { serverEnv } from './env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
  api_key: serverEnv.CLOUDINARY_API_KEY,
  api_secret: serverEnv.CLOUDINARY_API_SECRET,
});

// Test connection function
export async function testCloudinaryConnection() {
  try {
    // Test the connection by getting account details
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection successful:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
    return { success: false, error: error.message };
  }
}

// Upload image function
export async function uploadImage(file: string, options: any = {}) {
  try {
    console.log('🔥 Starting Cloudinary upload...')
    console.log('  Cloud name:', serverEnv.CLOUDINARY_CLOUD_NAME)
    console.log('  API key:', serverEnv.CLOUDINARY_API_KEY ? '[SET]' : '[NOT SET]')
    console.log('  API secret:', serverEnv.CLOUDINARY_API_SECRET ? '[SET]' : '[NOT SET]')
    console.log('  File type:', file.substring(0, 30) + '...')
    console.log('  Options:', options)
    
    const result = await cloudinary.uploader.upload(file, {
      folder: 'voiceflow',
      resource_type: 'auto',
      ...options,
    });
    
    console.log('✅ Cloudinary upload successful!')
    console.log('  Public ID:', result.public_id)
    console.log('  Secure URL:', result.secure_url)
    console.log('  Width x Height:', result.width, 'x', result.height)
    
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    console.error('  Error message:', error.message);
    console.error('  Error code:', error.http_code);
    return { success: false, error: error.message || 'Unknown upload error' };
  }
}

// Delete image function
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Cloudinary delete failed:', error);
    return { success: false, error: error.message };
  }
}

export default cloudinary;