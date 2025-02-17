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
  console.log('Environment Variables Available:', {
    envKeys: Object.keys(process.env),
    envCount: Object.keys(process.env).length,
    timestamp: new Date().toISOString()
  });

  const methods = {
    direct: process.env.OPENAI_API_KEY,
    processEnv: process?.env?.OPENAI_API_KEY,
    windowEnv: typeof window !== 'undefined' ? (window as any).env?.OPENAI_API_KEY : undefined,
  };

  // Log detailed information about each method
  console.log('API Key Access Attempts:', {
    direct: {
      exists: !!methods.direct,
      type: typeof methods.direct,
      length: methods.direct?.length,
      prefix: methods.direct?.substring(0, 7)
    },
    processEnv: {
      exists: !!methods.processEnv,
      type: typeof methods.processEnv,
      length: methods.processEnv?.length,
      prefix: methods.processEnv?.substring(0, 7)
    },
    windowEnv: {
      exists: !!methods.windowEnv,
      type: typeof methods.windowEnv,
      length: methods.windowEnv?.length,
      prefix: methods.windowEnv?.substring(0, 7)
    },
    timestamp: new Date().toISOString()
  });

  // Try each method in sequence and log which one worked
  const key = methods.direct || methods.processEnv || methods.windowEnv;
  
  if (key) {
    console.log('API Key Found:', {
      method: methods.direct ? 'direct' : methods.processEnv ? 'processEnv' : 'windowEnv',
      length: key.length,
      prefix: key.substring(0, 7),
      timestamp: new Date().toISOString()
    });
  } else {
    console.error('No API Key Found:', {
      envVarsAvailable: Object.keys(process.env).length > 0,
      nodeEnv: process.env.NODE_ENV,
      isVercel: process.env.VERCEL === '1',
      timestamp: new Date().toISOString()
    });
  }

  return key;
}

export async function POST(req: Request) {
  // Log environment state at the start of the request
  console.log('Request Environment State:', {
    nodeEnv: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });

  console.log('API Request Started:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request first to validate it's properly formatted
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
          envCount: Object.keys(process.env).length,
          hasEnvVars: Object.keys(process.env).length > 0,
          envVarNames: Object.keys(process.env).filter(key => !key.toLowerCase().includes('key')),
        }
      };
      console.error('API Key Missing:', error);
      return NextResponse.json(error, { 
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