import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface CircularLoaderProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const CircularLoader: React.FC<CircularLoaderProps> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 4,
  children 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Circle */}
      <svg
        className="transform -rotate-90 absolute top-0 left-0"
        width={size}
        height={size}
      >
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle */}
        <circle
          className="text-blue-600 dark:text-blue-500 transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      
      {/* Content inside loader */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {children}
      </div>
    </div>
  );
};
