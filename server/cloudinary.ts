import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Request } from "express";
import * as path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const ALLOWED_ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOC_SIZE = 25 * 1024 * 1024;

function fileFilter(allowedTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(", ")}`));
    }
  };
}

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
});

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES),
});

export const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: fileFilter(ALLOWED_ALL_TYPES),
});

export type CloudinaryFolder =
  | "lms/course-images"
  | "lms/course-pdfs"
  | "lms/assignments"
  | "lms/submissions"
  | "lms/banners"
  | "chat/images"
  | "lms/quizzes";

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: CloudinaryFolder,
  options?: {
    publicId?: string;
    resourceType?: "image" | "raw" | "auto";
    format?: string;
  }
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: options?.resourceType || "auto",
      ...(options?.publicId && { public_id: options.publicId }),
      ...(options?.format && { format: options.format }),
    };

    if (folder === "lms/course-images") {
      uploadOptions.transformation = [
        { quality: "auto", fetch_format: "auto" },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          reject(new Error("Cloudinary upload returned no result"));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string, resourceType: string = "image"): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error: any) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
  }
}

export function getOptimizedUrl(url: string, options?: { width?: number; height?: number; quality?: string }): string {
  if (!url.includes("cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  const transforms: string[] = [];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  transforms.push(`q_${options?.quality || "auto"}`);
  transforms.push("f_auto");
  return `${parts[0]}/upload/${transforms.join(",")}/${parts[1]}`;
}

export { cloudinary };
