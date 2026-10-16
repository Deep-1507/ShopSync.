
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "shopsync/products",
        public_id: publicId,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary returned no upload result."));
          return;
        }

        resolve(result);
      }
    ).end(buffer);
  });
}

export async function POST(request) {
  try {
    // IMPORTANT:
    // Verify enterprise authentication here using the same
    // server-side authentication logic as your product APIs.

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,
          message: "Please select an image.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 415 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Image size must be between 1 byte and 5 MB.",
        },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // A fresh UUID gives each upload a unique Cloudinary public ID.
    const publicId = randomUUID();

    const result = await uploadToCloudinary(buffer, publicId);

    return NextResponse.json(
      {
        success: true,
        message: "Image uploaded successfully.",
        photo_url: result.secure_url,
        public_id: result.public_id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Cloudinary image upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to upload image. Please try again.",
      },
      { status: 500 }
    );
  }
}