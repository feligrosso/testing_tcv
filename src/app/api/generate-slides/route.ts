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
  // Log environment details
  console.log('Environment Check:', {
    nodeEnv: process.env.NODE_ENV,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length,
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });

  console.log('API Request Started:', {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request
    const reqData = await req.json();

    // Validate OpenAI API key with more detailed error
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const error = {
        error: true,
        message: 'OpenAI API key not configured',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: process.env.VERCEL === '1',
          vercelEnv: process.env.VERCEL_ENV
        }
      };
      console.error('API Key Missing:', error);
      return NextResponse.json(error, { 
        status: 500,
        headers: responseHeaders
      });
    }

    // Log successful API key validation
    console.log('API Key Validated:', {
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 7),
      timestamp: new Date().toISOString()
    });

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
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL === '1',
        vercelEnv: process.env.VERCEL_ENV
      }
    });

    return NextResponse.json({
      error: true,
      message: error.message || 'An unexpected error occurred',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL === '1',
        vercelEnv: process.env.VERCEL_ENV
      }
    }, { 
      status: 500,
      headers: responseHeaders
    });
  }
}