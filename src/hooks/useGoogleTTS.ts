import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Available Google Cloud TTS Neural2 voices
export const GOOGLE_TTS_VOICES = [
  { name: "en-US-Neural2-F", label: "US Female (F)" },
  { name: "en-US-Neural2-A", label: "US Female (A)" },
  { name: "en-US-Neural2-C", label: "US Female (C)" },
  { name: "en-US-Neural2-E", label: "US Female (E)" },
  { name: "en-US-Neural2-H", label: "US Female (H)" },
  { name: "en-US-Neural2-D", label: "US Male (D)" },
  { name: "en-US-Neural2-I", label: "US Male (I)" },
  { name: "en-US-Neural2-J", label: "US Male (J)" },
  { name: "en-GB-Neural2-A", label: "UK Female (A)" },
  { name: "en-GB-Neural2-C", label: "UK Female (C)" },
  { name: "en-GB-Neural2-F", label: "UK Female (F)" },
  { name: "en-GB-Neural2-B", label: "UK Male (B)" },
  { name: "en-GB-Neural2-D", label: "UK Male (D)" },
  { name: "en-AU-Neural2-A", label: "AU Female (A)" },
  { name: "en-AU-Neural2-C", label: "AU Male (C)" },
];

export function useGoogleTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const speak = useCallback(async (
    text: string,
    voice?: string,
    onEnd?: () => void,
    speed?: number
  ) => {
    if (!text) return;
    abortRef.current = false;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      const { data, error } = await supabase.functions.invoke("tts", {
        body: { text, voice: voice || undefined },
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

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (!abortRef.current) onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}
