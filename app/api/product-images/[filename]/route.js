
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// export const runtime = "nodejs";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // Only accept generated image filenames with supported extensions.
    if (
      typeof filename !== "string" ||
      !/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename)
    ) {
      return NextResponse.json(
        { message: "Invalid image filename." },
        { status: 400 }
      );
    }

    const extension = path.extname(filename).toLowerCase();
    const filePath = path.join(
      process.cwd(),
      "picture-uploads",
      filename
    );

    const image = await readFile(filePath);

    return new Response(image, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[extension],
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return NextResponse.json(
        { message: "Image not found." },
        { status: 404 }
      );
    }

    console.error("Image serving error:", error);

    return NextResponse.json(
      { message: "Unable to load image." },
      { status: 500 }
    );
  }
}
