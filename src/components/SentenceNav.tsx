import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useCallback } from "react";

interface SentenceNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo?: (index: number) => void;
}

const SentenceNav = ({ current, total, onPrev, onNext, onGoTo }: SentenceNavProps) => {
  const progress = ((current + 1) / total) * 100;
  const barRef = useRef<HTMLDivElement>(null);

  const calcIndex = useCallback((clientX: number) => {
    if (!barRef.current || !onGoTo) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const index = Math.min(total - 1, Math.floor(ratio * total));
    onGoTo(index);
  }, [total, onGoTo]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onGoTo) return;
    calcIndex(e.clientX);
    const onMove = (ev: MouseEvent) => calcIndex(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [calcIndex, onGoTo]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onGoTo) return;
    calcIndex(e.touches[0].clientX);
  }, [calcIndex, onGoTo]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onGoTo) return;
    calcIndex(e.touches[0].clientX);
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
