import { NextResponse } from "next/server";
import fs from "fs";
import OpenAI from "openai";
import path from "path";

// Switch to standard serverless runtime
export const runtime = 'nodejs';

// Initialize OpenAI with project-scoped key support
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
  defaultHeaders: {
    'OpenAI-Beta': 'all-v1'
  }
});

export async function POST(req: Request) {
  // Check for API key at runtime
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { 
        error: "OpenAI API key is not configured", 
        message: "Please set up your API key in the environment variables.",
        setup: {
          steps: [
            "Get an API key from OpenAI (https://platform.openai.com/api-keys)",
            "Add it to your environment variables",
            "Restart the application"
          ]
        }
      }, 
      { status: 400 }
    );
  }

  const body = await req.json();
  const base64Audio = body.audio;

  // Convert the base64 audio data to a Buffer
  const audio = Buffer.from(base64Audio, "base64");

  // Define the file path for storing the temporary WAV file
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const filePath = path.join(tmpDir, "input.wav");

  try {
    // Write the audio data to a temporary WAV file synchronously
    fs.writeFileSync(filePath, audio);

    // Create a readable stream from the temporary WAV file
    const readStream = fs.createReadStream(filePath);

    const data = await openai.audio.transcriptions.create({
      file: readStream,
      model: "whisper-1",
    });

    // Remove the temporary file after successful processing
    fs.unlinkSync(filePath);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing audio:", error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ 
      error: "Failed to process audio",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
