import { NextResponse } from "next/server";
import { createSlideGenerationService } from '@/lib/services/SlideGenerationService';

// Switch to standard serverless runtime
export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Add response headers for consistent handling
const responseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, must-revalidate'
};

export async function POST(req: Request) {
  console.log('API Request Started:', {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request
    const reqData = await req.json();

    // Validate OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('API Key Missing');
      return NextResponse.json({
        error: true,
        message: 'OpenAI API key not configured',
      }, { 
        status: 500,
        headers: responseHeaders
      });
    }

    // Initialize service and generate slide
    const slideService = createSlideGenerationService(apiKey);
    const result = await slideService.generateSlide({
      title: reqData.title,
      rawData: reqData.rawData,
      soWhat: reqData.soWhat,
      source: reqData.source,
      audience: reqData.audience,
      style: reqData.style,
      focusArea: reqData.focusArea,
      dataContext: reqData.dataContext
    });

    // Return simple JSON response
    return NextResponse.json(result, { 
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: true,
      message: error.message || 'An unexpected error occurred',
    }, { 
      status: 500,
      headers: responseHeaders
    });
  }
}