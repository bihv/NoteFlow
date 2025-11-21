/**
 * Client-side wrapper for /api/ai/generate with SSE streaming support
 */

export type GenerationType = 'expand' | 'improve' | 'continue' | 'outline' | 'template' | 'custom';

export interface GenerateOptions {
    context?: string;
    prompt?: string;
    templateType?: 'meeting-notes' | 'project-plan' | 'blog-post' | 'brainstorm';
    topic?: string;
    language?: 'auto' | 'vi' | 'en';
}

export interface GenerateCallbacks {
    onChunk: (text: string) => void;
    onComplete: () => void;
    onError: (error: string) => void;
}

/**
 * Generate content using AI with streaming response
 */
export async function generateContent(
    type: GenerationType,
    options: GenerateOptions,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
): Promise<void> {
    const { onChunk, onComplete, onError } = callbacks;

    try {
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type,
                ...options,
            }),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate content');
        }

        // Handle Server-Sent Events streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            // Decode chunk
            buffer += decoder.decode(value, { stream: true });

            // Process all complete SSE messages in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) {
                    continue;
                }

                const data = line.slice(6); // Remove 'data: ' prefix

                // Check for completion signal
                if (data === '[DONE]') {
                    onComplete();
                    return;
                }

                try {
                    const parsed = JSON.parse(data);

                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }

                    if (parsed.chunk) {
                        onChunk(parsed.chunk);
                    }
                } catch (parseError) {
                    console.error('Failed to parse SSE data:', data, parseError);
                }
            }
        }

        // If we exit without [DONE] signal, call complete anyway
        onComplete();

    } catch (error: any) {
        // Check if aborted
        if (error.name === 'AbortError') {
            onError('Generation cancelled');
            return;
        }

        // Handle network errors
        if (error.message?.includes('Failed to fetch')) {
            onError('Network error. Please check your connection.');
            return;
        }

        // Generic error
        onError(error.message || 'Failed to generate content');
    }
}

/**
 * Helper: Expand selected text into detailed content
 */
export function expandText(
    context: string,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
) {
    return generateContent('expand', { context }, callbacks, abortSignal);
}

/**
 * Helper: Improve writing quality
 */
export function improveText(
    context: string,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
) {
    return generateContent('improve', { context }, callbacks, abortSignal);
}

/**
 * Helper: Continue writing from context
 */
export function continueText(
    context: string,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
) {
    return generateContent('continue', { context }, callbacks, abortSignal);
}

/**
 * Helper: Create outline from topic
 */
export function createOutline(
    topic: string,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
) {
    return generateContent('outline', { prompt: topic }, callbacks, abortSignal);
}

/**
 * Helper: Generate template
 */
export function generateTemplate(
    templateType: GenerateOptions['templateType'],
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal,
    topic?: string,
    language?: 'auto' | 'vi' | 'en'
) {
    return generateContent('template', { templateType, topic, language }, callbacks, abortSignal);
}

/**
 * Helper: Custom generation with prompt
 */
export function customGenerate(
    prompt: string,
    context: string | undefined,
    callbacks: GenerateCallbacks,
    abortSignal?: AbortSignal
) {
    return generateContent('custom', { prompt, context }, callbacks, abortSignal);
}
