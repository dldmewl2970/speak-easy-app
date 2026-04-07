import { motion } from "framer-motion";
import { Play, Volume2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useCallback } from "react";

interface FeedbackDisplayProps {
  original: string;
  recognized: string;
  audioURL?: string | null;
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

const FeedbackDisplay = ({ original, recognized, audioURL }: FeedbackDisplayProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingMine, setIsPlayingMine] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlayingMine(false);
    setIsPlayingNative(false);
  }, []);

  const handlePlayNative = () => {
    stopAll();
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(original);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsPlayingNative(true);
    utterance.onend = () => setIsPlayingNative(false);
    utterance.onerror = () => setIsPlayingNative(false);
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayMine = () => {
    if (!audioURL) return;
    stopAll();
    const audio = new Audio(audioURL);
    audioRef.current = audio;
    audio.onplay = () => setIsPlayingMine(true);
    audio.onended = () => setIsPlayingMine(false);
    audio.play();
  };

  const origWords = normalize(original);
  const recWords = normalize(recognized);
  const matchCount = origWords.filter((w, i) => recWords[i] === w).length;
  const score = origWords.length > 0 ? Math.round((matchCount / origWords.length) * 100) : 0;

  const scoreColor = score >= 80 ? "text-accent" : score >= 50 ? "text-warning" : "text-destructive";
  const scoreBg = score >= 80 ? "bg-accent/10" : score >= 50 ? "bg-warning/10" : "bg-destructive/10";
  const ScoreIcon = score >= 80 ? CheckCircle2 : XCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Score header */}
      <div className={`px-6 py-4 ${scoreBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <ScoreIcon className={`w-5 h-5 ${scoreColor}`} />
          <span className="text-sm font-semibold text-foreground">발음 피드백</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">정확도</span>
          <span className={`text-2xl font-extrabold ${scoreColor} tabular-nums`}>
            {score}%
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Word comparison */}
        <div className="flex flex-wrap gap-1.5 text-lg md:text-xl leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {origWords.map((word, i) => {
            const isCorrect = recWords[i] === word;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`px-1.5 py-0.5 rounded-md ${
                  isCorrect
                    ? "text-accent bg-accent/10"
                    : "text-destructive bg-destructive/10 line-through decoration-2"
                }`}
              >
                {word}
              </motion.span>
            );
          })}
        </div>

        {/* Playback comparison */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayNative}
            disabled={isPlayingNative}
            className="gap-2 rounded-xl h-10"
          >
            <Volume2 className="w-4 h-4" />
            {isPlayingNative ? "재생 중..." : "원어민 발음"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayMine}
            disabled={!audioURL || isPlayingMine}
            className="gap-2 rounded-xl h-10"
          >
            <Play className="w-4 h-4" />
            {isPlayingMine ? "재생 중..." : "내 발음"}
          </Button>
        </div>

        {/* What I said */}
        {recognized && (
          <div className="pt-4 border-t border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              내가 말한 것
            </p>
            <p className="text-base text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {recognized}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackDisplay;
