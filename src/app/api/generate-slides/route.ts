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
    const prompt = `Create 3 DIFFERENT consulting slides analyzing the same data. Each slide must have a completely different approach and insight:

Title: ${title}
Data: ${rawData}
Key Insight: ${soWhat}
Source: ${source || 'Internal Analysis'}

Requirements for EACH slide:
1. Action Title: Complete sentence with key insight (1-2 lines)
2. Subtitle: Data supporting the title (1 line)
3. Visualization: Left-aligned, NO pie charts, clear labels/units
4. Key Points: 3-5 right-aligned bullet points supporting title
5. Footer: Source, disclaimers, date

IMPORTANT: Each slide must:
- Focus on a different aspect of the data
- Use a different type of visualization
- Draw different conclusions
- Target different stakeholder perspectives

JSON Response Format:
{
  "variations": [
    {
      "variationName": "string (e.g., 'Trend Analysis', 'Comparative View', 'Impact Assessment')",
      "targetAudience": "string (e.g., 'Executive Leadership', 'Operations Team', 'Stakeholders')",
      "slide": {
        "actionTitle": "string",
        "subtitle": "string",
        "visualization": {
          "type": "string",
          "description": "string",
          "emphasis": ["string"],
          "layout": "string"
        },
        "keyPoints": [{"point": "string", "emphasis": boolean}],
        "footer": {
          "source": "string",
          "disclaimers": ["string"],
          "date": "string"
        }
      }
    }
  ],
  "exportOptions": ["PDF", "PNG", "PPTX"]
}`;

    console.log("Sending prompt to Replicate");

    try {
      // Call Replicate with optimized parameters for faster generation
      const output = await replicate.run(
        // Using a smaller but faster model
        "meta/llama-2-13b-chat:f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d",
        {
          input: {
            prompt,
            max_length: 2000, // Increased for multiple variations
            temperature: 0.8, // Increased for more variety
            top_p: 0.9,
            repetition_penalty: 1.2, // Increased to avoid similar outputs
            top_k: 50,
            presence_penalty: 0.2, // Increased to encourage diversity
            frequency_penalty: 0.2,
            system_prompt: "You are an expert management consultant who creates diverse and insightful PowerPoint slides following McKinsey and BCG best practices. Generate distinct analytical approaches for the same data. Your responses should be in valid JSON format.",
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
        if (!slideContent.variations || !Array.isArray(slideContent.variations) || slideContent.variations.length !== 3) {
          throw new Error("Response must contain exactly 3 slide variations");
        }

        // Validate each variation
        slideContent.variations.forEach((variation: { variationName: string; targetAudience: string; slide: any }, index: number) => {
          if (!variation.variationName || !variation.targetAudience || !variation.slide) {
            throw new Error(`Missing required fields in variation ${index + 1}`);
          }
        });

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