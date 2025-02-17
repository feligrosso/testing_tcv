'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

interface SlideContent {
  title: string;
  subtitle?: string;
  visualization: string;
  key_points: string[];
  so_what: string;
  recommendations?: string[];
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
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormError({
      show: true,
      message: 'Generating your slide...',
      type: 'info'
    });

    try {
      const response = await fetch('/api/generate-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate slide');
      }

      setSlideContent(data);
      setFormError({
        show: true,
        message: 'Slide generated successfully!',
        type: 'info'
      });
    } catch (error) {
      console.error('Error generating slide:', error);
      setFormError({
        show: true,
        message: error instanceof Error ? error.message : 'An error occurred while generating your slide',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
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

      {/* Display Generated Content */}
      {slideContent && (
        <motion.div
          className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100"
          initial={mounted ? { opacity: 0, y: 20 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-georgia text-v2a-blue mb-4">Generated Slide Content</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-georgia text-gray-700">Title</h4>
              <p className="text-gray-900">{slideContent.title}</p>
              {slideContent.subtitle && (
                <p className="text-gray-600 mt-1">{slideContent.subtitle}</p>
              )}
            </div>

            <div>
              <h4 className="font-georgia text-gray-700">Visualization Suggestion</h4>
              <p className="text-gray-900">{slideContent.visualization}</p>
            </div>

            <div>
              <h4 className="font-georgia text-gray-700">Key Points</h4>
              <ul className="list-disc pl-5 space-y-1">
                {slideContent.key_points.map((point, index) => (
                  <li key={index} className="text-gray-900">{point}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-georgia text-gray-700">So What?</h4>
              <p className="text-gray-900">{slideContent.so_what}</p>
            </div>

            {slideContent.recommendations && slideContent.recommendations.length > 0 && (
              <div>
                <h4 className="font-georgia text-gray-700">Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {slideContent.recommendations.map((rec, index) => (
                    <li key={index} className="text-gray-900">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
} 