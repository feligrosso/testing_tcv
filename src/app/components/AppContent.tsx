'use client';

import { useEffect, useState } from 'react';
import V2ALogo from './V2ALogo';
import SlideGeneratorForm from './SlideGeneratorForm';
import TemplateIcon from './animations/TemplateIcon';
import VisualizationIcon from './animations/VisualizationIcon';
import InsightIcon from './animations/InsightIcon';

export default function AppContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header with V2A branding */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <V2ALogo className="h-10 w-44" />
              <div className="h-8 w-px bg-gray-200 mx-4" />
              <span className="text-v2a-blue font-georgia text-xl">TuConsultor V2A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-v2a-blue text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-georgia mb-6">Transform Your Data into Consultant-Quality Slides</h1>
            <p className="text-xl font-calibri text-gray-200">
              Powered by V2A Consulting's expertise in data visualization and strategic insights
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Value Proposition */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
            <div className="h-24 flex items-center justify-center mb-4">
              <TemplateIcon />
            </div>
            <h3 className="font-georgia text-lg text-v2a-blue mb-2">Professional Templates</h3>
            <p className="text-gray-600 font-calibri">V2A-approved slide designs that maintain consistency</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
            <div className="h-24 flex items-center justify-center mb-4">
              <VisualizationIcon />
            </div>
            <h3 className="font-georgia text-lg text-v2a-blue mb-2">Smart Visualization</h3>
            <p className="text-gray-600 font-calibri">Automatically generate impactful data visualizations</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
            <div className="h-24 flex items-center justify-center mb-4">
              <InsightIcon />
            </div>
            <h3 className="font-georgia text-lg text-v2a-blue mb-2">Strategic Insights</h3>
            <p className="text-gray-600 font-calibri">AI-powered "So What?" analysis for key takeaways</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <SlideGeneratorForm />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-v2a-blue text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <V2ALogo className="h-8 w-36" isWhite />
            <p className="text-sm">
              © {new Date().getFullYear()} V2A Consulting. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
} 