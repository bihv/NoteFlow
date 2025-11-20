import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
    try {
        // Get usage statistics from Cloudinary Admin API
        const usage = await cloudinary.api.usage();
        console.log('===> usage:: ' + JSON.stringify(usage))

        // Parse storage usage
        const storageUsed = usage.storage?.usage || 0;
        const storageCredits = usage.storage?.credits_usage || 0;

        // Parse bandwidth usage
        const bandwidthUsed = usage.bandwidth?.usage || 0;
        const bandwidthCredits = usage.bandwidth?.credits_usage || 0;

        // Parse transformations
        const transformationsUsed = usage.transformations?.usage || 0;
        const transformationsCredits = usage.transformations?.credits_usage || 0;

        // Parse overall credits
        const creditsUsed = usage.credits?.usage || 0;
        const creditsLimit = usage.credits?.limit || 25;
        const creditsPercent = usage.credits?.used_percent || 0;

        // Calculate stats with credits-based system
        const stats = {
            plan: usage.plan || "Free",
            credits: {
                used: creditsUsed,
                limit: creditsLimit,
                percentage: creditsPercent.toFixed(2),
                remaining: (creditsLimit - creditsUsed).toFixed(2),
            },
            storage: {
                usedBytes: storageUsed,
                usedMB: (storageUsed / (1024 * 1024)).toFixed(2),
                credits: storageCredits,
                maxSizeBytes: usage.media_limits?.image_max_size_bytes || 10485760,
                maxSizeMB: ((usage.media_limits?.image_max_size_bytes || 10485760) / (1024 * 1024)).toFixed(2),
            },
            bandwidth: {
                usedBytes: bandwidthUsed,
                usedMB: (bandwidthUsed / (1024 * 1024)).toFixed(2),
                usedGB: (bandwidthUsed / (1024 * 1024 * 1024)).toFixed(3),
                credits: bandwidthCredits,
            },
            transformations: {
                used: transformationsUsed,
                credits: transformationsCredits,
            },
            resources: {
                total: usage.resources || 0,
                derived: usage.derived_resources || 0,
            },
            rateLimit: {
                allowed: usage.rate_limit_allowed || 500,
                remaining: usage.rate_limit_remaining || 0,
                resetAt: usage.rate_limit_reset_at || null,
            },
            lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching Cloudinary stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch storage statistics" },
            { status: 500 }
        );
    }
}
