"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (val: number) => string;
  className?: string;
}

export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
  className,
}: SliderProps) {
  const [minVal, maxVal] = value;

  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <p className="text-sm text-slate-400">
            {formatValue(minVal)} – {formatValue(maxVal)}
          </p>
        </div>
      )}
      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 rounded-full bg-slate-700" />
        {/* Range fill */}
        <div
          className="absolute h-1.5 rounded-full bg-emerald-500"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={(e) => {
            const newMin = Math.min(Number(e.target.value), maxVal - step);
            onChange([newMin, maxVal]);
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-black/30"
          style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e) => {
            const newMax = Math.max(Number(e.target.value), minVal + step);
            onChange([minVal, newMax]);
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:shadow-black/30"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
