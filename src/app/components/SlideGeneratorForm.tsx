'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface FormData {
  title: string;
  subtitle: string;
  rawData: string;
  soWhat: string;
  source: string;
  theme: 'Default' | 'Minimalist' | 'Modern';
}

export default function SlideGeneratorForm() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    subtitle: '',
    rawData: '',
    soWhat: '',
    source: '',
    theme: 'Default'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement slide generation logic
    console.log('Form submitted:', formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-georgia text-v2a-blue mb-2">Create Your Slides</h2>
        <p className="text-gray-600 font-calibri">Follow these steps to generate professional consultant-quality slides</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <label className="block">
            <span className="text-lg font-georgia text-v2a-blue">Step 1: Enter Slide Title</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="E.g., Don Q outpaces Barceló in revenue growth"
            />
          </label>
          <label className="block mt-4">
            <span className="text-sm font-georgia text-gray-600">Subtitle (Optional)</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="E.g., 2019-2023 (% based on USD $)"
            />
          </label>
        </motion.div>

        {/* Data Input Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
              placeholder="Paste your data here or drag and drop a file..."
            />
          </label>
        </motion.div>

        {/* "So What?" Section */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <label className="block">
            <span className="text-lg font-georgia text-v2a-blue">Step 3: Define Your "So What?"</span>
            <p className="text-sm text-gray-600 mb-3 font-calibri">
              Provide a clear, impactful conclusion from your data
            </p>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-v2a-blue focus:ring-v2a-blue font-calibri"
              value={formData.soWhat}
              onChange={(e) => setFormData({ ...formData, soWhat: e.target.value })}
              placeholder="E.g., Don Q's growth is sustained and outpaces Barceló, positioning it as the better acquisition target"
            />
          </label>
        </motion.div>

        {/* Source and Theme */}
        <motion.div 
          className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                placeholder="E.g., Source: Internal Sales Report from MJM (2019-2023)"
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <button
            type="submit"
            className="w-full bg-v2a-blue text-white px-8 py-4 rounded-lg hover:bg-v2a-light-blue transition-colors font-georgia text-lg shadow-md hover:shadow-lg"
          >
            Generate V2A Slides
          </button>
        </motion.div>
      </form>
    </div>
  );
} 