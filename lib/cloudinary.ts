import { v2 as cloudinary, type UploadApiOptions } from 'cloudinary';
import { serverEnv } from './env';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return 'Unknown error'
}

const getErrorCode = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'http_code' in error) {
    const code = (error as { http_code?: unknown }).http_code
    return typeof code === 'number' ? code : undefined
  }
  return undefined
}

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
    return { success: false, error: getErrorMessage(error) };
  }
}

// Upload image function
export async function uploadImage(file: string, options: Partial<UploadApiOptions> = {}) {
  try {
    if (!serverEnv.CLOUDINARY_CLOUD_NAME || !serverEnv.CLOUDINARY_API_KEY || !serverEnv.CLOUDINARY_API_SECRET) {
      return {
        success: false,
        error: 'Cloudinary credentials are not configured on the server.'
      }
    }

    console.log('🔥 Starting Cloudinary upload...')
    console.log('  Cloud name:', serverEnv.CLOUDINARY_CLOUD_NAME)
    console.log('  API key:', serverEnv.CLOUDINARY_API_KEY ? '[SET]' : '[NOT SET]')
    console.log('  API secret:', serverEnv.CLOUDINARY_API_SECRET ? '[SET]' : '[NOT SET]')
    console.log('  File type:', file.substring(0, 30) + '...')
    console.log('  Options:', options)

    const defaultOptions: UploadApiOptions = {
      folder: 'voiceflow',
      resource_type: 'auto',
      format: 'webp',
      transformation: [
        { width: 1280, height: 1280, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    }

    const mergedOptions: UploadApiOptions = {
      ...defaultOptions,
      ...options,
      transformation: options.transformation ?? defaultOptions.transformation
    }
    
    const result = await cloudinary.uploader.upload(file, mergedOptions);
    
    console.log('✅ Cloudinary upload successful!')
    console.log('  Public ID:', result.public_id)
    console.log('  Secure URL:', result.secure_url)
    console.log('  Width x Height:', result.width, 'x', result.height)
    
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    console.error('  Error message:', getErrorMessage(error));
    const errorCode = getErrorCode(error)
    if (errorCode) {
      console.error('  Error code:', errorCode)
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

// Delete image function
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Cloudinary delete failed:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export default cloudinary;