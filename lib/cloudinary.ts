import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadPhoto(buffer: Buffer, nomFichier: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "copilote-jardin", public_id: nomFichier, resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload échoué"));
          resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}

export { cloudinary };
