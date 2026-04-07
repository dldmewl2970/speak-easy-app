import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, MicOff, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScriptDisplay from "@/components/ScriptDisplay";
import FeedbackDisplay from "@/components/FeedbackDisplay";
import CustomScriptInput from "@/components/CustomScriptInput";
import SentenceNav from "@/components/SentenceNav";
import { getRandomScript } from "@/lib/scripts";

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const Index = () => {
  const [script, setScript] = useState(() => getRandomScript());
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

  const isCustomMode = customSentences.length > 0;

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

  const handleCustomSubmit = (sentences: string[]) => {
    setCustomSentences(sentences);
    setSentenceIndex(0);
    setScript(sentences[0]);
    resetPracticeState();
  };

  const handleCustomClear = () => {
    setCustomSentences([]);
    setSentenceIndex(0);
    setScript(getRandomScript());
    resetPracticeState();
  };

  const handleSentenceNav = (dir: -1 | 1) => {
    const next = sentenceIndex + dir;
    if (next < 0 || next >= customSentences.length) return;
    setSentenceIndex(next);
    setScript(customSentences[next]);
    resetPracticeState();
  };

  const handleListen = useCallback(() => {
    if (!window.speechSynthesis) {
      setError("이 브라우저는 음성 합성을 지원하지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError("음성 재생 중 오류가 발생했습니다.");
    };
    window.speechSynthesis.speak(utterance);
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

  const handleNewScript = () => {
    setScript(getRandomScript(script));
    setRecognized("");
    setError(null);
    setAudioURL(null);
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

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
          <div className="flex items-center gap-2 relative">
            {!isCustomMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewScript}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className="w-4 h-4" />
                새 문장
              </Button>
            )}
            <CustomScriptInput
              onSubmit={handleCustomSubmit}
              isActive={isCustomMode}
              onClear={handleCustomClear}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl space-y-8">
          <ScriptDisplay script={script} />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleListen}
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
                onClick={handleListen}
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
