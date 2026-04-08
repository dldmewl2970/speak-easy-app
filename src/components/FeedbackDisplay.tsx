import { motion } from "framer-motion";
import { Play, Volume2, CheckCircle2, XCircle, Languages, Loader2, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface AnalysisResult {
  translation: string;
  prosody: string;
  alternatives: string[];
}

const FeedbackDisplay = ({ original, recognized, audioURL }: FeedbackDisplayProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingMine, setIsPlayingMine] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!original) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    supabase.functions
      .invoke("translate", { body: { text: original } })
      .then(({ data, error }) => {
        if (!error && data) {
          setAnalysis({
            translation: data.translation || "",
            prosody: data.prosody || "",
            alternatives: data.alternatives || [],
          });
        }
      })
      .finally(() => setIsAnalyzing(false));
  }, [original]);

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

  // Render prosody with styled pauses and stressed words
  const renderProsody = (prosody: string) => {
    if (!prosody) return null;
    const parts = prosody.split(/\s*(\/)\s*/);
    return parts.map((part, i) => {
      if (part === "/") {
        return (
          <span key={i} className="text-primary font-bold mx-0.5 select-none" aria-label="pause">
            /
          </span>
        );
      }
      const words = part.split(/\s+/).filter(Boolean);
      return words.map((word, j) => {
        const isStressed = /^[A-Z]{2,}/.test(word);
        return (
          <span
            key={`${i}-${j}`}
            className={`mr-1 ${isStressed ? "font-bold text-primary underline underline-offset-4 decoration-primary/40 decoration-2" : "text-foreground"}`}
          >
            {isStressed ? word.charAt(0) + word.slice(1).toLowerCase() : word}
          </span>
        );
      });
    });
  };

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
          <span className="text-sm font-semibold text-foreground">Pronunciation Feedback</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Accuracy</span>
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

        {/* Prosody guide */}
        {isAnalyzing ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing...
          </div>
        ) : analysis && (
          <div className="space-y-3">
            {/* Stress & Pause */}
            {analysis.prosody && (
              <div className="px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Stress & Pauses
                  </span>
                </div>
                <p className="text-base leading-relaxed flex flex-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", overflowWrap: "break-word" }}>
                  {renderProsody(analysis.prosody)}
                </p>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span><span className="text-primary font-bold">Bold</span> = stress</span>
                  <span><span className="text-primary font-bold">∥</span> = pause</span>
                </div>
              </div>
            )}

            {/* Korean translation */}
            {analysis.translation && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
                <Languages className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground block mb-1">
                    Korean
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">
                    {analysis.translation}
                  </p>
                </div>
              </div>
            )}

            {/* Alternative expressions */}
            {analysis.alternatives && analysis.alternatives.length > 0 && (
              <div className="px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-warning shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Alternative Expressions
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {analysis.alternatives.map((alt, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">{i + 1}.</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
            {isPlayingNative ? "Playing..." : "Native"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayMine}
            disabled={!audioURL || isPlayingMine}
            className="gap-2 rounded-xl h-10"
          >
            <Play className="w-4 h-4" />
            {isPlayingMine ? "Playing..." : "My Voice"}
          </Button>
        </div>

        {/* What I said */}
        {recognized && (
          <div className="pt-4 border-t border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              What I Said
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
