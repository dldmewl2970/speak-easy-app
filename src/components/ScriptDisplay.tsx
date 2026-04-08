import { useState, useEffect } from "react";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { useSentenceImage } from "@/hooks/useSentenceImage";

interface ScriptDisplayProps {
  script: string;
}

const ScriptDisplay = ({ script }: ScriptDisplayProps) => {
  const { imageUrl, loading, fetchImage, clearImage } = useSentenceImage(script);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
    clearImage();
  }, [script, clearImage]);

  const handleClick = () => {
    if (!script) return;
    if (!flipped) {
      fetchImage();
    }
    setFlipped((prev) => !prev);
  };

  return (
    <div
      className="cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={handleClick}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front — Script text */}
        <div
          className="relative rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-accent rounded-t-2xl" />
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Practice Script
              </p>
              {script && (
                <span className="text-[10px] text-muted-foreground/50">
                  tap to see image
                </span>
              )}
            </div>
            {script ? (
              <p
                className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed text-foreground tracking-tight"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {script}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 opacity-50" />
                </div>
                <p className="text-base font-semibold">No script loaded</p>
                <p className="text-sm mt-1.5 opacity-70">
                  Tap "My Scripts" in the top right to add sentences
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back — Image */}
        <div
          className="absolute inset-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex items-center justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary/60 to-primary rounded-t-2xl" />
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading image...</span>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Visual memory aid"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground/40">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
          <div className="absolute bottom-3 right-3">
            <span className="text-[10px] text-white/70 bg-black/30 px-2 py-1 rounded-full">
              tap to flip back
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptDisplay;
