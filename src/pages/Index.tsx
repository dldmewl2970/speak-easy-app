import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, MicOff, Play, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScriptDisplay from "@/components/ScriptDisplay";
import FeedbackDisplay from "@/components/FeedbackDisplay";
import SentenceNav from "@/components/SentenceNav";

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const Index = () => {
  const navigate = useNavigate();
  const [script, setScript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognized, setRecognized] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [customSentences, setCustomSentences] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCustomMode = customSentences.length > 0;

  // Load sentences from sessionStorage (set by Scripts page)
  useEffect(() => {
    const data = sessionStorage.getItem("speakup-active-sentences");
    if (data) {
      try {
        const sentences = JSON.parse(data);
        if (Array.isArray(sentences) && sentences.length > 0) {
          setCustomSentences(sentences);
          setSentenceIndex(0);
          setScript(sentences[0]);
        }
      } catch {}
      sessionStorage.removeItem("speakup-active-sentences");
    }
  }, []);

  const resetPracticeState = () => {
    setRecognized("");
    setError(null);
    setAudioURL(null);
    window.speechSynthesis?.cancel();
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
  };

  const handleSentenceNav = (dir: -1 | 1) => {
    const next = sentenceIndex + dir;
    if (next < 0 || next >= customSentences.length) return;
    setSentenceIndex(next);
    setScript(customSentences[next]);
    resetPracticeState();
  };

  // 자연스러운 영어 음성 선택
  const getBestVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() || [];
    // 우선순위: Google UK > Google US > Microsoft > 기본 en-US
    const preferred = [
      "Google UK English Female",
      "Google UK English Male",
      "Google US English",
      "Microsoft Zira",
      "Microsoft David",
      "Samantha",
      "Karen",
      "Daniel",
    ];
    for (const name of preferred) {
      const v = voices.find((voice) => voice.name.includes(name));
      if (v) return v;
    }
    return voices.find((v) => v.lang.startsWith("en")) || null;
  }, []);

  const handleListen = useCallback((autoRecordAfter = false) => {
    if (!window.speechSynthesis) {
      setError("이 브라우저는 음성 합성을 지원하지 않습니다.");
      return;
    }
    if (!script) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (autoRecordAfter) {
        // 원어민 발음 끝나면 자동으로 녹음 시작
        setTimeout(() => handleRecord(), 400);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError("음성 재생 중 오류가 발생했습니다.");
    };
    window.speechSynthesis.speak(utterance);
  }, [script, getBestVoice]);

  // 음성 목록 로드 (비동기)
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const handler = () => {};
    window.speechSynthesis?.addEventListener?.("voiceschanged", handler);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", handler);
  }, []);

  // 스크립트 변경 시 자동으로 원어민 발음 재생 → 끝나면 녹음 시작
  useEffect(() => {
    if (!script) return;
    // 약간의 딜레이 후 자동 재생
    const timer = setTimeout(() => {
      handleListen(true);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  const handleRecord = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError(
        "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요."
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setError(null);
    setRecognized("");
    setAudioURL(null);

    // Start audio recording
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
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
    }).catch(() => {});

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRecognized(transcript);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
      } else if (event.error === "no-speech") {
        setError("음성이 감지되지 않았습니다. 다시 시도해주세요.");
      } else if (event.error === "network") {
        setError(
          "네트워크 오류: Chrome 음성 인식은 Google 서버와 통신이 필요합니다. 앱을 새 탭에서 직접 열거나, 브라우저 주소창에 URL을 입력해 접속해주세요."
        );
      } else {
        setError(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              SpeakUp
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isCustomMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomClear}
                className="gap-2 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                커스텀 해제
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/scripts")}
                className="gap-2 text-muted-foreground"
              >
                <FileText className="w-4 h-4" />
                내 스크립트
              </Button>
            )}
          </div>
        </div>
      </header>


      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl space-y-8">
          <ScriptDisplay script={script} />

          {isCustomMode && (
            <SentenceNav
              current={sentenceIndex}
              total={customSentences.length}
              onPrev={() => handleSentenceNav(-1)}
              onNext={() => handleSentenceNav(1)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => handleListen(false)}
              disabled={isSpeaking}
              className="gap-3 text-base px-8 rounded-xl"
            >
              <Volume2 className="w-5 h-5" />
              {isSpeaking ? "재생 중..." : "원어민 발음 듣기"}
            </Button>

            <Button
              size="lg"
              variant={isListening ? "destructive" : "outline"}
              onClick={handleRecord}
              className="gap-3 text-base px-8 rounded-xl"
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  녹음 중지
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  내 발음 녹음하기
                </>
              )}
            </Button>
          </div>

          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <div className="flex items-center gap-2 text-destructive">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  <span className="text-sm font-medium">듣고 있습니다... 말해보세요!</span>
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
                className="rounded-xl bg-destructive/10 border border-destructive/20 px-6 py-4 text-center"
              >
                <p className="text-sm text-destructive font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comparison playback - always visible */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleListen(false)}
                disabled={isSpeaking}
                className="gap-2 rounded-xl"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? "재생 중..." : "🔊 원어민 발음"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  if (!audioURL) return;
                  const audio = new Audio(audioURL);
                  audio.play();
                }}
                disabled={!audioURL}
                className="gap-2 rounded-xl"
              >
                <Play className="w-4 h-4" />
                {audioURL ? "🎙️ 내 발음" : "🎙️ 녹음 필요"}
              </Button>
            </div>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {recognized && (
              <FeedbackDisplay original={script} recognized={recognized} audioURL={audioURL} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;
