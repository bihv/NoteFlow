import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateTextStream } from "@/lib/gemini";

export const runtime = "nodejs";

// Content generation types
const GENERATION_PROMPTS = {
    expand: (context: string) => `You are an expert writer. Expand the following brief text into detailed, comprehensive content.

Instructions:
- Elaborate on key points with specific details and examples
- Add depth and context while maintaining the original meaning
- Use proper paragraph structure and transitions
- Keep the same tone and style as the original
- Make it 3-5x longer than the original
- Use Vietnamese if the input is in Vietnamese, otherwise use English
- Return ONLY the expanded content (no meta-commentary like "Here is the expanded version")

Content to expand:
${context}`,

    outline: (topic: string) => `Create a comprehensive outline for: "${topic}"

Include:
- Main sections with descriptive titles
- Key subsections under each main section
- Brief notes on what to cover in each section

Format as a hierarchical outline with proper indentation.`,

    improve: (context: string) => `You are an expert editor. Improve the following text by fixing grammar, enhancing clarity, and refining word choice.

Instructions:
- Fix all grammar, spelling, and punctuation errors
- Improve sentence structure and flow
- Enhance clarity and readability
- Use more precise and impactful vocabulary
- Maintain the original meaning, tone, and voice
- Keep the same language as the original (Vietnamese or English)
- Return ONLY the improved text (no explanations or meta-commentary)

Original text:
${context}`,

    continue: (context: string) => `You are a creative writer. Continue writing from where this text left off.

Instructions:
- Match the exact style, tone, and voice of the original
- Maintain consistency with the subject matter and themes
- Write naturally as if it's part of the original text
- Add 2-3 paragraphs of continuation
- Use the same language as the original (Vietnamese or English)
- Return ONLY the continuation (no meta-commentary like "Here is the continuation")
- Do NOT repeat or rewrite the existing text

Existing text:
${context}

Continue naturally with 2-3 more paragraphs.`,

    template: (type: string, topic?: string, language?: 'auto' | 'vi' | 'en') => {
        // Language instruction
        const languageInstruction =
            language === 'vi' ? '\n\nGenerate the entire template in Vietnamese.' :
                language === 'en' ? '\n\nGenerate the entire template in English.' :
                    '\n\nUse the most appropriate language.';

        // Topic context
        const topicContext = topic ? `\n\nTopic/Context: ${topic}\nCustomize the template specifically for this topic.` : '';

        const templates: Record<string, string> = {
            "meeting-notes": `Create a comprehensive meeting notes template with the following sections:
- Meeting Title
- Date & Time
- Attendees
- Agenda
- Discussion Points
- Action Items (with assigned owners and deadlines)
- Next Steps${topicContext}${languageInstruction}`,

            "project-plan": `Create a detailed project plan template with:
- Project Overview
- Goals & Objectives
- Timeline & Milestones
- Resources Required
- Team Responsibilities
- Risks & Mitigation
- Success Criteria${topicContext}${languageInstruction}`,

            "blog-post": `Create a blog post outline template:
- Catchy Title
- Introduction (hook + overview)
- Main Points (3-5 sections)
  - Each with supporting details
  - Examples or stories
- Conclusion
- Call to Action${topicContext}${languageInstruction}`,

            "brainstorm": `Create a brainstorming template:
- Topic/Challenge
- Context & Background
- Ideas (wild ideas welcome!)
- Evaluation Criteria
- Top 3 Ideas to Explore
- Next Actions${topicContext}${languageInstruction}`,
        };

        return templates[type] || `Create a ${type} template with appropriate sections and structure.${topicContext}${languageInstruction}`;
    },

    custom: (prompt: string, context?: string) => {
        if (context) {
            return `${prompt}\n\nContext:\n${context}`;
        }
        return prompt;
    },
};

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
        const { type, prompt, context, templateType, topic, language } = body;

        if (!type) {
            return new Response(
                JSON.stringify({ error: "Generation type is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build the prompt based on type
        let fullPrompt = "";

        switch (type) {
            case "expand":
            case "improve":
            case "continue":
                if (!context) {
                    return new Response(
                        JSON.stringify({ error: "Context is required for this generation type" }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    );
                }
                fullPrompt = GENERATION_PROMPTS[type as "expand" | "improve" | "continue"](context);
                break;

            case "outline-solid":
                if (!prompt) {
                    return new Response(
                        JSON.stringify({ error: "Topic/prompt is required for outline-solid generation" }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    );
                }
                fullPrompt = GENERATION_PROMPTS.outline(prompt);
                break;

            case "template":
                fullPrompt = GENERATION_PROMPTS.template(templateType || "general", topic, language);
                break;

            case "custom":
                if (!prompt) {
                    return new Response(
                        JSON.stringify({ error: "Prompt is required for custom generation" }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    );
                }
                fullPrompt = GENERATION_PROMPTS.custom(prompt, context);
                break;

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid generation type" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
        }

        // Stream the response using Server-Sent Events
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of generateTextStream(fullPrompt, {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    })) {
                        const data = `data: ${JSON.stringify({ chunk })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }

                    // Send completion signal
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error: any) {
                    const errorData = `data: ${JSON.stringify({ error: error.message || "Generation failed" })}\n\n`;
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
        console.error("Content generation error:", error);

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
            JSON.stringify({ error: error.message || "Failed to generate content" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
