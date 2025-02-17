'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import V2ALogo from './V2ALogo';

interface LoadingAnimationProps {
  isLoading: boolean;
}

const loadingSteps = [
  {
    step: 1,
    message: "Analyzing your data",
    percentage: 15
  },
  {
    step: 2,
    message: "Identifying key insights",
    percentage: 30
  },
  {
    step: 3,
    message: "Crafting impactful title",
    percentage: 45
  },
  {
    step: 4,
    message: "Designing visualization",
    percentage: 60
  },
  {
    step: 5,
    message: "Formulating key points",
    percentage: 75
  },
  {
    step: 6,
    message: "Suggesting additional analyses",
    percentage: 85
  },
  {
    step: 7,
    message: "Validating data quality",
    percentage: 95
  },
  {
    step: 8,
    message: "Finalizing slide",
    percentage: 100
  }
];

export default function LoadingAnimation({ isLoading }: LoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 3000);

    return () => {
      clearInterval(stepInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const currentStepData = loadingSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
      >
        {/* V2A Logo */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-32"
          >
            <V2ALogo />
          </motion.div>
        </div>

        {/* Step Text */}
        <motion.div
          key={currentStepData.step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h3 className="text-lg font-georgia text-v2a-blue mb-2">
            Step {currentStepData.step} of {loadingSteps.length}
          </h3>
          <p className="text-gray-600 h-6">
            {currentStepData.message}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-v2a-blue"
            initial={{ width: 0 }}
            animate={{ width: `${currentStepData.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Percentage */}
        <motion.p
          key={currentStepData.percentage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-500"
        >
          {currentStepData.percentage}% Complete
        </motion.p>
      </motion.div>
    </div>
  );
} 