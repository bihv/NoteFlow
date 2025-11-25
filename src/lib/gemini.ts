import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. AI features will be disabled.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Rate limiting configuration
const RATE_LIMIT = {
    maxRequestsPerMinute: 50, // Conservative limit (Gemini free tier: 60/min)
    maxRequestsPerDay: 1400,  // Conservative limit (Gemini free tier: 1500/day)
};

// Simple in-memory rate limiter
class RateLimiter {
    private requestTimestamps: number[] = [];
    private dailyCount = 0;
    private lastResetDate = new Date().toDateString();

    canMakeRequest(): boolean {
        const now = Date.now();
        const currentDate = new Date().toDateString();

        // Reset daily counter if it's a new day
        if (currentDate !== this.lastResetDate) {
            this.dailyCount = 0;
            this.lastResetDate = currentDate;
        }

        // Check daily limit
        if (this.dailyCount >= RATE_LIMIT.maxRequestsPerDay) {
            return false;
        }

        // Remove timestamps older than 1 minute
        const oneMinuteAgo = now - 60 * 1000;
        this.requestTimestamps = this.requestTimestamps.filter(
            (timestamp) => timestamp > oneMinuteAgo
        );

        // Check per-minute limit
        if (this.requestTimestamps.length >= RATE_LIMIT.maxRequestsPerMinute) {
            return false;
        }

        return true;
    }

    recordRequest(): void {
        this.requestTimestamps.push(Date.now());
        this.dailyCount++;
    }

    getStats() {
        return {
            requestsInLastMinute: this.requestTimestamps.length,
            requestsToday: this.dailyCount,
        };
    }
}

const rateLimiter = new RateLimiter();

// Gemini model configurations
export const MODELS = {
    PRO: "gemini-2.5-pro", // Best for complex tasks, reasoning
    FLASH: "gemini-2.5-flash", // Faster, cheaper for simple tasks (Free tier: 15 RPM, 1M RPD)
} as const;

/**
 * Get a configured Gemini model instance
 */
function getModel(modelName: string = MODELS.FLASH): GenerativeModel {
    if (!genAI) {
        throw new Error("Gemini API is not configured. Please set GEMINI_API_KEY.");
    }
    return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generate text with Gemini API
 */
export async function generateText(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }
): Promise<string> {
    if (!rateLimiter.canMakeRequest()) {
        throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
        const model = getModel(options?.model);
        rateLimiter.recordRequest();

        console.log("[Gemini] Making API call with model:", options?.model || "default");
        console.log("[Gemini] Prompt length:", prompt.length);

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxOutputTokens ?? 8192,
            },
        });

        console.log("[Gemini] Raw result:", JSON.stringify(result, null, 2).substring(0, 500));

        const response = result.response;
        console.log("[Gemini] Response object:", response);
        console.log("[Gemini] Candidates:", JSON.stringify(response.candidates, null, 2));

        let text = "";

        // Try to get text using the standard method
        try {
            text = response.text();
        } catch (e) {
            console.log("[Gemini] response.text() failed, trying fallback");
        }

        // Fallback: extract from candidates directly
        if (!text || text.trim().length === 0) {
            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    text = candidate.content.parts.map((part: any) => part.text || "").join("");
                    console.log("[Gemini] Extracted text from candidates:", text.substring(0, 200));
                }
            }
        }

        console.log("[Gemini] Final extracted text:", text.substring(0, 200));
        console.log("[Gemini] Text length:", text?.length || 0);

        return text;
    } catch (error: any) {
        console.error("Gemini API error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));

        if (error.message?.includes("RATE_LIMIT")) {
            throw new Error("API rate limit exceeded. Please try again in a moment.");
        }

        throw new Error(error.message || "Failed to generate text with Gemini API");
    }
}

/**
 * Enhanced streaming with automatic continuation for long responses
 * Wrapper around chatStreamWithContinuation for simple prompt-based generation
 */
export async function* generateTextStreamWithContinuation(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxOutputTokens?: number;
        maxContinuations?: number;
    }
): AsyncGenerator<{ type: 'chunk' | 'status'; data: any }, void, unknown> {
    // Convert prompt to messages array and delegate to unified function
    const messages = [{ role: "user" as const, text: prompt }];

    yield* chatStreamWithContinuation(messages, {
        model: options?.model,
        temperature: options?.temperature,
        maxContinuations: options?.maxContinuations,
    });
}

/**
 * Enhanced streaming with automatic continuation
 * Intelligently handles both single-shot generation and multi-turn conversations
 */
export async function* chatStreamWithContinuation(
    messages: Array<{ role: "user" | "model"; text: string }>,
    options?: {
        model?: string;
        temperature?: number;
        maxContinuations?: number;
        timeoutMs?: number; // Max time for entire generation
    }
): AsyncGenerator<{ type: 'chunk' | 'status'; data: any }, void, unknown> {
    const maxContinuations = options?.maxContinuations ?? 5;
    const timeoutMs = options?.timeoutMs ?? 300000; // 5 minutes default
    let continuationCount = 0;
    let currentAccumulatedText = "";
    let totalAccumulatedText = "";
    const startTime = Date.now();

    // Helper to check timeout
    const isTimedOut = () => {
        return Date.now() - startTime > timeoutMs;
    };

    // Detect if this is single-shot generation (1 user message) vs multi-turn chat
    const isSingleShot = messages.length === 1 && messages[0].role === "user";
    const originalPrompt = isSingleShot ? messages[0].text : null;

    // Work with a mutable copy of messages
    const workingMessages = [...messages];

    while (continuationCount <= maxContinuations) {
        // Check timeout
        if (isTimedOut()) {
            yield {
                type: 'status',
                data: {
                    status: 'timeout',
                    message: `Generation timed out after ${Math.round(timeoutMs / 1000)}s`,
                    contentLength: totalAccumulatedText.length,
                }
            };
            break;
        }

        if (!rateLimiter.canMakeRequest()) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }

        try {
            const model = getModel(options?.model);
            rateLimiter.recordRequest();

            const chat = model.startChat({
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: 8192,
                },
                history: workingMessages.slice(0, -1).map((msg) => ({
                    role: msg.role,
                    parts: [{ text: msg.text }],
                })),
            });

            const lastMessage = workingMessages[workingMessages.length - 1];
            const result = await chat.sendMessageStream(lastMessage.text);

            let finishReason: string | null = null;
            let usageMetadata: any = null;

            for await (const chunk of result.stream) {
                try {
                    const text = chunk.text();
                    if (text) {
                        currentAccumulatedText += text;
                        totalAccumulatedText += text;
                        yield { type: 'chunk', data: { chunk: text } };
                    }
                } catch (parseError: any) {
                    console.warn("[Gemini] Failed to parse chunk, skipping:", parseError.message);
                    // Continue to next chunk instead of breaking
                    continue;
                }

                // Track finish reason and usage metadata
                if (chunk.candidates && chunk.candidates.length > 0) {
                    const candidate = chunk.candidates[0];
                    if (candidate.finishReason) {
                        finishReason = candidate.finishReason;
                    }
                }

                // Track usage metadata (available in final chunk)
                if (chunk.usageMetadata) {
                    usageMetadata = chunk.usageMetadata;
                }
            }

            // Check if we need to continue
            if (finishReason === "MAX_TOKENS" && continuationCount < maxContinuations) {
                // Notify continuation
                yield {
                    type: 'status',
                    data: {
                        status: 'continuing',
                        continuationCount: continuationCount + 1,
                        tokens: usageMetadata?.totalTokenCount || null,
                        chars: totalAccumulatedText.length,
                    }
                };

                continuationCount++;

                // Add the accumulated response to history
                workingMessages.push({
                    role: "model",
                    text: currentAccumulatedText,
                });

                // Smart continuation based on mode
                if (isSingleShot && originalPrompt) {
                    // Single-shot mode: Include original prompt + recent context
                    // This preserves the original intent better
                    let contextLength = Math.min(totalAccumulatedText.length, 3000);
                    let contextStart = totalAccumulatedText.length - contextLength;

                    // Try to find a natural break point
                    const searchStart = Math.max(0, contextStart - 200);
                    const searchEnd = Math.min(totalAccumulatedText.length, contextStart + 200);
                    const searchRegion = totalAccumulatedText.substring(searchStart, searchEnd);
                    const paragraphBreak = searchRegion.lastIndexOf('\n\n');

                    if (paragraphBreak !== -1) {
                        contextStart = searchStart + paragraphBreak + 2;
                    }

                    const recentContext = totalAccumulatedText.substring(contextStart);

                    workingMessages.push({
                        role: "user",
                        text: `${originalPrompt}

[CONTINUATION REQUEST - The previous response was cut off due to length limits. Continue from where it ended.]

Already generated content (showing last ~${recentContext.length} characters):
${recentContext}

IMPORTANT INSTRUCTIONS:
- Continue writing naturally from where the text ended above
- Do NOT restart or repeat what was already written
- Do NOT generate placeholder content (like repeated dashes, empty lines, etc.)
- If you were in the middle of a table, complete it properly with actual content
- If you were in the middle of a list, continue with actual items
- Just provide the next meaningful content`
                    });
                } else {
                    // Multi-turn chat mode: Simple continuation
                    workingMessages.push({
                        role: "user",
                        text: "Continue from where you just left off. Keep writing naturally without repeating what you already wrote.",
                    });
                }

                currentAccumulatedText = ""; // Reset for next iteration

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // Done!
                yield {
                    type: 'status',
                    data: {
                        status: 'done',
                        tokens: usageMetadata?.totalTokenCount || null,
                        chars: totalAccumulatedText.length,
                        continuations: continuationCount,
                        finishReason,
                    }
                };
                break;
            }
        } catch (error: any) {
            console.error("Gemini chat stream error:", error);

            // If we have some content, yield it and break gracefully
            if (totalAccumulatedText.length > 0) {
                yield {
                    type: 'status',
                    data: {
                        status: 'error_with_partial_content',
                        message: 'Stream encountered an error but partial content was generated',
                        error: error.message,
                        contentLength: totalAccumulatedText.length,
                    }
                };
                break;
            }

            throw new Error(error.message || "Failed to stream chat response");
        }
    }

    if (continuationCount >= maxContinuations) {
        yield {
            type: 'status',
            data: {
                status: 'max_continuations_reached',
                message: 'Response reached maximum continuation limit.',
            }
        };
    }
}

/**
 * Generate an outline/structure for long-form content
 * This breaks down a complex request into manageable sections
 */
export async function generateOutline(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
    }
): Promise<Array<{ title: string; description: string; estimatedLength: number }>> {
    if (!rateLimiter.canMakeRequest()) {
        throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
        const model = getModel(options?.model);
        rateLimiter.recordRequest();

        const outlinePrompt = `Analyze this content request and create a detailed outline with sections.

User Request: ${prompt}

Create a structured outline that breaks this into logical sections. For each section, provide:
1. A clear title
2. A brief description of what it should cover
3. Estimated minimum word count (be generous - aim for detailed, comprehensive content)

Return ONLY a JSON array in this exact format (no markdown, no code blocks, just the JSON):
[
  {
    "title": "Section Title",
    "description": "What this section covers",
    "estimatedLength": 800
  }
]

IMPORTANT:
- Create 5-10 sections for comprehensive coverage
- Each section should be substantial (minimum 500 words each)
- Estimated lengths should sum to at least 5000 words for detailed content
- Be specific with descriptions to guide content generation`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: outlinePrompt }] }],
            generationConfig: {
                temperature: options?.temperature ?? 0.3, // Lower temperature for structured output
                maxOutputTokens: 2048,
            },
        });

        const text = result.response.text();

        // Extract JSON from response (handle cases where AI adds markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
            // Remove markdown code block markers
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }

        const outline = JSON.parse(jsonText);

        if (!Array.isArray(outline) || outline.length === 0) {
            throw new Error("Invalid outline format received");
        }

        console.log(`[Gemini] Generated outline with ${outline.length} sections`);

        return outline;
    } catch (error: any) {
        console.error("Gemini outline generation error:", error);
        throw new Error(error.message || "Failed to generate outline");
    }
}

/**
 * Generate long-form content by breaking it into chunks/sections
 * This prevents AI from compacting content to fit in one response
 */
export async function* generateLongContentInChunks(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxContinuations?: number;
    }
): AsyncGenerator<{ type: 'outline' | 'section_start' | 'chunk' | 'section_done' | 'all_done' | 'status'; data: any }, void, unknown> {
    try {
        // Step 1: Generate outline
        yield {
            type: 'status',
            data: { status: 'generating_outline', message: 'Analyzing request and creating outline...' }
        };

        const outline = await generateOutline(prompt, {
            model: options?.model,
            temperature: options?.temperature,
        });

        yield {
            type: 'outline',
            data: { sections: outline }
        };

        // Step 2: Generate each section
        const totalSections = outline.length;

        for (let i = 0; i < outline.length; i++) {
            const section = outline[i];

            yield {
                type: 'section_start',
                data: {
                    section: {
                        title: section.title,
                        description: section.description,
                        index: i,
                        total: totalSections,
                    }
                }
            };

            // Create focused prompt for this section
            const sectionPrompt = `Original request: ${prompt}

You are writing section ${i + 1}/${totalSections} of a comprehensive document.

OUTLINE CONTEXT (for reference only):
${outline.map((s, idx) => `${idx + 1}. ${s.title}${idx === i ? ' ← YOU ARE WRITING THIS SECTION' : ''}`).join('\n')}

CURRENT SECTION TO WRITE:
Title: ${section.title}
Description: ${section.description}
Target length: AT LEAST ${section.estimatedLength} words

CRITICAL INSTRUCTIONS:
- Write ONLY this section ("${section.title}"), nothing else
- Write in COMPLETE detail - do NOT summarize or abbreviate
- This section must be AT LEAST ${section.estimatedLength} words
- Use proper markdown formatting (headings, lists, paragraphs, bold, italic)
- Start with a heading: ## ${section.title}
- ${i === 0 ? 'This is the first section - provide a strong introduction' : 'Continue naturally from the previous sections (context is implied)'}
- Write comprehensive, detailed content with examples where relevant
- Do NOT write other sections or summarize - focus ONLY on "${section.title}"

Begin writing this section now:`;

            // Stream this section with continuation support
            let sectionContent = "";

            for await (const event of generateTextStreamWithContinuation(sectionPrompt, {
                model: options?.model,
                temperature: options?.temperature ?? 0.7,
                maxContinuations: options?.maxContinuations ?? 3,
            })) {
                if (event.type === 'chunk') {
                    sectionContent += event.data.chunk;
                    yield {
                        type: 'chunk',
                        data: { chunk: event.data.chunk }
                    };
                } else if (event.type === 'status') {
                    // Pass through continuation status
                    yield event;
                }
            }

            yield {
                type: 'section_done',
                data: {
                    section: {
                        title: section.title,
                        index: i,
                        total: totalSections,
                        contentLength: sectionContent.length,
                    }
                }
            };

            // Small delay between sections
            if (i < outline.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Step 3: All done
        yield {
            type: 'all_done',
            data: {
                totalSections,
                message: 'All sections completed successfully'
            }
        };

    } catch (error: any) {
        console.error("Gemini chunk generation error:", error);
        throw new Error(error.message || "Failed to generate content in chunks");
    }
}


