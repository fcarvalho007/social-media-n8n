import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({ 
  value, 
  duration = 1000,
  formatFn,
  className 
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const spring = useSpring(0, {
    duration: duration,
    bounce: 0,
  });
  
  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    if (formatFn) {
      return formatFn(rounded);
    }
    return rounded.toLocaleString("pt-PT");
  });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(value);
      setHasAnimated(true);
    }
  }, [isInView, value, spring, hasAnimated]);

  // Update if value changes after initial animation
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value);
    }
  }, [value, spring, hasAnimated]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

// Utility function to format large numbers
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString("pt-PT");
}

// Utility function for percentage
export function formatPercentage(num: number): string {
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}
