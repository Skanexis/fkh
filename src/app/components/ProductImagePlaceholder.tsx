import { Package } from "lucide-react";

interface ProductImagePlaceholderProps {
  className?: string;
  iconSize?: number;
}

export function ProductImagePlaceholder({ className = "", iconSize = 34 }: ProductImagePlaceholderProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background:
          "radial-gradient(circle at 35% 25%, rgba(255,77,109,0.2), transparent 34%), linear-gradient(135deg, rgba(255,77,109,0.14), rgba(255,154,139,0.08) 48%, rgba(255,255,255,0.04))",
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: Math.max(iconSize + 18, 42),
          height: Math.max(iconSize + 18, 42),
          background: "rgba(11,11,12,0.58)",
          border: "1px solid rgba(255,77,109,0.28)",
        }}
      >
        <Package size={iconSize} color="#FF4D6D" strokeWidth={1.8} />
      </div>
    </div>
  );
}
