'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import V2ALogo from './V2ALogo';

interface SlideData {
  title: string;
  subtitle?: string;
  content: {
    data: any;
    visualization: string;
    soWhat: string;
    source?: string;
    pageNumber?: number;
  };
}

interface SlidePreviewProps {
  slide: SlideData;
  theme: 'Default' | 'Minimalist' | 'Modern';
}

export default function SlidePreview({ slide, theme }: SlidePreviewProps) {
  return (
    <motion.div 
      className="w-full aspect-[16/9] bg-white rounded-lg shadow-xl p-8 relative border border-gray-200"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* V2A Logo */}
      <div className="absolute top-4 right-4">
        <V2ALogo className="h-6 w-24" />
      </div>

      {/* Title Section */}
      <div className="absolute top-4 left-8 right-32">
        <div className="flex items-start gap-4">
          <div className="bg-v2a-blue rounded-lg p-2 mt-1">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h2 className="font-georgia text-[20px] text-gray-900 leading-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="font-calibri text-[14px] text-gray-600 mt-2">
                {slide.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-24 h-[calc(100%-12rem)]">
        {/* Visualization takes most of the space */}
        <div className="h-full flex flex-col">
          <div className="flex-1 bg-white">
            {/* Placeholder for data visualization */}
            <div className="h-full flex items-center justify-center border border-gray-100 rounded-lg">
              <p className="text-gray-400 font-calibri">Data Visualization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Source Attribution */}
        <div className="absolute bottom-4 left-8">
          <p className="text-[10px] text-gray-500 font-calibri">
            {slide.content.source || 'Source: Internal Analysis'}
          </p>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-4 right-4">
          <p className="text-[10px] text-gray-500 font-calibri">
            {slide.content.pageNumber || '1'}
          </p>
        </div>

        {/* "So What?" Section */}
        <div className="absolute bottom-12 left-8 right-8">
          <div className="bg-v2a-blue text-white p-4 rounded-lg">
            <p className="font-calibri text-[14px] leading-relaxed">
              {slide.content.soWhat}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 