import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const imageCache = new Map<string, string>();

export function useSentenceImage(sentence: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sentence) {
      setImageUrl(null);
      return;
    }

    // Check cache first
    if (imageCache.has(sentence)) {
      setImageUrl(imageCache.get(sentence)!);
      return;
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setImageUrl(null);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sentence-image", {
          body: { sentence },
        });

        if (controller.signal.aborted) return;

        if (error || !data?.imageUrl) {
          console.error("Image generation error:", error || "No image");
          setLoading(false);
          return;
        }

        imageCache.set(sentence, data.imageUrl);
        setImageUrl(data.imageUrl);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Image fetch error:", e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [sentence]);

  return { imageUrl, loading };
}
