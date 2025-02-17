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

// Configure for Edge Runtime
export const runtime = 'edge';
export const preferredRegion = 'iad1';

// Add specific response size monitoring
const MAX_RESPONSE_SIZE = 1.5 * 1024 * 1024; // 1.5MB limit for edge functions

// Add response streaming with size checks
async function createStreamingResponse(data: any) {
  const jsonString = JSON.stringify(data);
  const size = new TextEncoder().encode(jsonString).length;
  
  console.log('Response Size Check:', {
    size,
    maxSize: MAX_RESPONSE_SIZE,
    exceedsLimit: size > MAX_RESPONSE_SIZE,
    timestamp: new Date().toISOString()
  });

  if (size > MAX_RESPONSE_SIZE) {
    throw new Error(`Response size (${size} bytes) exceeds Edge function limit (${MAX_RESPONSE_SIZE} bytes)`);
  }

  // Use streaming response for better edge compatibility
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(jsonString));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
      'x-response-size': size.toString(),
    },
  });
}

// Enhanced diagnostic logging with production checks
console.log('Route Module Configuration:', {
  runtime,
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
  console.log('Edge Function Request:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request with size validation
    const rawBody = await req.text();
    const bodySize = new TextEncoder().encode(rawBody).length;
    
    console.log('Request Size Check:', {
      size: bodySize,
      timestamp: new Date().toISOString()
    });

    if (bodySize > MAX_RESPONSE_SIZE) {
      return NextResponse.json({
        error: true,
        message: 'Request payload too large for Edge function',
        size: bodySize,
        limit: MAX_RESPONSE_SIZE
      }, { status: 413 });
    }

    const reqData = JSON.parse(rawBody);
    
    // Validate OpenAI API key in Edge context
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('API Key Missing in Edge Runtime');
      return NextResponse.json({
        error: true,
        message: 'OpenAI API key not configured in Edge environment',
        runtime: 'edge'
      }, { status: 500 });
    }

    // Initialize service
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

    // Stream the response with size validation
    return await createStreamingResponse(result);

  } catch (error: any) {
    console.error('Edge Function Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      error: true,
      message: error.message || 'An error occurred in Edge function',
      runtime: 'edge'
    }, { status: 500 });
  }
}