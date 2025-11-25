/**
 * Test script for chunk-based content generation
 * 
 * This tests the new generateLongContentInChunks function 
 * by making an API request with mode="chunks"
 */

async function testChunkGeneration() {
    console.log("🧪 Testing chunk-based generation...\n");

    try {
        const response = await fetch("http://localhost:3000/api/ai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Note: In production, you'll need a valid session
                // For testing, bypass auth temporarily or test with a valid session
            },
            body: JSON.stringify({
                message: "Write a comprehensive business plan for a new coffee shop",
                mode: "chunks", // Use chunk-based generation
            }),
        });

        if (!response.ok) {
            console.error("❌ Request failed:", response.status, response.statusText);
            const error = await response.json();
            console.error("Error:", error);
            return;
        }

        console.log("✅ Connected to stream\n");

        // Parse Server-Sent Events
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        let outlineSections = [];
        let currentSection = null;
        let totalChars = 0;

        while (true) {
            const { done, value } = await reader?.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim() || line === "data: [DONE]") continue;
                if (!line.startsWith("data: ")) continue;

                const data = JSON.parse(line.slice(6));

                // Handle different event types
                if (data.status === "generating_outline") {
                    console.log("📋 Generating outline...");
                } else if (data.sections) {
                    // Outline received
                    outlineSections = data.sections;
                    console.log(`📝 Outline created with ${outlineSections.length} sections:`);
                    outlineSections.forEach((s, i) => {
                        console.log(`   ${i + 1}. ${s.title} (~${s.estimatedLength} words)`);
                    });
                    console.log("");
                } else if (data.section && currentSection?.title !== data.section.title) {
                    // Section start
                    currentSection = data.section;
                    console.log(`\n▶️  Writing section ${data.section.index + 1}/${data.section.total}: "${data.section.title}"...`);
                } else if (data.chunk) {
                    // Content chunk
                    process.stdout.write(".");
                    totalChars += data.chunk.length;
                } else if (data.section && data.contentLength !== undefined) {
                    // Section done
                    console.log(` ✓ (${data.contentLength} chars)`);
                } else if (data.status === "continuing") {
                    console.log(`   ↻ Continuing (${data.continuationCount})...`);
                } else if (data.totalSections !== undefined) {
                    // All done
                    console.log(`\n✨ Generation complete!`);
                    console.log(`   Total sections: ${data.totalSections}`);
                    console.log(`   Total characters: ${totalChars}`);
                }
            }
        }

        console.log("\n✅ Test completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

// Run the test
testChunkGeneration();
