import { NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(req: Request) {
  try {
    // Check for API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("Replicate API token is missing");
      return NextResponse.json(
        {
          error: "Replicate API token not configured",
          message: "Please set up your Replicate API token in the environment variables.",
        },
        { status: 400 }
      );
    }

    // Initialize Replicate with API token
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const body = await req.json();
    console.log("Received request body:", body);

    const { title, rawData, soWhat, source } = body;

    // Validate required fields
    if (!title || !rawData || !soWhat) {
      console.error("Missing required fields:", { title, rawData, soWhat });
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Please provide title, raw data, and 'So What?' insight.",
        },
        { status: 400 }
      );
    }

    // Construct the prompt for slide generation
    const prompt = `Create a professional PowerPoint slide based on the following information:

Title: ${title}

Raw Data:
${rawData}

Key Insight ("So What?"):
${soWhat}

Source: ${source || 'Internal Analysis'}

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

    console.log("Sending prompt to Replicate");

    try {
      // Call Replicate with a different model that's better suited for text generation
      const output = await replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt,
            max_length: 1024,
            temperature: 0.7,
            top_p: 0.8,
            repetition_penalty: 1,
            system_prompt: "You are an expert consultant who creates professional PowerPoint slides. Your responses should be in valid JSON format.",
          },
        }
      );

      console.log("Raw Replicate response:", output);

      // Parse the response and ensure it's valid JSON
      let slideContent;
      try {
        // Handle different output formats
        let jsonStr = '';
        if (Array.isArray(output)) {
          // If output is an array of strings, join them
          jsonStr = output.join('');
        } else if (typeof output === 'string') {
          jsonStr = output;
        } else {
          jsonStr = JSON.stringify(output);
        }

        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        console.log("Attempting to parse JSON:", jsonStr);
        
        slideContent = JSON.parse(jsonStr);
        
        // Validate the required fields in the response
        if (!slideContent.title || !slideContent.visualization || !slideContent.key_points || !slideContent.so_what) {
          throw new Error("Missing required fields in the model's response");
        }

        return NextResponse.json(slideContent);
      } catch (error) {
        console.error("Error parsing model output:", error);
        console.error("Raw output type:", typeof output);
        console.error("Raw output value:", output);
        
        return NextResponse.json(
          {
            error: "Invalid response format",
            message: "The model did not return properly formatted JSON. Please try again.",
            details: {
              error: error instanceof Error ? error.message : "Unknown parsing error",
              rawOutput: output,
            }
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error calling Replicate:", error);
      return NextResponse.json(
        {
          error: "Replicate API error",
          message: error instanceof Error ? error.message : "Failed to generate slide content",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
          }
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate-slides API:", error);
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while processing your request.",
        details: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }
      },
      { status: 500 }
    );
  }
} 