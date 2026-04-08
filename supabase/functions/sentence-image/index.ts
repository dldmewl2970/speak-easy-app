import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple stop words to filter out for better search queries
const STOP_WORDS = new Set([
  "i", "me", "my", "myself", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "his", "her", "its", "a", "an", "the", "and", "but", "or",
  "for", "nor", "not", "so", "yet", "to", "of", "in", "on", "at", "by",
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "shall", "should", "may",
  "might", "must", "can", "could", "that", "this", "these", "those", "with",
  "from", "into", "about", "than", "very", "just", "also", "really", "quite",
  "there", "here", "when", "where", "how", "what", "which", "who", "whom",
]);

function extractKeywords(sentence: string): string {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Take up to 3 most meaningful words
  return words.slice(0, 3).join(" ") || sentence.split(" ").slice(0, 2).join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sentence } = await req.json();
    if (!sentence) {
      return new Response(JSON.stringify({ error: "No sentence provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check DB cache first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from("sentence_images")
      .select("image_data")
      .eq("sentence_text", sentence)
      .maybeSingle();

    if (cached?.image_data) {
      return new Response(JSON.stringify({ imageUrl: cached.image_data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search Pexels for a relevant image
    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    if (!pexelsKey) {
      return new Response(JSON.stringify({ error: "Pexels API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = extractKeywords(sentence);
    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: { Authorization: pexelsKey },
      }
    );

    if (!pexelsRes.ok) {
      const errText = await pexelsRes.text();
      console.error("Pexels API error:", errText);
      return new Response(JSON.stringify({ error: "Image search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pexelsData = await pexelsRes.json();
    const photos = pexelsData.photos || [];

    if (photos.length === 0) {
      return new Response(JSON.stringify({ error: "No images found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a random photo from results for variety
    const photo = photos[Math.floor(Math.random() * photos.length)];
    const imageUrl = photo.src.medium; // ~350x250, fast loading

    // Cache in DB (fire and forget)
    supabase
      .from("sentence_images")
      .insert({ sentence_text: sentence, image_data: imageUrl })
      .then(({ error }) => {
        if (error) console.error("Cache insert error:", error.message);
      });

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
