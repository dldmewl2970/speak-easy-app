import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SentenceNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const SentenceNav = ({ current, total, onPrev, onNext }: SentenceNavProps) => {
  const progress = ((current + 1) / total) * 100;

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
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
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
