"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  direction: "up" | "down" | "neutral";
  value: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { icon: 14, text: "text-xs" },
  md: { icon: 16, text: "text-sm" },
  lg: { icon: 18, text: "text-base" },
};

export function TrendIndicator({
  direction,
  value,
  label,
  size = "md",
  className = "",
}: TrendIndicatorProps) {
  const config = sizeConfig[size];
  
  const TrendIcon = direction === "up" 
    ? TrendingUp 
    : direction === "down" 
      ? TrendingDown 
      : Minus;
  
  const colorClass = direction === "up" 
    ? "text-success" 
    : direction === "down" 
      ? "text-error" 
      : "text-muted-foreground";

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <TrendIcon 
        className={`${colorClass}`} 
        style={{ width: config.icon, height: config.icon }}
      />
      <span className={`font-medium ${colorClass} ${config.text}`}>
        {value}
      </span>
      {label && (
        <span className={`text-muted-foreground ${config.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
