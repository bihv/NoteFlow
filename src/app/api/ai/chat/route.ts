import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chatStreamWithContinuation, generateLongContentInChunks } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const body = await request.json();
        const { message, documentContent, documentTitle, history, mode } = body;

        if (!message) {
            return new Response(
                JSON.stringify({ error: "Message is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build context from document
        let systemContext = "You are a helpful AI assistant integrated into Nova, a note-taking application. You help users understand, analyze, and work with their documents.";

        if (documentContent) {
            // Extract plain text from BlockNote content
            let plainText = "";
            try {
                const blocks = JSON.parse(documentContent);
                function extractText(block: any): string {
                    let text = "";
                    if (block.content && Array.isArray(block.content)) {
                        text += block.content.map((item: any) => item.text || "").join(" ");
                    }
                    if (block.children && Array.isArray(block.children)) {
                        text += " " + block.children.map(extractText).join(" ");
                    }
                    return text;
                }
                plainText = blocks.map(extractText).join(" ").trim();
            } catch (e) {
                plainText = documentContent;
            }

            systemContext += `\\n\\nCurrent Document Context:\\nTitle: ${documentTitle || "Untitled"}\\nContent: ${plainText}`;
        }

        // Format conversation history
        const messages: Array<{ role: "user" | "model"; text: string }> = [];

        // Add system context as first message
        if (history && history.length > 0) {
            // Include previous history
            history.forEach((msg: any) => {
                messages.push({
                    role: msg.role === "user" ? "user" : "model",
                    text: msg.content,
                });
            });
        }

        // Add current user message with context
        const userMessage = documentContent
            ? `${systemContext}\\n\\nUser question: ${message}`
            : message;

        messages.push({
            role: "user",
            text: userMessage,
        });

        // Stream the response using Server-Sent Events
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Branch based on mode
                    if (mode === "chunks") {
                        // Chunk-based generation for long-form content
                        for await (const event of generateLongContentInChunks(message, {
                            temperature: 0.7,
                        })) {
                            const data = `data: ${JSON.stringify(event.data)}\\n\\n`;
                            controller.enqueue(encoder.encode(data));
                        }
                    } else {
                        // Normal chat mode with continuation
                        for await (const event of chatStreamWithContinuation(messages, {
                            temperature: 0.7,
                        })) {
                            if (event.type === 'chunk') {
                                // Send text chunk
                                const data = `data: ${JSON.stringify(event.data)}\\n\\n`;
                                controller.enqueue(encoder.encode(data));
                            } else if (event.type === 'status') {
                                // Send status update (continuing, done, etc.)
                                const data = `data: ${JSON.stringify(event.data)}\\n\\n`;
                                controller.enqueue(encoder.encode(data));
                            }
                        }
                    }

                    // Send final completion signal
                    controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));
                    controller.close();
                } catch (error: any) {
                    const errorData = `data: ${JSON.stringify({ error: error.message || "Chat failed" })}\\n\\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("Chat error:", error);

        if (error.message?.includes("rate limit")) {
            return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
                { status: 429, headers: { "Content-Type": "application/json" } }
            );
        }

        if (error.message?.includes("not configured")) {
            return new Response(
                JSON.stringify({ error: "AI features are not configured." }),
                { status: 503, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: error.message || "Chat failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
