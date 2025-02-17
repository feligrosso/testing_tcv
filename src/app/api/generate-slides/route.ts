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

// Try different ways to access environment variables
function getOpenAIKey() {
  const methods = {
    direct: process.env.OPENAI_API_KEY,
    processEnv: process?.env?.OPENAI_API_KEY,
    windowEnv: typeof window !== 'undefined' ? (window as any).env?.OPENAI_API_KEY : undefined,
  };

  console.log('API Key Access Methods:', {
    directExists: !!methods.direct,
    processEnvExists: !!methods.processEnv,
    windowEnvExists: !!methods.windowEnv,
    timestamp: new Date().toISOString()
  });

  return methods.direct || methods.processEnv || methods.windowEnv;
}

export async function POST(req: Request) {
  // Log all environment variables (excluding sensitive values)
  console.log('Full Environment Check:', {
    envKeys: Object.keys(process.env),
    envKeyCount: Object.keys(process.env).length,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyType: typeof process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    vercelRegion: process.env.VERCEL_REGION,
    vercelURL: process.env.VERCEL_URL,
    timestamp: new Date().toISOString()
  });

  console.log('API Request Started:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request
    const reqData = await req.json();

    // Try to get API key using multiple methods
    const apiKey = getOpenAIKey();
    
    if (!apiKey) {
      const error = {
        error: true,
        message: 'OpenAI API key not configured',
        debug: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: process.env.VERCEL === '1',
          vercelEnv: process.env.VERCEL_ENV,
          envKeys: Object.keys(process.env),
          processEnvType: typeof process.env,
          apiKeyType: typeof process.env.OPENAI_API_KEY,
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
      keyType: typeof apiKey,
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
      debug: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL === '1',
        vercelEnv: process.env.VERCEL_ENV,
        envKeys: Object.keys(process.env),
        processEnvType: typeof process.env,
        apiKeyType: typeof process.env.OPENAI_API_KEY,
      }
    });

    return NextResponse.json({
      error: true,
      message: error.message || 'An unexpected error occurred',
      debug: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL === '1',
        vercelEnv: process.env.VERCEL_ENV,
        envKeyCount: Object.keys(process.env).length
      }
    }, { 
      status: 500,
      headers: responseHeaders
    });
  }
}