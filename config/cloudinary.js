const { v2: cloudinary } = require('cloudinary');

function cloudinaryReady() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

if (cloudinaryReady()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function uploadBuffer(buffer, folder = 'ttt-outfit/products') {
  return new Promise((resolve, reject) => {
    if (!cloudinaryReady()) return reject(new Error('Cloudinary environment variables are not configured.'));
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, height: 1500, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] },
      (error, result) => error ? reject(error) : resolve(result)
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, cloudinaryReady, uploadBuffer };
