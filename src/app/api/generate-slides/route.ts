import { NextResponse } from "next/server";
import Replicate from "replicate";

// Initialize Replicate with API token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function POST(req: Request) {
  try {
    // Check for API token
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        {
          error: "Replicate API token not configured",
          message: "Please set up your Replicate API token in the environment variables.",
          setup: {
            steps: [
              "Sign up at https://replicate.com",
              "Get your API token from https://replicate.com/account",
              "Add it to your environment variables as REPLICATE_API_TOKEN",
              "Restart the application",
            ],
          },
        },
        { status: 400 }
      );
    }

    const { title, rawData, soWhat, source } = await req.json();

    // Construct the prompt for slide generation
    const prompt = `Create a professional PowerPoint slide based on the following information:

Title: ${title}

Raw Data:
${rawData}

Key Insight ("So What?"):
${soWhat}

Source: ${source}

Please structure the response in the following JSON format:
{
  "title": "Refined slide title",
  "subtitle": "Optional subtitle if needed",
  "visualization": "Detailed description of how to visualize the data",
  "key_points": ["List of key points to highlight"],
  "so_what": "Refined and impactful conclusion",
  "recommendations": ["Optional list of recommendations if applicable"]
}

Make the title concise but impactful, and ensure the visualization suggestion is specific and actionable.`;

    // Call DeepSeek through Replicate
    const output = await replicate.run(
      "deepseek-ai/deepseek-coder-33b-instruct:0383366af5a3d3c9187e9452c9f1725b8afd891f4926e0e70447674a6f57e2f8",
      {
        input: {
          prompt,
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 1024,
          presence_penalty: 0,
          frequency_penalty: 0,
        },
      }
    );

    // Parse the response and ensure it's valid JSON
    let slideContent;
    try {
      // The output might be a string containing JSON
      const jsonStr = typeof output === 'string' ? output : JSON.stringify(output);
      slideContent = JSON.parse(jsonStr);
    } catch (error) {
      console.error("Error parsing model output:", error);
      return NextResponse.json(
        {
          error: "Invalid response format",
          message: "The model did not return properly formatted JSON. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(slideContent);
  } catch (error: any) {
    console.error("Error generating slide:", error);
    return NextResponse.json(
      {
        error: "Failed to generate slide",
        message: error.message || "An unknown error occurred",
      },
      { status: 500 }
    );
  }
} 