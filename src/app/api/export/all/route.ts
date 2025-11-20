import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
    try {
        const { getToken } = await auth();
        const token = await getToken({ template: "convex" });

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        convex.setAuth(token);
        const documents = await convex.query(api.documents.exportAll);

        return NextResponse.json(documents);
    } catch (error) {
        console.error("Error exporting all documents:", error);
        return NextResponse.json(
            { error: "Failed to export documents" },
            { status: 500 }
        );
    }
}
