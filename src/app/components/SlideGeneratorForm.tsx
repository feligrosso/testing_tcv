'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LoadingAnimation from './LoadingAnimation';

interface FormData {
  title: string;
  subtitle: string;
  rawData: string;
  soWhat: string;
  source: string;
  theme: 'Default' | 'Minimalist' | 'Modern';
}

interface FormError {
  show: boolean;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface SuggestedAnalysis {
  name: string;
  description: string;
  visualizationType: string;
  targetAudience: string;
}

interface DataInsights {
  primaryInsight: string;
  secondaryInsights: string[];
  dataQualityNotes: string[];
}

interface SlideContent {
  title: string;
  subtitle: string;
  visualType: string;
  keyPoints: string[];
  source: string;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry if quota exceeded or invalid API key
      if (response.status === 429 || response.status === 401) {
        return response;
      }
      
      if (response.ok) {
        return response;
      }

      // If we get here, it's a retryable error
      console.log(`Attempt ${i + 1} failed, retrying...`);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Only retry on network errors
      if (error instanceof Error && 
         (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('network timeout'))) {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, i), MAX_RETRY_DELAY);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

export default function SlideGeneratorForm() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    subtitle: '',
    rawData: '',
    soWhat: '',
    source: '',
    theme: 'Default'
  });

  const [formError, setFormError] = useState<FormError>({
    show: false,
    message: '',
    type: 'error'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [slideContent, setSlideContent] = useState<SlideContent | null>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to prevent hydration errors
  if (!mounted) {
    return <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>;
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setFormError({
        show: true,
        message: 'Please enter a title for your slide',
        type: 'error'
      });
      return false;
    }

    if (!formData.rawData.trim()) {
      setFormError({
        show: true,
        message: 'Please provide some data to generate the slide',
        type: 'error'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError({ show: false, message: '', type: 'error' });
    setSlideContent(null);
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoadingStep('Initializing...');
    setLoadingProgress(5);
    
    // Define loading steps with progress percentages
    const loadingSteps = [
      { step: 'Analyzing your data...', progress: 15 },
      { step: 'Crafting action titles...', progress: 30 },
      { step: 'Designing visualizations...', progress: 45 },
      { step: 'Generating key points...', progress: 60 },
      { step: 'Applying V2A best practices...', progress: 75 },
      { step: 'Creating multiple variations...', progress: 85 },
      { step: 'Finalizing slide content...', progress: 95 },
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        const { step, progress } = loadingSteps[stepIndex];
        setLoadingStep(step);
        setLoadingProgress(progress);
        stepIndex++;
      }
    }, 4000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetchWithRetry('/api/generate-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || data.error) {
        let errorMessage = data.message || 'Failed to generate slide';
        let errorType: FormError['type'] = data.errorType || 'error';

        // Handle specific error cases
        switch (response.status) {
          case 429:
            errorType = 'error';
            errorMessage = 'API usage limit reached. Please try again in a few minutes or contact support.';
            break;
          case 401:
            errorType = 'error';
            errorMessage = 'Service configuration error. Please contact support.';
            break;
          case 408:
          case 504:
            errorType = 'warning';
            errorMessage = 'The request took too long. Please try again with simpler data.';
            break;
          case 503:
            errorType = 'warning';
            errorMessage = 'Service is temporarily unavailable. Please try again in a few moments.';
            break;
          case 206:
            errorType = 'warning';
            errorMessage = 'Some content was recovered but may be incomplete. Consider trying again.';
            setSlideContent(data);
            break;
          default:
            if (data.message?.includes('network')) {
              errorType = 'warning';
              errorMessage = 'Network connection issue. Please check your internet and try again.';
            }
        }

        throw new Error(errorMessage);
      }

      setLoadingProgress(100);
      setLoadingStep('Slides generated successfully!');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSlideContent(data);
    } catch (error) {
      console.error('Error generating slide:', error);
      let errorMessage = 'An error occurred while generating your slide';
      let errorType: FormError['type'] = 'error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'The request took too long. Please try again with simpler data.';
          errorType = 'warning';
        } else if (error.message.includes('network') || 
                  error.message.includes('Failed to fetch') || 
                  error.message.includes('NetworkError')) {
          errorMessage = 'Network connection issue. Please check your internet and try again.';
          errorType = 'warning';
        } else if (error.message.includes('Max retries reached')) {
          errorMessage = 'Unable to complete the request after multiple attempts. Please try again later.';
          errorType = 'warning';
        } else {
          errorMessage = error.message;
          errorType = (error as any).errorType || errorType;
        }
      }
      
      setFormError({
        show: true,
        message: errorMessage,
        type: errorType
      });
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setLoadingStep('');
      setLoadingProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {formError.show && (
        <div className={`p-4 rounded-lg ${
          formError.type === 'error' ? 'bg-red-50 border-l-4 border-red-400 text-red-700' :
          formError.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700' :
          'bg-blue-50 border-l-4 border-blue-400 text-blue-700'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {formError.type === 'error' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {formError.type === 'warning' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {formError.type === 'info' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm">{formError.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-georgia text-v2a-blue mb-2">Create Your Slides</h2>
        <p className="text-gray-600 font-calibri">Follow these steps to generate professional consultant-quality slides</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3 }}
        >
          <label className="block">
            <span className="text-lg font-georgia text-v2a-blue">Step 1: Enter Slide Title</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a clear and concise title that captures your key message (AI will help refine it)"
            />
          </label>
          <label className="block mt-4">
            <span className="text-sm font-georgia text-gray-600">Subtitle (Optional)</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Add context like time period, metrics, or scope (Optional - AI will suggest relevant details)"
            />
          </label>
        </motion.div>

        {/* Data Input Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <label className="block">
            <span className="text-lg font-georgia text-v2a-blue">Step 2: Input Your Data</span>
            <p className="text-sm text-gray-600 mb-3 font-calibri">
              Provide your data in your preferred format (CSV, JSON, or plain text)
            </p>
            <textarea
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue min-h-[200px] font-calibri"
              value={formData.rawData}
              onChange={(e) => setFormData({ ...formData, rawData: e.target.value })}
              placeholder="Paste your data here or drag and drop a file... (AI will help structure and visualize it)"
            />
          </label>
        </motion.div>

        {/* "So What?" Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <label className="block">
            <span className="text-lg font-georgia text-v2a-blue">Step 3: Define Your &quot;So What?&quot;</span>
            <p className="text-sm text-gray-600 mb-3 font-calibri">
              Provide a clear, impactful conclusion from your data
            </p>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.soWhat}
              onChange={(e) => setFormData({ ...formData, soWhat: e.target.value })}
              placeholder="Let AI help you craft a compelling insight that drives action from your data"
            />
          </label>
        </motion.div>

        {/* Source and Theme */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="text-lg font-georgia text-v2a-blue">Step 4: Source Attribution</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="Enter your data source (e.g., &apos;Q4 2023 Financial Report&apos;, &apos;Market Research Study&apos;)"
              />
            </label>
            <label className="block">
              <span className="text-lg font-georgia text-v2a-blue">Theme Style</span>
              <select
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as FormData['theme'] })}
              >
                <option value="Default">V2A Standard</option>
                <option value="Minimalist">V2A Minimalist</option>
                <option value="Modern">V2A Modern</option>
              </select>
            </label>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div 
          className="pt-4"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-8 py-4 rounded-lg font-georgia text-lg shadow-md hover:shadow-lg transition-all ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-v2a-blue text-white hover:bg-v2a-light-blue'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate V2A Slides'}
          </button>
        </motion.div>
      </form>

      {isLoading && (
        <LoadingAnimation
          isLoading={isLoading}
        />
      )}

      {/* Display Generated Content */}
      {slideContent && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {slideContent.title}
            </h2>
            
            {/* Subtitle */}
            <p className="text-gray-600 mb-6">
              {slideContent.subtitle}
            </p>

            {/* Visualization Type */}
            <div className="mb-6">
              <span className="text-sm font-semibold text-gray-500">
                Visualization: {slideContent.visualType}
              </span>
            </div>

            {/* Key Points */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Key Points:</h3>
              <ul className="list-disc pl-5 space-y-2">
                {slideContent.keyPoints.map((point, index) => (
                  <li key={index} className="text-gray-700">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Source */}
            <div className="text-sm text-gray-500">
              Source: {slideContent.source}
            </div>
          </div>

          {/* Export Options */}
          <div className="flex gap-2 mt-8 justify-center">
            {['PDF', 'PNG', 'PPTX'].map((format) => (
              <button
                key={format}
                className="px-6 py-2 bg-v2a-blue text-white rounded-lg hover:bg-v2a-light-blue transition-colors shadow-sm"
                onClick={() => {
                  // TODO: Implement export functionality
                  console.log(`Exporting as ${format}`);
                }}
              >
                Export as {format}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 