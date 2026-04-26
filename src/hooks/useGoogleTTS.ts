import { useCallback, useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Available ElevenLabs TTS voices
export const GOOGLE_TTS_VOICES = [
  { name: "FGY2WhTYpPnrIDTdsKH5", label: "Laura" },
  { name: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { name: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice" },
  { name: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { name: "IKne3meq5aSn9XLyUdCD", label: "Charlie" },
  { name: "JBFqnCBsd6RMkjVDRZzb", label: "George" },
  { name: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam" },
  { name: "nPczCjzI2devNBz1zQrb", label: "Brian" },
  { name: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  { name: "pFZP5JQG7iQjIQuC4Bku", label: "Lily" },
];

// Shared audio element to avoid mobile autoplay restrictions
// Once unlocked by user gesture, it can be reused for programmatic plays
let sharedAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
  }
  return sharedAudio;
}

// Call this on any user interaction to unlock audio on mobile
export function unlockAudio() {
  if (audioUnlocked) return;
  const audio = getSharedAudio();
  // Play a silent buffer to unlock
  audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwBHAAAAAAD/+xBkAA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xBkLQ/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
  }).catch(() => {
    // ignore - will try again on next interaction
  });
}

export function useGoogleTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const abortRef = useRef(false);
  const currentUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const audio = getSharedAudio();
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (
    text: string,
    voice?: string,
    onEnd?: () => void,
    speed?: number
  ) => {
    if (!text) return;
    abortRef.current = false;

    const audio = getSharedAudio();

    // Stop any current playback
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }

    setIsSpeaking(true);

    try {
      const { data, error } = await supabase.functions.invoke("tts", {
        body: { text, voice: voice || undefined, speed: speed || undefined },
      });

      if (abortRef.current) return;

      if (error || !data?.audioContent) {
        console.error("TTS error:", error || "No audio content");
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      // Convert base64 to audio blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      currentUrlRef.current = url;

      audio.src = url;

      audio.onended = () => {
        setIsSpeaking(false);
        if (currentUrlRef.current === url) {
          URL.revokeObjectURL(url);
          currentUrlRef.current = null;
        }
        if (!abortRef.current) onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        if (currentUrlRef.current === url) {
          URL.revokeObjectURL(url);
          currentUrlRef.current = null;
        }
        onEnd?.();
      };

      await audio.play();
    } catch (err) {
      console.error("TTS playback error:", err);
      setIsSpeaking(false);
      onEnd?.();
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
    const audio = getSharedAudio();
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}
