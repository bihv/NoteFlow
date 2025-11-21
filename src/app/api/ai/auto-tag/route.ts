import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "@/lib/gemini";

// Helper to extract plain text from BlockNote JSON content
function extractPlainText(content: string): string {
    try {
        const blocks = JSON.parse(content);

        function extractFromBlock(block: any): string {
            let text = "";

            if (block.content && Array.isArray(block.content)) {
                text += block.content.map((item: any) => item.text || "").join(" ");
            }

            if (block.children && Array.isArray(block.children)) {
                text += " " + block.children.map(extractFromBlock).join(" ");
            }

            return text;
        }

        const plainText = blocks.map(extractFromBlock).join(" ");
        return plainText.trim();
    } catch (error) {
        return content;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { content, title } = body;

        if (!content) {
            return NextResponse.json(
                { error: "Content is required" },
                { status: 400 }
            );
        }

        const plainText = extractPlainText(content);

        if (plainText.length < 50) {
            return NextResponse.json(
                { error: "Document is too short to generate tags." },
                { status: 400 }
            );
        }

        // Create tagging prompt
        const prompt = `You are an AI assistant that generates relevant tags for documents.

Document Title: ${title || "Untitled"}

Document Content:
${plainText.substring(0, 3000)} ${plainText.length > 3000 ? "..." : ""}

Please analyze this document and generate 3-5 relevant tags that describe:
1. The main topic or subject
2. The type of content (e.g., tutorial, guide, notes, project)
3. Key concepts or themes

Rules:
- Tags should be concise (1-3 words)
- Use lowercase
- Separate multiple-word tags with hyphens (e.g., "project-planning")
- Return ONLY the tags, separated by commas
- Also suggest 1-2 broader categories this document could belong to

Format your response EXACTLY as follows:
Tags: tag1, tag2, tag3, tag4
Categories: category1, category2

Use Vietnamese if the document is in Vietnamese, otherwise use English.`;

        console.log("[Auto-Tag] Calling Gemini API with prompt length:", prompt.length);
        console.log("[Auto-Tag] Plain text length:", plainText.length);

        const response = await generateText(prompt, {
            model: "gemini-2.5-flash", // Explicitly use flash model
            temperature: 0.4,
            maxOutputTokens: 2048, // Increased to accommodate thinking tokens + output
        });

        console.log("[Auto-Tag] Gemini response:", response);
        console.log("[Auto-Tag] Response length:", response?.length || 0);

        if (!response || response.trim().length === 0) {
            console.error("[Auto-Tag] Empty response from Gemini");
            return NextResponse.json(
                { error: "AI returned an empty response. Please try again." },
                { status: 500 }
            );
        }

        // Parse the response
        const lines = response.split("\n").filter(line => line.trim());
        const tagsLine = lines.find(line => line.toLowerCase().includes("tags:") || line.toLowerCase().includes("thẻ:"));
        const categoriesLine = lines.find(line => line.toLowerCase().includes("categories:") || line.toLowerCase().includes("danh mục:"));

        let tags: string[] = [];
        let categories: string[] = [];

        if (tagsLine) {
            const tagsText = tagsLine.split(":")[1] || "";
            tags = tagsText
                .split(",")
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0 && tag.length < 30)
                .slice(0, 5);
        }

        if (categoriesLine) {
            const categoriesText = categoriesLine.split(":")[1] || "";
            categories = categoriesText
                .split(",")
                .map(cat => cat.trim())
                .filter(cat => cat.length > 0)
                .slice(0, 2);
        }

        // Fallback if parsing failed
        if (tags.length === 0) {
            tags = response
                .toLowerCase()
                .split(/[,\n]/)
                .map(t => t.trim())
                .filter(t => t && t.length > 2 && t.length < 30)
                .slice(0, 5);
        }

        return NextResponse.json({
            tags,
            categories,
            rawResponse: response,
        });

    } catch (error: any) {
        console.error("Auto-tag error:", error);

        if (error.message?.includes("rate limit")) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in a moment." },
                { status: 429 }
            );
        }

        if (error.message?.includes("not configured")) {
            return NextResponse.json(
                { error: "AI features are not configured." },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Failed to generate tags" },
            { status: 500 }
        );
    }
}
