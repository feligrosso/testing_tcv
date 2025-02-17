import { NextResponse } from "next/server";
import { createSlideGenerationService } from '@/lib/services/SlideGenerationService';

// Add runtime environment diagnostics
console.log('Route Module Environment:', {
  runtime: process.env.NEXT_RUNTIME,
  isEdge: process.env.NEXT_RUNTIME === 'edge',
  hasNodeCrypto: typeof process !== 'undefined' && !!process.versions?.node,
  hasWebCrypto: typeof crypto !== 'undefined',
  timestamp: new Date().toISOString()
});

// Configure for optimized Node.js runtime with explicit settings
export const runtime = 'edge';
export const preferredRegion = 'iad1';
export const dynamic = 'force-dynamic';

// Remove maxDuration as it's not needed for edge runtime
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  cache: 'no-store'
};

// Enhanced diagnostic logging with production checks
console.log('Route Module Configuration:', {
  runtime,
  dynamic,
  preferredRegion,
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
  isVercel: process.env.VERCEL === '1',
  vercelEnv: process.env.VERCEL_ENV,
  region: process.env.VERCEL_REGION,
  buildTime: {
    timestamp: new Date().toISOString(),
    buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    deploymentUrl: process.env.VERCEL_URL || 'unknown',
    deploymentRegion: preferredRegion,
  }
});

// Add performance tracking
const performanceMetrics: { [key: string]: number } = {};
const operationStack: string[] = [];

function startOperation(name: string) {
  operationStack.push(name);
  performanceMetrics[`${name}_start`] = Date.now();
  console.log(`Starting Operation: ${name}`, {
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    operationStack: [...operationStack],
    region: process.env.VERCEL_REGION || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown'
  });
}

function endOperation(name: string) {
  const start = performanceMetrics[`${name}_start`];
  const duration = Date.now() - start;
  performanceMetrics[`${name}_duration`] = duration;
  
  const stackIndex = operationStack.lastIndexOf(name);
  if (stackIndex !== -1) {
    operationStack.splice(stackIndex, 1);
  }

  console.log(`Operation Complete - ${name}:`, {
    durationMs: duration,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    remainingOperations: [...operationStack],
    region: process.env.VERCEL_REGION || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown'
  });

  // Alert on long operations
  if (duration > 5000) { // 5 seconds threshold
    console.warn(`Long Operation Detected - ${name}:`, {
      durationMs: duration,
      timestamp: new Date().toISOString(),
      operationStack: [...operationStack],
      region: process.env.VERCEL_REGION || 'unknown'
    });
  }
}

// Enhanced environment validation
function validateEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const runtimeEnv = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    isVercel: !!process.env.VERCEL,
    runtime: runtime,
    experimentalServerActions: process.env.NEXT_EXPERIMENTAL_SERVER_ACTIONS,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    resourceLimits: process.resourceUsage()
  };
  
  console.log('Extended Environment Check:', runtimeEnv);

  if (!apiKey) {
    console.error('API Key Validation Failed:', {
      ...runtimeEnv,
      error: 'OpenAI API key is not configured'
    });
    throw new Error('OpenAI API key is not configured');
  }

  // Additional production checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.VERCEL) {
      console.warn('Production environment detected but not running on Vercel');
    }
    if (process.env.VERCEL_ENV !== 'production') {
      console.warn('Vercel environment mismatch:', {
        expectedEnv: 'production',
        actualEnv: process.env.VERCEL_ENV
      });
    }
  }

  return apiKey;
}

// Add timeout handling with improved error messages
const TIMEOUT_DURATION = 25000; // 25 seconds to allow for cleanup and response handling

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

// Add response logging middleware
const logResponse = (response: Response) => {
  console.log('Response Details:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    type: response.type,
    timestamp: new Date().toISOString()
  });
  return response;
};

// Add response headers for consistent handling
const responseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, must-revalidate'
};

// Wrap all responses in NextResponse.json with proper headers
const createErrorResponse = (message: string, status: number, type: 'error' | 'warning' = 'error') => {
  const errorResponse = NextResponse.json({
    error: true,
    message,
    errorType: type,
    title: 'Error',
    subtitle: message,
    keyPoints: [message],
    source: 'System'
  }, { 
    status,
    headers: responseHeaders
  });

  console.log('Error Response:', {
    message,
    status,
    type,
    headers: Object.fromEntries(errorResponse.headers.entries()),
    timestamp: new Date().toISOString()
  });

  return logResponse(errorResponse);
};

export async function POST(req: Request) {
  console.log('Request Started:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    runtime: runtime,
    timestamp: new Date().toISOString()
  });

  startOperation('total_request');
  
  try {
    // Parse request with error handling
    let reqData;
    try {
      const rawBody = await req.text();
      console.log('Raw Request Body:', {
        length: rawBody.length,
        preview: rawBody.slice(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      reqData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Request Parsing Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('Invalid JSON in request body', 400, 'error');
    }

    // Validate environment variables first
    let apiKey: string;
    startOperation('env_validation');
    try {
      apiKey = validateEnv();
      console.log('Environment validated successfully');
      endOperation('env_validation');
    } catch (error: any) {
      endOperation('env_validation');
      console.error('Environment validation error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('Configuration Error: OpenAI API key is missing or invalid', 503, 'error');
    }

    // Initialize slide generation service with validated API key
    startOperation('service_init');
    const slideService = createSlideGenerationService(apiKey);
    endOperation('service_init');

    const { 
      title, 
      rawData, 
      soWhat, 
      source,
      audience,
      style,
      focusArea,
      dataContext 
    } = reqData;
    
    if (!rawData) {
      return createErrorResponse('No data provided for analysis', 400, 'error');
    }

    // Validate data size
    const dataSize = new TextEncoder().encode(rawData).length;
    const maxSize = 100000; // 100KB limit
    if (dataSize > maxSize) {
      return createErrorResponse('Data size exceeds limit. Please reduce the amount of data.', 413, 'warning');
    }

    try {
      const result = await slideService.generateSlide({
        title,
        rawData,
        soWhat,
        source,
        audience,
        style,
        focusArea,
        dataContext
      });

      // Before returning success response
      const successResponse = NextResponse.json(result, { headers: responseHeaders });
      console.log('Success Response:', {
        status: successResponse.status,
        headers: Object.fromEntries(successResponse.headers.entries()),
        resultPreview: JSON.stringify(result).slice(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      return logResponse(successResponse);

    } catch (error: any) {
      console.error('Slide generation error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (error.message === 'Operation timed out' || error.name === 'AbortError') {
        return createErrorResponse('The request took too long to process', 408, 'warning');
      }

      let status = error.status || 500;
      let message = error.message || 'An unexpected error occurred';
      let errorType: 'error' | 'warning' = 'error';

      if (error.code === 'insufficient_quota') {
        status = 429;
        message = 'API quota exceeded. Please try again later.';
        errorType = 'warning';
      } else if (error.code === 'context_length_exceeded') {
        status = 400;
        message = 'Input data is too long. Please provide a shorter dataset.';
        errorType = 'warning';
      }

      return createErrorResponse(message, status, errorType);
    }
  } catch (error: any) {
    console.error('Unexpected error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return createErrorResponse('An unexpected error occurred', 500, 'error');
  }
}