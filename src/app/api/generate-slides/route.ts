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
  // Log all environment variables (excluding sensitive values)
  const envVars = Object.keys(process.env).sort();
  console.log('All Environment Variables:', {
    count: envVars.length,
    names: envVars.filter(key => !key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret')),
    hasOpenAIKey: envVars.includes('OPENAI_API_KEY'),
    timestamp: new Date().toISOString()
  });

  // Get the key directly
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    console.error('OpenAI API Key Missing:', {
      envVarsAvailable: envVars.length > 0,
      nodeEnv: process.env.NODE_ENV,
      isVercel: process.env.VERCEL === '1',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  // Log key details (safely)
  console.log('OpenAI API Key Details:', {
    length: key.length,
    prefix: key.substring(0, 7),
    format: {
      isProjectKey: key.startsWith('sk-proj-'),
      isStandardKey: key.startsWith('sk-') && !key.startsWith('sk-proj-'),
    },
    timestamp: new Date().toISOString()
  });

  return key;
}

export async function POST(req: Request) {
  console.log('Starting Request Processing:', {
    nodeEnv: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request first to validate it's properly formatted
    const reqData = await req.json();

    // Get API key
    const apiKey = getOpenAIKey();
    
    if (!apiKey) {
      const error = {
        error: true,
        message: 'OpenAI API key not configured',
        debug: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: process.env.VERCEL === '1',
          vercelEnv: process.env.VERCEL_ENV,
          envVarsCount: Object.keys(process.env).length,
          hasEnvVars: Object.keys(process.env).length > 0,
          envVarNames: Object.keys(process.env)
            .filter(key => !key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret')),
        }
      };
      console.error('API Key Missing:', error);
      return NextResponse.json(error, { 
        status: 500,
        headers: responseHeaders
      });
    }

    // Initialize service and generate slide
    try {
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

      return NextResponse.json(result, { 
        status: 200,
        headers: responseHeaders
      });
    } catch (serviceError: any) {
      console.error('Slide Service Error:', {
        error: serviceError.message,
        type: serviceError.type,
        status: serviceError.status,
        code: serviceError.code,
        timestamp: new Date().toISOString()
      });

      // Handle specific error cases
      if (serviceError.message?.includes('401')) {
        return NextResponse.json({
          error: true,
          message: 'Invalid API key format or unauthorized access',
          debug: {
            errorType: '401_Unauthorized',
            keyPrefix: apiKey.substring(0, 7),
            keyLength: apiKey.length,
            isProjectKey: apiKey.startsWith('sk-proj-')
          }
        }, { 
          status: 401,
          headers: responseHeaders
        });
      }

      throw serviceError; // Re-throw for general error handling
    }
  } catch (error: any) {
    console.error('General API Error:', {
      message: error.message,
      type: error.type,
      status: error.status,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: true,
      message: error.message || 'An unexpected error occurred',
      debug: {
        errorType: error.type || 'unknown',
        status: error.status,
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL === '1',
        vercelEnv: process.env.VERCEL_ENV
      }
    }, { 
      status: error.status || 500,
      headers: responseHeaders
    });
  }
}