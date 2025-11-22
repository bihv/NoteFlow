import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypePrism from "rehype-prism-plus";

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypePrism]}
                components={{
                    // Custom rendering for code blocks
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline ? (
                            <pre className={`${className} rounded-lg bg-zinc-900! dark:bg-zinc-950! p-4 overflow-x-auto`}>
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code
                                className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 font-mono text-xs"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Custom rendering for links
                    a({ node, children, ...props }: any) {
                        return (
                            <a
                                {...props}
                                className="text-purple-600 dark:text-purple-400 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {children}
                            </a>
                        );
                    },
                    // Custom rendering for blockquotes
                    blockquote({ node, children, ...props }: any) {
                        return (
                            <blockquote
                                className="border-l-4 border-purple-500 pl-4 italic text-muted-foreground"
                                {...props}
                            >
                                {children}
                            </blockquote>
                        );
                    },
                    // Tables
                    table({ node, children, ...props }: any) {
                        return (
                            <div className="overflow-x-auto">
                                <table className="border-collapse border border-border w-full" {...props}>
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    th({ node, children, ...props }: any) {
                        return (
                            <th className="border border-border px-4 py-2 bg-muted font-semibold" {...props}>
                                {children}
                            </th>
                        );
                    },
                    td({ node, children, ...props }: any) {
                        return (
                            <td className="border border-border px-4 py-2" {...props}>
                                {children}
                            </td>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
