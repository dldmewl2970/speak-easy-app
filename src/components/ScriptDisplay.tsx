import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { useSentenceImage } from "@/hooks/useSentenceImage";

interface ScriptDisplayProps {
  script: string;
}

const ScriptDisplay = ({ script }: ScriptDisplayProps) => {
  const { imageUrl, loading, fetchImage, clearImage } = useSentenceImage(script);
  const [showImage, setShowImage] = useState(false);

  // Reset when sentence changes
  useEffect(() => {
    setShowImage(false);
    clearImage();
  }, [script, clearImage]);

  const handleClick = () => {
    if (showImage) {
      setShowImage(false);
    } else {
      setShowImage(true);
      fetchImage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl bg-card border border-border shadow-sm overflow-hidden cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-accent rounded-t-2xl" />

      {/* Image section — only when toggled */}
      <AnimatePresence>
        {script && showImage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="relative w-full h-40 sm:h-52 bg-muted/30 flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">Generating image...</span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-8 md:p-10">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Practice Script
          </p>
          {script && (
            <span className="text-[10px] text-muted-foreground/50">
              {showImage ? "tap to hide image" : "tap to see image"}
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
    </motion.div>
  );
};

export default ScriptDisplay;
