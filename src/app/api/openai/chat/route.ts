import OpenAI from "openai";
import { StreamingTextResponse } from "ai";
import { NextResponse } from "next/server";

// Initialize OpenAI with a dummy key for build time
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build'
});

export async function POST(req: Request) {
  // Check for API key at runtime
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      stream: true,
    });

    // Convert the response to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
