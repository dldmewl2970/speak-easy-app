import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SentenceNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const SentenceNav = ({ current, total, onPrev, onNext }: SentenceNavProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={current === 0}
        className="rounded-xl"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <span className="text-sm text-muted-foreground font-medium tabular-nums">
        {current + 1} / {total}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={current === total - 1}
        className="rounded-xl"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default SentenceNav;
