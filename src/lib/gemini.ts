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
 * Generate streaming text with Gemini API
 * Returns an async generator that yields text chunks
 */
export async function* generateTextStream(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }
): AsyncGenerator<string, void, unknown> {
    if (!rateLimiter.canMakeRequest()) {
        throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
        const model = getModel(options?.model);
        rateLimiter.recordRequest();

        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxOutputTokens ?? 8192,
            },
        });

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }
    } catch (error: any) {
        console.error("Gemini API streaming error:", error);

        if (error.message?.includes("RATE_LIMIT")) {
            throw new Error("API rate limit exceeded. Please try again in a moment.");
        }

        throw new Error(error.message || "Failed to generate streaming text");
    }
}

/**
 * Enhanced streaming with automatic continuation for long responses
 * Automatically detects when response hits token limit and continues
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
    const maxContinuations = options?.maxContinuations ?? 5;
    const originalPrompt = prompt; // Preserve original request
    let continuationCount = 0;
    let accumulatedText = "";

    while (continuationCount <= maxContinuations) {
        if (!rateLimiter.canMakeRequest()) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }

        try {
            const model = getModel(options?.model);
            rateLimiter.recordRequest();

            // Build prompt based on whether this is first request or continuation
            let currentPrompt: string;
            if (continuationCount === 0) {
                // First request: use original prompt
                currentPrompt = originalPrompt;
            } else {
                // Continuation: include original request + what we've generated so far
                // Try to find a natural break point to avoid cutting mid-structure
                let contextLength = Math.min(accumulatedText.length, 3000);
                let contextStart = accumulatedText.length - contextLength;

                // Try to find a paragraph break (double newline) near the start
                const searchStart = Math.max(0, contextStart - 200);
                const searchEnd = Math.min(accumulatedText.length, contextStart + 200);
                const searchRegion = accumulatedText.substring(searchStart, searchEnd);
                const paragraphBreak = searchRegion.lastIndexOf('\n\n');

                if (paragraphBreak !== -1) {
                    contextStart = searchStart + paragraphBreak + 2;
                }

                const recentContext = accumulatedText.substring(contextStart);

                currentPrompt = `${originalPrompt}

[CONTINUATION REQUEST - The previous response was cut off due to length limits. Continue from where it ended.]

Already generated content (showing last ~${recentContext.length} characters):
${recentContext}

IMPORTANT INSTRUCTIONS:
- Continue writing naturally from where the text ended above
- Do NOT restart or repeat what was already written
- Do NOT generate placeholder content (like repeated dashes, empty lines, etc.)
- If you were in the middle of a table, complete it properly with actual content
- If you were in the middle of a list, continue with actual items
- Just provide the next meaningful content`;
            }

            const result = await model.generateContentStream({
                contents: [{ role: "user", parts: [{ text: currentPrompt }] }],
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxOutputTokens ?? 8192,
                },
            });

            let chunkText = "";
            let finishReason: string | null = null;
            let usageMetadata: any = null;

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    chunkText += text;
                    accumulatedText += text;
                    yield { type: 'chunk', data: { chunk: text } };
                }

                // Track finish reason and usage metadata from candidates
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
                // Notify that we're continuing
                yield {
                    type: 'status',
                    data: {
                        status: 'continuing',
                        continuationCount: continuationCount + 1,
                        tokens: usageMetadata?.totalTokenCount || null,
                        chars: accumulatedText.length,
                    }
                };

                continuationCount++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // Done!
                yield {
                    type: 'status',
                    data: {
                        status: 'done',
                        tokens: usageMetadata?.totalTokenCount || null,
                        chars: accumulatedText.length,
                        continuations: continuationCount,
                        finishReason,
                    }
                };
                break;
            }
        } catch (error: any) {
            console.error("Gemini API streaming error:", error);

            if (error.message?.includes("RATE_LIMIT")) {
                throw new Error("API rate limit exceeded. Please try again in a moment.");
            }

            throw new Error(error.message || "Failed to generate streaming text");
        }
    }

    // If we hit max continuations, warn the user
    if (continuationCount >= maxContinuations) {
        yield {
            type: 'status',
            data: {
                status: 'max_continuations_reached',
                message: 'Response reached maximum continuation limit. Some content may be truncated.',
            }
        };
    }
}

/**
 * Enhanced chat streaming with automatic continuation
 */
export async function* chatStreamWithContinuation(
    messages: Array<{ role: "user" | "model"; text: string }>,
    options?: {
        model?: string;
        temperature?: number;
        maxContinuations?: number;
    }
): AsyncGenerator<{ type: 'chunk' | 'status'; data: any }, void, unknown> {
    const maxContinuations = options?.maxContinuations ?? 5;
    let continuationCount = 0;
    let currentAccumulatedText = "";
    let totalAccumulatedText = "";

    // Work with a mutable copy of messages
    const workingMessages = [...messages];

    while (continuationCount <= maxContinuations) {
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
                const text = chunk.text();
                if (text) {
                    currentAccumulatedText += text;
                    totalAccumulatedText += text;
                    yield { type: 'chunk', data: { chunk: text } };
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

                // Add continuation request
                workingMessages.push({
                    role: "user",
                    text: "Continue from where you just left off. Keep writing naturally without repeating what you already wrote.",
                });

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
 * Chat with context (multi-turn conversation)
 */
export async function chat(
    messages: Array<{ role: "user" | "model"; text: string }>,
    options?: {
        model?: string;
        temperature?: number;
    }
): Promise<string> {
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
            history: messages.slice(0, -1).map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.text }],
            })),
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.text);
        return result.response.text();
    } catch (error: any) {
        console.error("Gemini chat error:", error);
        throw new Error(error.message || "Failed to chat with Gemini API");
    }
}

/**
 * Chat with streaming response
 */
export async function* chatStream(
    messages: Array<{ role: "user" | "model"; text: string }>,
    options?: {
        model?: string;
        temperature?: number;
    }
): AsyncGenerator<string, void, unknown> {
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
            history: messages.slice(0, -1).map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.text }],
            })),
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessageStream(lastMessage.text);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }
    } catch (error: any) {
        console.error("Gemini chat stream error:", error);
        throw new Error(error.message || "Failed to stream chat response");
    }
}

/**
 * Get rate limiter statistics
 */
export function getRateLimitStats() {
    return rateLimiter.getStats();
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
    return !!genAI;
}
