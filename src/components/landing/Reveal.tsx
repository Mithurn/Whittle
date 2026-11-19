"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { REVEAL_STAGGER_MS, REVEAL_THRESHOLD } from "./landing-config";
import styles from "./landing.module.css";

interface RevealProps {
  as?: ElementType;
  className?: string;
  index?: number;
  threshold?: number;
  children: ReactNode;
}

export function Reveal({ as: Tag = "div", className = "", index = 0, threshold = REVEAL_THRESHOLD, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref}
      className={`${styles.rv} ${shown ? styles.in : ""} ${className}`}
      style={{ transitionDelay: `${(index % 3) * REVEAL_STAGGER_MS}ms` }}
    >
      {children}
    </Tag>
  );
}
