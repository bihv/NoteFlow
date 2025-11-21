import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "edge";

export const alt = "Shared Document";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
    const { shareId } = await params;
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    try {
        const document = await convex.query(api.documents.getSharedDocument, {
            shareUrl: shareId,
        });

        if (!document) {
            return new ImageResponse(
                (
                    <div
                        style={{
                            fontSize: 48,
                            background: "white",
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                        }}
                    >
                        <div style={{ fontSize: 64, fontWeight: "bold", marginBottom: 20 }}>
                            Nova
                        </div>
                        <div>Document not found</div>
                    </div>
                ),
                { ...size }
            );
        }

        // If cover image exists, use it
        if (document.coverImage) {
            return new ImageResponse(
                (
                    <div
                        style={{
                            display: "flex",
                            width: "100%",
                            height: "100%",
                            position: "relative",
                        }}
                    >
                        <img
                            src={document.coverImage}
                            alt={document.title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                                padding: "40px",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {document.icon && (
                                <div style={{ fontSize: 60, marginBottom: 20 }}>
                                    {document.icon}
                                </div>
                            )}
                            <div
                                style={{
                                    fontSize: 60,
                                    fontWeight: "bold",
                                    color: "white",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {document.title}
                            </div>
                            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.8)", marginTop: 10 }}>
                                Nova
                            </div>
                        </div>
                    </div>
                ),
                { ...size }
            );
        }

        // Fallback template
        return new ImageResponse(
            (
                <div
                    style={{
                        background: "linear-gradient(to bottom right, #EEF2FF, #E0E7FF)",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "80px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 40,
                        }}
                    >
                        {document.icon ? (
                            <div style={{ fontSize: 100 }}>{document.icon}</div>
                        ) : (
                            <div
                                style={{
                                    width: 100,
                                    height: 100,
                                    background: "linear-gradient(to right, #2563EB, #4F46E5)",
                                    borderRadius: 20,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: 60,
                                    fontWeight: "bold",
                                }}
                            >
                                N
                            </div>
                        )}
                    </div>
                    <div
                        style={{
                            fontSize: 70,
                            fontWeight: "bold",
                            color: "#1F2937",
                            textAlign: "center",
                            marginBottom: 20,
                            lineHeight: 1.2,
                        }}
                    >
                        {document.title}
                    </div>
                    <div
                        style={{
                            fontSize: 30,
                            color: "#4B5563",
                            background: "rgba(255,255,255,0.5)",
                            padding: "10px 30px",
                            borderRadius: 50,
                        }}
                    >
                        Nova - Knowledge Management
                    </div>
                </div>
            ),
            { ...size }
        );
    } catch (e) {
        console.error(e);
        return new ImageResponse(
            (
                <div
                    style={{
                        fontSize: 48,
                        background: "white",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    Failed to generate image
                </div>
            ),
            { ...size }
        );
    }
}
