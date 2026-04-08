
CREATE TABLE public.sentence_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_text TEXT NOT NULL UNIQUE,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sentence_images ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cached images
CREATE POLICY "Anyone can view cached images"
ON public.sentence_images
FOR SELECT
TO authenticated
USING (true);

-- Anyone authenticated can insert cached images
CREATE POLICY "Anyone can insert cached images"
ON public.sentence_images
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for fast lookup by sentence text
CREATE INDEX idx_sentence_images_text ON public.sentence_images (sentence_text);
