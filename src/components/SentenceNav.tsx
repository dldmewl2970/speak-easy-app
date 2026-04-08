import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useCallback, useState } from "react";

interface SentenceNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo?: (index: number) => void;
}

const SentenceNav = ({ current, total, onPrev, onNext, onGoTo }: SentenceNavProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const displayIndex = previewIndex ?? current;
  const progress = ((displayIndex + 1) / total) * 100;

  const calcIndex = useCallback((clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.min(total - 1, Math.floor(ratio * total));
  }, [total]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onGoTo) return;
    setPreviewIndex(calcIndex(e.clientX));
    const onMove = (ev: MouseEvent) => setPreviewIndex(calcIndex(ev.clientX));
    const onUp = (ev: MouseEvent) => {
      const finalIndex = calcIndex(ev.clientX);
      setPreviewIndex(null);
      onGoTo(finalIndex);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [calcIndex, onGoTo]);

  const lastTouchX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onGoTo) return;
    lastTouchX.current = e.touches[0].clientX;
    setPreviewIndex(calcIndex(e.touches[0].clientX));
  }, [calcIndex, onGoTo]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onGoTo) return;
    lastTouchX.current = e.touches[0].clientX;
    setPreviewIndex(calcIndex(e.touches[0].clientX));
  }, [calcIndex, onGoTo]);

  const handleTouchEnd = useCallback(() => {
    if (!onGoTo) return;
    const finalIndex = calcIndex(lastTouchX.current);
    setPreviewIndex(null);
    onGoTo(finalIndex);
  }, [calcIndex, onGoTo]);

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={current === 0}
        className="rounded-xl h-9 w-9 shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex-1 flex items-center gap-3">
        <div
          ref={barRef}
          className="flex-1 h-3 rounded-full bg-muted overflow-hidden cursor-pointer touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out pointer-events-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums whitespace-nowrap">
          {current + 1} / {total}
        </span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={current === total - 1}
        className="rounded-xl h-9 w-9 shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SentenceNav;
