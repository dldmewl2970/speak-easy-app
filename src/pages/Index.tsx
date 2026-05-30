import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, MicOff, Play, FileText, X, Pause, PlayCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ScriptDisplay from "@/components/ScriptDisplay";
import FeedbackDisplay from "@/components/FeedbackDisplay";
import SentenceNav from "@/components/SentenceNav";
import ListenOnlyDisplay from "@/components/ListenOnlyDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { splitSentences } from "@/pages/Scripts";
import { useGoogleTTS, GOOGLE_TTS_VOICES, unlockAudio } from "@/hooks/useGoogleTTS";
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface SavedScript {
  id: string;
  name: string;
  text: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);
  const [script, setScript] = useState("");
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showScriptList, setShowScriptList] = useState(false);
  const [listenOnly, setListenOnly] = useState(false);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(2);
  const [repeatCount, setRepeatCount] = useState(1);
  const [scriptLoopCount, setScriptLoopCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognized, setRecognized] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [customSentences, setCustomSentences] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("speakup-elevenlabs-voice") || "FGY2WhTYpPnrIDTdsKH5";
  });
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    const saved = localStorage.getItem("speakup-speech-speed");
    return saved ? Number(saved) : 1.0;
  });
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return localStorage.getItem("speakup-voice-country") || "ALL";
  });
  const [translationEnabled, setTranslationEnabled] = useState<boolean>(() => {
    return sessionStorage.getItem("speakup-translation-enabled") === "true";
  });
  const recognitionRef = useRef<any>(null);
  const networkRetryRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const { speak: googleSpeak, cancel: googleCancel, isSpeaking } = useGoogleTTS();

  const isCustomMode = customSentences.length > 0;

  // Load sentences from sessionStorage (set by Scripts page)
  useEffect(() => {
    // Check sessionStorage first (navigated from Scripts page), then localStorage (persisted)
    const sessionData = sessionStorage.getItem("speakup-active-sentences");
    const persistedData = localStorage.getItem("speakup-active-sentences");
    const data = sessionData || persistedData;
    if (data) {
      try {
        const sentences = JSON.parse(data);
        if (Array.isArray(sentences) && sentences.length > 0) {
          setCustomSentences(sentences);
          setSentenceIndex(0);
          setScript(sentences[0]);
          // Persist to localStorage and clear sessionStorage
          localStorage.setItem("speakup-active-sentences", JSON.stringify(sentences));
          if (sessionData) sessionStorage.removeItem("speakup-active-sentences");
        }
      } catch {}
    }
  }, []);

  // Keyboard arrow navigation + spacebar pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCustomMode) return;
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSentenceNav(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSentenceNav(1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (listenOnly) {
          setIsPaused((p) => {
            if (!p) googleCancel();
            return !p;
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCustomMode, sentenceIndex, customSentences, listenOnly, googleCancel]);

  // Fetch saved scripts from DB
  useEffect(() => {
    if (!user) {
      setSavedScripts([]);
      return;
    }
    const fetchScripts = async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, name, text")
        .order("created_at", { ascending: false });
      if (data) setSavedScripts(data);
    };
    fetchScripts();
  }, [user]);

  const handleLoadScript = (s: SavedScript) => {
    unlockAudio();
    const sentences = splitSentences(s.text);
    if (sentences.length === 0) return;
    setCustomSentences(sentences);
    setSentenceIndex(0);
    setScriptLoopCount(0);
    setScript(sentences[0]);
    localStorage.setItem("speakup-active-sentences", JSON.stringify(sentences));
    setShowScriptList(false);
  };

  const resetPracticeState = () => {
    setRecognized("");
    setError(null);
    setAudioURL(null);
    googleCancel();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleCustomClear = () => {
    setCustomSentences([]);
    setSentenceIndex(0);
    setScript("");
    resetPracticeState();
    localStorage.removeItem("speakup-active-sentences");
  };

  const handleSentenceNav = (dir: -1 | 1) => {
    unlockAudio();
    const next = sentenceIndex + dir;
    if (next < 0 || next >= customSentences.length) return;
    setSentenceIndex(next);
    setScript(customSentences[next]);
    resetPracticeState();
  };

  const handleListen = useCallback((autoRecordAfter = false) => {
    if (!script) return;
    unlockAudio();
    googleCancel();
    googleSpeak(script, selectedVoiceName, () => {
      if (autoRecordAfter) {
        setTimeout(() => handleRecord(), 400);
      }
    }, speechSpeed);
  }, [script, selectedVoiceName, speechSpeed, googleSpeak, googleCancel]);

  // 스크립트 변경 시 자동으로 원어민 발음 재생 → 끝나면 녹음 시작 (listen-only 모드가 아닐 때만)
  useEffect(() => {
    if (!script || listenOnly) return;
    const timer = setTimeout(() => {
      handleListen(true);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, listenOnly]);

  const stopRecording = useCallback(() => {
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
  }, []);

  const handleRecord = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError(
        "This browser does not support speech recognition. Please use Chrome or Edge."
      );
      return;
    }

    if (isListening) {
      stopRecording();
      return;
    }

    setError(null);
    setRecognized("");
    setAudioURL(null);
    networkRetryRef.current = 0;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // 오디오 분석기 설정 (무음 감지용)
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach((t) => t.stop());
        // 녹음 완료 후 자동 재생
        setTimeout(() => {
          const audio = new Audio(url);
          audio.play().catch(() => {});
        }, 300);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // 4초 무음 감지 로직
      let lastSoundTime = Date.now();
      const SILENCE_THRESHOLD = 15; // 볼륨 임계값
      const SILENCE_DURATION = 4000; // 4초

      silenceCheckRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;

        if (avg > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now();
        } else if (Date.now() - lastSoundTime > SILENCE_DURATION) {
          // 4초 이상 무음 → 녹음 종료
          stopRecording();
        }
      }, 200);
    }).catch(() => {});

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true; // 연속 인식으로 변경
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setRecognized(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Microphone permission denied. Please allow it in your browser settings.");
        stopRecording();
      } else if (event.error === "no-speech" || event.error === "aborted") {
        // 무시 — no-speech는 무음 감지로 처리, aborted는 모바일에서 정상 중단
      } else if (event.error === "network") {
        // Auto-retry up to 2 times — Chrome's speech API often has transient network hiccups
        if (networkRetryRef.current < 2 && navigator.onLine) {
          networkRetryRef.current += 1;
          try {
            recognition.stop();
          } catch {}
          setTimeout(() => {
            try {
              recognition.start();
            } catch {}
          }, 500);
          return;
        }
        const offline = !navigator.onLine;
        setError(
          offline
            ? "You appear to be offline. Speech recognition requires an internet connection."
            : "Speech recognition couldn't reach Google's servers. Check your Wi-Fi/mobile data, disable VPN/ad-blockers, or try again."
        );
        stopRecording();
      } else {
        setError(`Speech recognition error: ${event.error}`);
        stopRecording();
      }
    };

    recognition.onend = () => {
      // continuous 모드에서 자연 종료 시 mediaRecorder도 정리
      if (silenceCheckRef.current) {
        clearInterval(silenceCheckRef.current);
        silenceCheckRef.current = null;
      }
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, stopRecording]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleCustomClear}
            aria-label="Reset practice session and return to SpeakUp home"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
              <Volume2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              SpeakUp — Practice Speaking with AI Voice
            </h1>
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedCountry}
              onValueChange={(val) => {
                setSelectedCountry(val);
                localStorage.setItem("speakup-voice-country", val);
                if (val !== "ALL") {
                  const current = GOOGLE_TTS_VOICES.find((v) => v.name === selectedVoiceName);
                  if (!current || current.country !== val) {
                    const first = GOOGLE_TTS_VOICES.find((v) => v.country === val);
                    if (first) {
                      setSelectedVoiceName(first.name);
                      localStorage.setItem("speakup-elevenlabs-voice", first.name);
                    }
                  }
                }
              }}
            >
              <SelectTrigger className="w-[90px] h-8 text-xs rounded-lg border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">🌐 All</SelectItem>
                {Array.from(new Set(GOOGLE_TTS_VOICES.map((v) => v.country))).map((c) => {
                  const flag = GOOGLE_TTS_VOICES.find((v) => v.country === c)?.flag;
                  return (
                    <SelectItem key={c} value={c}>
                      {flag} {c}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select
              value={selectedVoiceName}
              onValueChange={(val) => {
                setSelectedVoiceName(val);
                localStorage.setItem("speakup-elevenlabs-voice", val);
              }}
            >
              <SelectTrigger className="w-[150px] sm:w-[180px] h-8 text-xs rounded-lg border-border/50">
                <SelectValue placeholder="Select Voice" />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_TTS_VOICES.filter((v) => selectedCountry === "ALL" || v.country === selectedCountry).map((v) => (
                  <SelectItem key={v.name} value={v.name}>
                    {v.flag} {v.label} <span className="text-muted-foreground">({v.country})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-muted-foreground whitespace-nowrap">Speed:</label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={speechSpeed}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSpeechSpeed(val);
                  localStorage.setItem("speakup-speech-speed", String(val));
                }}
                className="w-14 sm:w-16 h-1.5 accent-primary"
              />
              <span className="text-[10px] text-muted-foreground font-mono w-7">{speechSpeed.toFixed(2)}×</span>
            </div>
            {isCustomMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomClear}
                className="gap-1.5 text-muted-foreground h-8 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-6 py-10"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStartRef.current || !isCustomMode) return;
          const touch = e.changedTouches[0];
          const dx = touch.clientX - touchStartRef.current.x;
          const dy = touch.clientY - touchStartRef.current.y;
          touchStartRef.current = null;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) handleSentenceNav(1);
            else handleSentenceNav(-1);
          }
        }}
      >
        <div className="w-full max-w-2xl space-y-6">
          {script && <ScriptDisplay script={script} />}

          {/* Listen-only checkbox */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <Checkbox
              id="listen-only"
              checked={listenOnly}
              onCheckedChange={(v) => setListenOnly(v === true)}
            />
            <label htmlFor="listen-only" className="text-sm text-muted-foreground cursor-pointer select-none">
              listen-only mode
            </label>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Translation:</span>
              {[
                { label: "On", value: true },
                { label: "Off", value: false },
              ].map((opt) => (
                <label key={opt.label} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="translationEnabled"
                    checked={translationEnabled === opt.value}
                    onChange={() => {
                      setTranslationEnabled(opt.value);
                      sessionStorage.setItem("speakup-translation-enabled", String(opt.value));
                    }}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  <span className="text-xs text-muted-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
            {listenOnly && (
              <>
                <div className="flex items-center gap-2 ml-4">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Repeat:</label>
                  {[1, 2, 3].map((n) => (
                    <label key={n} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="repeatCount"
                        checked={repeatCount === n}
                        onChange={() => setRepeatCount(n)}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      <span className="text-xs text-muted-foreground">{n}×</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Delay:</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={autoAdvanceDelay}
                    onChange={(e) => setAutoAdvanceDelay(Number(e.target.value))}
                    className="w-20 h-1.5 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground font-mono w-6">{autoAdvanceDelay}s</span>
                </div>
              </>
            )}
            {!isCustomMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/scripts")}
                className="gap-1.5 h-8 text-xs rounded-lg ml-4"
              >
                <FileText className="w-3.5 h-3.5" />
                My Scripts
              </Button>
            )}
          </div>

          {/* Saved Scripts List */}
          {!isCustomMode && savedScripts.length > 0 && (
            <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-[240px] overflow-y-auto">
              <h2 className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Saved Scripts
              </h2>
              {savedScripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadScript(s)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {splitSentences(s.text).length} sentences
                  </span>
                </button>
              ))}
            </div>
          )}

          {isCustomMode && (
            <SentenceNav
              current={sentenceIndex}
              total={customSentences.length}
              onPrev={() => handleSentenceNav(-1)}
              onNext={() => handleSentenceNav(1)}
              onGoTo={(index) => {
                if (index === sentenceIndex) return;
                unlockAudio();
                setSentenceIndex(index);
                setScript(customSentences[index]);
                resetPracticeState();
              }}
            />
          )}

          {/* Listen-only mode content */}
          {listenOnly && isCustomMode && script ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Button
                  variant={isPaused ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsPaused((p) => !p);
                    if (!isPaused) googleCancel();
                  }}
                  className="gap-2 text-xs rounded-lg h-8"
                >
                  {isPaused ? (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  )}
                </Button>
              </div>
              <ListenOnlyDisplay
                sentence={script}
                delaySeconds={autoAdvanceDelay}
                repeatCount={repeatCount}
                voiceName={selectedVoiceName}
                speechSpeed={speechSpeed}
                isPaused={isPaused}
                translationEnabled={translationEnabled}
                onDone={() => {
                  if (sentenceIndex < customSentences.length - 1) {
                    const next = sentenceIndex + 1;
                    setSentenceIndex(next);
                    setScript(customSentences[next]);
                  } else if (scriptLoopCount < 2) {
                    setScriptLoopCount((prev) => prev + 1);
                    setSentenceIndex(0);
                    setScript(customSentences[0]);
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => handleListen(false)}
                  disabled={isSpeaking || !script}
                  className="gap-2.5 text-sm px-6 rounded-xl shadow-sm shadow-primary/20 h-11"
                >
                  <Volume2 className="w-4 h-4" />
                  {isSpeaking ? "Playing..." : "Listen"}
                </Button>

                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "outline"}
                  onClick={handleRecord}
                  disabled={!script}
                  className="gap-2.5 text-sm px-6 rounded-xl h-11"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Record
                    </>
                  )}
                </Button>

                {audioURL && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      const audio = new Audio(audioURL);
                      audio.play();
                    }}
                    className="gap-2.5 text-sm px-6 rounded-xl h-11"
                  >
                    <Play className="w-4 h-4" />
                    My Voice
                  </Button>
                )}
              </div>

              {/* Listening indicator */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-center"
                  >
                    <div className="flex items-center gap-3 bg-destructive/10 text-destructive px-5 py-2.5 rounded-full">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-destructive" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                      </span>
                      <span className="text-sm font-medium">Listening... Speak now!</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-destructive/10 border border-destructive/20 px-5 py-3 text-center"
                  >
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feedback */}
              <AnimatePresence>
                {recognized && (
                  <FeedbackDisplay original={script} recognized={recognized} audioURL={audioURL} />
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
