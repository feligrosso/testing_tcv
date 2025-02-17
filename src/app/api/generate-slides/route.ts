import { NextResponse } from "next/server";
import OpenAI from 'openai';

interface SlideRequest {
  title?: string;
  rawData: string;
  soWhat?: string;
  source?: string;
}

interface SlideContent {
  title: string;
  subtitle?: string;
  visualType: string;
  keyPoints: string[];
  source: string;
}

interface ErrorResponse {
  error: true;
  message: string;
  title: string;
  subtitle: string;
  visualType: string;
  keyPoints: string[];
  source: string;
}

// Validate environment variables at startup
const validateEnv = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file');
  }
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. The key should start with "sk-"');
  }
  
  // Only return a substring for logging - never log the full key
  return `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`;
};

function preprocessData(rawData: string): string {
  const lines = rawData.split('\n')
    .filter(line => line.trim())
    .slice(0, 8);
  return lines.map(line => line.slice(0, 100)).join('\n');
}

export async function POST(req: Request) {
  try {
    // Initialize OpenAI with validated key
    const apiKeyPreview = validateEnv();
    console.log('Using OpenAI API key:', apiKeyPreview);

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2, // Reduce retries to fail faster
      timeout: 30000,
    });

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

    const { title, rawData, soWhat, source }: SlideRequest = reqData;
    
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

    const processedData = preprocessData(rawData);
    
    const systemPrompt = `You are an expert management consultant specializing in creating impactful presentation slides. Your task is to analyze data and generate slide content that follows these principles:

1. Titles should be action-oriented and highlight the key message (e.g., "Increasing Market Share by 25% Through Digital Transformation")
2. Key points should be specific, data-driven, and follow the "What, So What, Now What" framework
3. Each key point must include actual numbers/metrics from the data
4. Visualization recommendations should match the story being told (e.g., bar charts for comparisons, line charts for trends)

Return the content in this exact JSON format:
{
  "title": "Action-oriented title that captures main insight",
  "subtitle": "Supporting context or timeframe",
  "visualType": "Specific chart type (Bar Chart, Line Chart, etc.)",
  "keyPoints": [
    "Point 1 with specific numbers and business impact",
    "Point 2 with specific numbers and business impact",
    "Point 3 with specific numbers and business impact"
  ],
  "source": "Data source attribution"
}`;
    
    const userPrompt = `Create a consulting-style slide analyzing this data. The slide should tell a compelling story and lead to clear business recommendations.

Title Context: "${title || 'Generate an insight-driven title'}"
Source: "${source || 'Internal Analysis'}"
Additional Context: "${soWhat || ''}"

Data to analyze:
${processedData}

Requirements:
1. Title must be action-oriented and highlight the key business impact
2. Key points should flow logically and build up to a clear recommendation
3. Include specific numbers from the data in each key point
4. Recommend a visualization type that best shows the key message
5. Keep the output in the exact JSON format specified`;

    console.log('Starting OpenAI request...');
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      let slideContent;
      try {
        slideContent = JSON.parse(content.trim());
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content:', content);
        return NextResponse.json({
          error: true,
          message: 'Failed to parse AI response',
          errorType: 'error',
          title: title || 'Analysis Error',
          subtitle: 'Invalid Response Format',
          visualType: 'Bar Chart',
          keyPoints: [
            'The AI response was not in the correct format',
            'Please try again with simpler data',
            'If the problem persists, contact support'
          ],
          source: source || 'System Message'
        }, { status: 500 });
      }

      // Clean and validate response
      const cleanedContent = {
        error: false,
        message: 'Success',
        title: slideContent.title?.trim() || title || 'Data Analysis',
        subtitle: slideContent.subtitle?.trim() || soWhat || 'Key Insights',
        visualType: slideContent.visualType || 'Bar Chart',
        keyPoints: (slideContent.keyPoints || [])
          .filter((point: string) => point && typeof point === 'string')
          .map((point: string) => point.trim())
          .slice(0, 3),
        source: slideContent.source?.trim() || source || 'Internal Analysis'
      };

      return NextResponse.json(cleanedContent);

    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);
      
      if (openaiError.code === 'insufficient_quota') {
        return NextResponse.json({
          error: true,
          message: 'API quota exceeded. Please try again later or contact support to upgrade your plan.',
          errorType: 'warning',
          title: 'Service Temporarily Unavailable',
          subtitle: 'API Limit Reached',
          visualType: 'Bar Chart',
          keyPoints: [
            'The service is currently at capacity',
            'Please wait a few moments and try again',
            'If this persists, contact support'
          ],
          source: 'System Message'
        }, { status: 429 });
      }

      if (openaiError.code === 'invalid_api_key') {
        return NextResponse.json({
          error: true,
          message: 'Invalid API configuration. Please contact support.',
          errorType: 'error',
          title: 'Configuration Error',
          subtitle: 'API Authentication Failed',
          visualType: 'Bar Chart',
          keyPoints: [
            'Unable to authenticate with the AI service',
            'This is a configuration issue',
            'Please contact support for assistance'
          ],
          source: 'System Message'
        }, { status: 401 });
      }

      throw openaiError; // Let the outer catch handle other errors
    }
  } catch (error: any) {
    console.error('Error generating slide:', error);
    
    let status = error.status || 500;
    let message = error.message || 'An unexpected error occurred';
    let errorType = 'error';
    
    if (error.code === 'context_length_exceeded') {
      status = 400;
      message = 'Input data is too long. Please provide a shorter dataset.';
      errorType = 'warning';
    } else if (error.name === 'AbortError') {
      status = 408;
      message = 'Request timed out. Please try again.';
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
        'Please try again in a few moments'
      ],
      source: 'System Message'
    }, { status });
  }
}