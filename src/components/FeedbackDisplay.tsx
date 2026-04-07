import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

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
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayback = () => {
    if (!audioURL) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioURL);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play();
  };
  const origWords = normalize(original);
  const recWords = normalize(recognized);

  const matchCount = origWords.filter((w, i) => recWords[i] === w).length;
  const score = origWords.length > 0 ? Math.round((matchCount / origWords.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border p-8 shadow-lg space-y-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          발음 피드백
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">정확도</span>
          <span
            className={`text-2xl font-bold ${
              score >= 80
                ? "text-accent"
                : score >= 50
                ? "text-warning"
                : "text-destructive"
            }`}
          >
            {score}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xl md:text-2xl leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
        {origWords.map((word, i) => {
          const isCorrect = recWords[i] === word;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`px-1 rounded ${
                isCorrect
                  ? "text-accent"
                  : "text-destructive bg-destructive/10 line-through decoration-2"
              }`}
            >
              {word}
            </motion.span>
          );
        })}
      </div>

      {recognized && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            내가 말한 것
          </p>
          <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {recognized}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default FeedbackDisplay;
