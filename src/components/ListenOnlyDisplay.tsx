import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Languages, Loader2, BookOpen, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleTTS } from "@/hooks/useGoogleTTS";

interface AnalysisResult {
  translation: string;
  prosody: string;
  alternatives: string[];
}

interface ListenOnlyDisplayProps {
  sentence: string;
  onDone: () => void;
  delaySeconds?: number;
  repeatCount?: number;
  voiceName?: string;
  speechSpeed?: number;
  isPaused?: boolean;
  translationEnabled?: boolean;
}

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

const ListenOnlyDisplay = ({ sentence, onDone, delaySeconds = 4, repeatCount = 1, voiceName, speechSpeed, isPaused = false, translationEnabled = false }: ListenOnlyDisplayProps) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ttsFinished, setTtsFinished] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const { speak, cancel } = useGoogleTTS();

  // Play TTS with repeat support using Google Cloud TTS
  useEffect(() => {
    if (!sentence || isPaused) return;
    setTtsFinished(false);
    setCurrentRepeat(0);

    let cancelled = false;
    let playCount = 0;

    const playOnce = () => {
      if (cancelled || isPaused) return;
      speak(sentence, voiceName, () => {
        if (cancelled) return;
        playCount++;
        setCurrentRepeat(playCount);
        if (playCount < repeatCount) {
          setTimeout(() => playOnce(), 800);
        } else {
          setTtsFinished(true);
        }
      }, speechSpeed);
    };

    const timer = setTimeout(() => playOnce(), 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancel();
    };
  }, [sentence, repeatCount, voiceName, speechSpeed, isPaused]);

  // Fetch analysis
  useEffect(() => {
    if (!sentence) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    supabase.functions
      .invoke("translate", { body: { text: sentence } })
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
  }, [sentence]);

  // Auto-advance after TTS done + analysis loaded + delay
  useEffect(() => {
    if (!ttsFinished || isAnalyzing || isPaused) return;
    const timer = setTimeout(() => {
      onDone();
    }, delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [ttsFinished, isAnalyzing, onDone, isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      <div className="px-6 py-3 bg-primary/10 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Listen Only Mode</span>
        {!ttsFinished && (
          <span className="text-xs text-muted-foreground animate-pulse">
            ♪ Playing{repeatCount > 1 ? ` (${currentRepeat + 1}/${repeatCount})` : ""}...
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {isAnalyzing ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing...
          </div>
        ) : analysis && (
          <div className="space-y-3">
            {/* Prosody */}
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
              </div>
            )}

            {/* Korean */}
            {analysis.translation && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
                <Languages className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground block mb-1">
                    Korean
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.translation}</p>
                </div>
              </div>
            )}

            {/* Alternatives */}
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

        {/* Auto-advance indicator */}
        {ttsFinished && !isAnalyzing && (
          <div className="text-center text-xs text-muted-foreground animate-pulse">
            Next sentence in a few seconds...
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ListenOnlyDisplay;
