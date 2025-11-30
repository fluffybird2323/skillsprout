import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  targetValue: number;
  unit?: string;
}

interface EnhancedSliderProps {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const EnhancedSlider: React.FC<EnhancedSliderProps> = ({ 
  config, 
  value, 
  onChange, 
  disabled = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  
  // Calculate tolerance range (±15% of target value)
  const tolerance = Math.abs(config.targetValue * 0.15);
  const minRange = config.targetValue - tolerance;
  const maxRange = config.targetValue + tolerance;
  
  // Check if current value is within acceptable range
  const isInRange = value >= minRange && value <= maxRange;
  const isInNeighborhood = Math.abs(value - config.targetValue) <= tolerance * 1.5;
  
  // Calculate percentage for visual positioning
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;
  const targetPercentage = ((config.targetValue - config.min) / (config.max - config.min)) * 100;
  
  // Snap-to-grid functionality with reduced intervals
  const snapValue = useCallback((rawValue: number) => {
    const baseStep = config.step;
    const distanceFromTarget = Math.abs(rawValue - config.targetValue);
    
    if (distanceFromTarget <= tolerance * 2) {
      // Use smaller steps when close to target for precision
      return Math.round(rawValue / (baseStep * 0.5)) * (baseStep * 0.5);
    } else {
      // Use larger steps when far from target for faster navigation
      return Math.round(rawValue / (baseStep * 2)) * (baseStep * 2);
    }
  }, [config.step, config.targetValue, tolerance]);
  
  // Handle value changes with feedback
  const handleValueChange = useCallback((newValue: number) => {
    const snappedValue = snapValue(newValue);
    onChange(snappedValue);
    
    // Show feedback
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 1500);
    
    // Haptic feedback when crossing thresholds
    if ('vibrate' in navigator && window.navigator.vibrate) {
      const wasInRange = isInRange;
      const newIsInRange = snappedValue >= minRange && snappedValue <= maxRange;
      
      if (!wasInRange && newIsInRange) {
        window.navigator.vibrate(50);
      } else if (wasInRange && !newIsInRange) {
        window.navigator.vibrate([20, 20, 20]);
      }
    }
  }, [onChange, snapValue, isInRange, minRange, maxRange]);
  
  // Mouse/Touch interaction handlers
  const handleInteractionStart = useCallback((clientX: number) => {
    if (disabled || !sliderRef.current) return;
    
    setIsDragging(true);
    
    const rect = sliderRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const newPercentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    const newValue = config.min + (newPercentage / 100) * (config.max - config.min);
    
    handleValueChange(newValue);
  }, [disabled, config.min, config.max, handleValueChange]);
  
  const handleInteractionMove = useCallback((clientX: number) => {
    if (!isDragging || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const newPercentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    const newValue = config.min + (newPercentage / 100) * (config.max - config.min);
    
    handleValueChange(newValue);
  }, [isDragging, config.min, config.max, handleValueChange]);
  
  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleInteractionStart(e.clientX);
  }, [handleInteractionStart]);
  
  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleInteractionStart(e.touches[0].clientX);
  }, [handleInteractionStart]);
  
  // Global event listeners for drag operations
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleInteractionMove(e.clientX);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleInteractionMove(e.touches[0].clientX);
    };
    
    const handleMouseUp = () => {
      handleInteractionEnd();
    };
    
    const handleTouchEnd = () => {
      handleInteractionEnd();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleInteractionMove, handleInteractionEnd]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = value;
    const step = isInRange ? config.step * 0.5 : config.step;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(config.min, value - step);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(config.max, value + step);
        e.preventDefault();
        break;
      case 'Home':
        newValue = config.min;
        e.preventDefault();
        break;
      case 'End':
        newValue = config.max;
        e.preventDefault();
        break;
      case 'PageDown':
        newValue = Math.max(config.min, value - (step * 5));
        e.preventDefault();
        break;
      case 'PageUp':
        newValue = Math.min(config.max, value + (step * 5));
        e.preventDefault();
        break;
    }
    
    if (newValue !== value) {
      handleValueChange(newValue);
    }
  }, [value, config, disabled, isInRange, handleValueChange]);
  
  // Get thumb color based on state
  const getThumbColor = () => {
    if (disabled) return "bg-gray-400 border-gray-400";
    if (isInRange) return "bg-green-500 border-green-500 shadow-lg shadow-green-500/30";
    if (isInNeighborhood) return "bg-yellow-500 border-yellow-500 shadow-lg shadow-yellow-500/30";
    return "bg-blue-500 border-blue-500";
  };
  
  // Get track color based on state
  const getTrackColor = () => {
    if (disabled) return "bg-gray-200 dark:bg-gray-700";
    return "bg-gray-300 dark:bg-gray-600";
  };
  
  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header with label and value */}
      <div className="flex justify-between items-center">
        <label className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
          {config.label}
        </label>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {value.toFixed(1)} {config.unit}
          </span>
          {isInRange && (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
      
      {/* Slider container */}
      <div className="relative py-2">
        {/* Slider track */}
        <div
          ref={sliderRef}
          className={`relative h-2 rounded-full cursor-pointer select-none ${getTrackColor()}`}
          role="slider"
          aria-label={config.label}
          aria-valuemin={config.min}
          aria-valuemax={config.max}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(1)} ${config.unit}. ${isInRange ? 'Correct range' : isInNeighborhood ? 'Close to target' : 'Adjust value'}`}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Target range indicator */}
          <div 
            className={`absolute top-0 bottom-0 rounded-full transition-all duration-300 ${
              showFeedback && isInRange 
                ? "bg-green-200 border-2 border-green-400" 
                : "bg-green-100 border border-green-300"
            }`}
            style={{
              left: `${Math.max(0, ((minRange - config.min) / (config.max - config.min)) * 100)}%`,
              width: `${((maxRange - minRange) / (config.max - config.min)) * 100}%`
            }}
          />
          
          {/* Neighborhood indicator */}
          {isInNeighborhood && !isInRange && (
            <div 
              className="absolute top-0 bottom-0 rounded-full bg-yellow-100 border border-yellow-300 animate-pulse"
              style={{
                left: `${Math.max(0, ((config.targetValue - tolerance * 1.5 - config.min) / (config.max - config.min)) * 100)}%`,
                width: `${((tolerance * 3) / (config.max - config.min)) * 100}%`
              }}
            />
          )}
          
          {/* Slider thumb */}
          <div
            ref={thumbRef}
            className={`absolute top-1/2 w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing transform -translate-y-1/2 transition-all duration-150 ${getThumbColor()}`}
            style={{
              left: `${percentage}%`,
              transform: 'translateX(-50%) translateY(-50%)'
            }}
          >
            {/* Inner indicator */}
            <div className={`absolute inset-1 rounded-full transition-colors duration-200 ${
              isInRange ? "bg-white" : "bg-blue-100"
            }`} />
          </div>
          
          {/* Hidden range input for form integration */}
          <input
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={(e) => handleValueChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        
        {/* Feedback message for far values */}
        {!isInNeighborhood && (
          <div 
            className="absolute top-full mt-1 text-xs text-red-500 font-medium text-center"
            style={{
              left: `${percentage}%`,
              transform: 'translateX(-50%)'
            }}
          >
            Try adjusting toward {config.targetValue.toFixed(1)} {config.unit}
          </div>
        )}
      </div>
      
      {/* Target hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Target: {config.targetValue.toFixed(1)} {config.unit} (±{tolerance.toFixed(1)} {config.unit})
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        {isInRange 
          ? `Correct! ${config.label} is set to ${value.toFixed(1)} ${config.unit}`
          : isInNeighborhood
          ? `Getting close. Current value: ${value.toFixed(1)} ${config.unit}`
          : `Current value: ${value.toFixed(1)} ${config.unit}. Target is ${config.targetValue.toFixed(1)} ${config.unit}`
        }
      </div>
    </div>
  );
};

export default EnhancedSlider;