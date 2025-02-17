import { NextResponse } from "next/server";
import { createSlideGenerationService } from '@/lib/services/SlideGenerationService';

// Configure for optimized Node.js runtime
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';  // Washington DC for lowest latency
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Add performance tracking
const performanceMetrics: { [key: string]: number } = {};
function startOperation(name: string) {
  performanceMetrics[`${name}_start`] = Date.now();
}

function endOperation(name: string) {
  const start = performanceMetrics[`${name}_start`];
  const duration = Date.now() - start;
  performanceMetrics[`${name}_duration`] = duration;
  console.log(`Operation Timing - ${name}:`, {
    durationMs: duration,
    timestamp: new Date().toISOString()
  });
}

// Add Vercel-specific configuration
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Add timeout handling
const TIMEOUT_DURATION = 25000; // 25 seconds to allow for cleanup and response handling

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

// Validate environment variables
function validateEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log('Environment Check:', {
    hasApiKey: !!apiKey,
    runtime: runtime,
    region: preferredRegion,
    timestamp: new Date().toISOString()
  });

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please check your environment variables.');
  }

  return apiKey;
}

export async function POST(req: Request) {
  startOperation('total_request');
  
  try {
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
      return new Response(JSON.stringify({
        error: true,
        message: 'Configuration Error: OpenAI API key is missing or invalid',
        errorType: 'error',
        title: 'Service Unavailable',
        subtitle: 'Configuration Error',
        keyPoints: [
          'The service is not properly configured',
          'OpenAI API key is missing or invalid',
          'Please check the environment variables in Vercel'
        ]
      }), { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, must-revalidate'
        }
      });
    }

    // Initialize slide generation service with validated API key
    startOperation('service_init');
    const slideService = createSlideGenerationService(apiKey);
    endOperation('service_init');

    // Parse request data with timeout
    startOperation('request_parsing');
    let reqData;
    try {
      reqData = await withTimeout(req.json(), 5000);
      endOperation('request_parsing');
    } catch (error) {
      endOperation('request_parsing');
      return NextResponse.json({
        error: true,
        message: error instanceof Error && error.message === 'Operation timed out' 
          ? 'Request parsing timed out' 
          : 'Invalid request data format',
        errorType: 'error',
        title: 'Request Error',
        subtitle: 'Invalid or Slow Request',
        visualType: 'Bar Chart',
        keyPoints: ['Please ensure your request data is properly formatted and not too large'],
        source: 'System Message'
      }, { status: 400 });
    }

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
      return NextResponse.json({
        error: true,
        message: 'No data provided for analysis',
        errorType: 'error',
        title: title || 'Analysis Error',
        subtitle: 'Missing Data',
        visualType: 'Bar Chart',
        keyPoints: ['Please provide data to analyze'],
        source: source || 'System Message'
      }, { status: 400 });
    }

    // Validate data size
    const dataSize = new TextEncoder().encode(rawData).length;
    const maxSize = 100000; // 100KB limit
    if (dataSize > maxSize) {
      return NextResponse.json({
        error: true,
        message: 'Data size exceeds limit. Please reduce the amount of data.',
        errorType: 'warning',
        title: title || 'Data Size Error',
        subtitle: 'Excessive Data',
        visualType: 'Bar Chart',
        keyPoints: [
          'The provided data exceeds the size limit',
          'Please reduce the data to less than 100KB',
          'Consider summarizing or sampling your data'
        ],
        source: source || 'System Message'
      }, { status: 413 });
    }

    try {
      startOperation('slide_generation');
      const result = await withTimeout(
        slideService.generateSlide({
          title,
          rawData,
          soWhat,
          source,
          audience,
          style,
          focusArea,
          dataContext
        }),
        TIMEOUT_DURATION - 5000 // Allow 5s for cleanup
      );
      endOperation('slide_generation');

      endOperation('total_request');
      console.log('Performance Summary:', {
        metrics: performanceMetrics,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(result);
    } catch (error: any) {
      endOperation('slide_generation');
      endOperation('total_request');
      
      console.error('Slide generation error:', {
        error: error.message,
        metrics: performanceMetrics,
        timestamp: new Date().toISOString()
      });

      if (error.message === 'Operation timed out' || error.name === 'AbortError') {
        return NextResponse.json({
          error: true,
          message: 'The request took too long to process',
          errorType: 'warning',
          title: 'Processing Timeout',
          subtitle: 'Request Too Complex',
          visualType: 'Bar Chart',
          keyPoints: [
            'The analysis is taking longer than expected',
            'Please try with a smaller dataset',
            'Consider breaking your analysis into smaller parts'
          ],
          source: 'System Message'
        }, { status: 408 });
      }

      let status = error.status || 500;
      let message = error.message || 'An unexpected error occurred';
      let errorType = 'error';

      // Handle specific error types
      if (error.code === 'insufficient_quota') {
        status = 429;
        message = 'API quota exceeded. Please try again later.';
        errorType = 'warning';
      } else if (error.code === 'context_length_exceeded') {
        status = 400;
        message = 'Input data is too long. Please provide a shorter dataset.';
        errorType = 'warning';
      } else if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        status = 408;
        message = 'The request took too long. Please try again with simpler data.';
        errorType = 'warning';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        status = 503;
        message = 'Service is temporarily unavailable. Please try again in a few moments.';
        errorType = 'warning';
      }

      return NextResponse.json({
        error: true,
        message,
        errorType,
        title: 'Analysis Error',
        subtitle: message,
        visualType: 'Bar Chart',
        keyPoints: [
          'Unable to analyze data at this time',
          message,
          'Please try again with less data or simpler content'
        ],
        recommendations: [
          'Consider breaking down your data into smaller chunks',
          'Try simplifying your data structure',
          'Ensure your data is properly formatted'
        ],
        source: 'System Message'
      }, { status });
    }
  } catch (error: any) {
    endOperation('total_request');
    console.error('Unexpected error:', {
      error: error.message,
      metrics: performanceMetrics,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      error: true,
      message: 'An unexpected error occurred',
      errorType: 'error',
      title: 'System Error',
      subtitle: 'Unexpected Error',
      visualType: 'Bar Chart',
      keyPoints: [
        'The system encountered an unexpected error',
        'Our team has been notified',
        'Please try again later'
      ],
      recommendations: [
        'Refresh the page and try again',
        'Check your internet connection',
        'Contact support if the issue persists'
      ],
      source: 'System Message'
    }, { status: 500 });
  }
}