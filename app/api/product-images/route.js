
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request) {
  try {
    // IMPORTANT:
    // Protect this endpoint with the same enterprise-authentication
    // middleware/check used by your existing product create/update APIs.

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { success: false, message: "Please select an image." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
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

    const uploadDirectory = path.join(
      process.cwd(),
      "picture-uploads"
    );

    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadDirectory, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer, { flag: "wx" });

    // Set NEXT_PUBLIC_APP_URL in production to your canonical public
    // website origin, e.g. https://your-domain.com.
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const photo_url =
      `${origin}/api/product-images/${filename}`;

    return NextResponse.json(
      {
        success: true,
        message: "Image uploaded successfully.",
        photo_url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Image upload error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to upload image." },
      { status: 500 }
    );
  }
}
