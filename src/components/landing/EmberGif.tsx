import Image from "next/image";
import { MASCOT } from "./landing-config";

interface EmberGifProps {
  width: number;
  className?: string;
  alt?: string;
}

export function EmberGif({ width, className, alt = "" }: EmberGifProps) {
  return (
    <Image
      src={MASCOT.src}
      width={width}
      height={Math.round(width * MASCOT.ratio)}
      alt={alt}
      className={className}
      unoptimized
    />
  );
}
