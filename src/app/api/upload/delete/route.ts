import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get("url");

        if (!imageUrl) {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        // Validate this is a Cloudinary URL
        if (!imageUrl.includes("res.cloudinary.com")) {
            return NextResponse.json(
                { error: "Not a Cloudinary URL" },
                { status: 400 }
            );
        }

        // Extract public_id from Cloudinary URL
        // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
        const urlParts = imageUrl.split("/");
        const uploadIndex = urlParts.findIndex((part) => part === "upload");

        if (uploadIndex === -1) {
            return NextResponse.json({ error: "Invalid Cloudinary URL" }, { status: 400 });
        }

        // Get everything after "upload/v{version}/" and remove file extension
        const publicIdWithFolder = urlParts.slice(uploadIndex + 2).join("/");
        const publicId = publicIdWithFolder.replace(/\.[^/.]+$/, "");

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === "ok" || result.result === "not found") {
            return NextResponse.json({ success: true, result });
        } else {
            return NextResponse.json(
                { error: "Delete failed", result },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json(
            { error: "Delete failed" },
            { status: 500 }
        );
    }
}
