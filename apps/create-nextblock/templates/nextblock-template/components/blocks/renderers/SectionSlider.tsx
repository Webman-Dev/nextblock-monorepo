"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SectionSliderProps {
  autoplay?: boolean;
  timeframe?: number; // In seconds
  children: React.ReactNode[];
  minHeight?: string;
}

export default function SectionSlider({
  autoplay = false,
  timeframe = 5,
  children,
  minHeight = '400px',
}: SectionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = children.length;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset to first slide if children count changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [totalSlides]);

  useEffect(() => {
    if (!autoplay || totalSlides <= 1 || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    const intervalMs = timeframe * 1000;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoplay, timeframe, totalSlides, isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  if (totalSlides === 0) {
    return null;
  }

  return (
    <div
      className="relative w-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ minHeight }}
    >
      {/* Slides Container */}
      <div className="relative w-full" style={{ minHeight }}>
        {children.map((child, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`w-full transition-opacity duration-700 ease-in-out ${
                isActive
                  ? "relative opacity-100 z-10 pointer-events-auto"
                  : "absolute inset-x-0 top-0 opacity-0 z-0 pointer-events-none"
              }`}
            >
              {child}
            </div>
          );
        })}
      </div>

      {/* Navigation Chevrons */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-white/10 dark:bg-black/20 hover:bg-white/25 dark:hover:bg-black/45 backdrop-blur-md text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-current" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-white/10 dark:bg-black/20 hover:bg-white/25 dark:hover:bg-black/45 backdrop-blur-md text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-current" />
          </button>
        </>
      )}

      {/* Navigation Dots */}
      {totalSlides > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center space-x-2">
          {children.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={index}
                onClick={(e) => handleDotClick(index, e)}
                className={`h-2.5 rounded-full transition-all duration-300 border border-white/10 ${
                  isActive
                    ? "w-7 bg-white shadow-md"
                    : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
