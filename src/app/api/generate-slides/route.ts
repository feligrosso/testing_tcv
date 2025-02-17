import { NextResponse } from "next/server";
import { createSlideGenerationService } from '@/lib/services/SlideGenerationService';

// Configure for Node.js runtime instead of Edge
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

// Add Vercel-specific configuration
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Validate environment variables
function validateEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Environment Check:', {
    hasApiKey: !!apiKey,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  if (!apiKey) {
    console.error('Environment Error:', {
      error: 'Missing OpenAI API key',
      availableEnvVars: Object.keys(process.env).filter(key => !key.includes('KEY')),
      timestamp: new Date().toISOString()
    });
    throw new Error('OpenAI API key is required');
  }

  return apiKey;
}

export async function POST(req: Request) {
  try {
    // Validate environment variables first with enhanced logging
    let apiKey: string;
    try {
      apiKey = validateEnv();
      console.log('Environment validated successfully');
    } catch (error: any) {
      console.error('Environment validation error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({
        error: true,
        message: 'Service configuration error. Please check server logs.',
        errorType: 'error',
        title: 'Configuration Error',
        subtitle: 'Service Misconfigured',
        visualType: 'Bar Chart',
        keyPoints: ['The service is not properly configured', 'Our team has been notified'],
        source: 'System Message'
      }, { status: 503 });
    }

    // Initialize slide generation service with validated API key
    const slideService = createSlideGenerationService(apiKey);

    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (error) {
      return NextResponse.json({
        error: true,
        message: 'Invalid request data format',
        errorType: 'error',
        title: 'Request Error',
        subtitle: 'Invalid JSON',
        visualType: 'Bar Chart',
        keyPoints: ['Please ensure your request data is properly formatted'],
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

      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Slide generation error:', error);

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
    console.error('Unexpected error:', error);
    
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