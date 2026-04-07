import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "speakup-custom-scripts";

interface SavedScript {
  id: string;
  text: string;
  createdAt: number;
}

function loadSavedScripts(): SavedScript[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToDisk(scripts: SavedScript[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

interface CustomScriptInputProps {
  onSubmit: (sentences: string[]) => void;
  isActive: boolean;
  onClear: () => void;
}

const CustomScriptInput = ({ onSubmit, isActive, onClear }: CustomScriptInputProps) => {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState<SavedScript[]>([]);

  useEffect(() => {
    setSaved(loadSavedScripts());
  }, []);

  const charCount = text.length;
  const MAX_CHARS = 3000;

  const splitSentences = (t: string) =>
    t.split(/[\n.]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleSubmit = () => {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;
    onSubmit(sentences);
    setIsOpen(false);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const entry: SavedScript = { id: crypto.randomUUID(), text, createdAt: Date.now() };
    const updated = [entry, ...saved].slice(0, 10); // max 10
    setSaved(updated);
    saveToDisk(updated);
  };

  const handleDelete = (id: string) => {
    const updated = saved.filter((s) => s.id !== id);
    setSaved(updated);
    saveToDisk(updated);
  };

  const handleLoad = (script: SavedScript) => {
    setText(script.text);
  };

  const handleClear = () => {
    setText("");
    onClear();
    setIsOpen(false);
  };

  if (isActive) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClear}
        className="gap-2 text-muted-foreground"
      >
        <X className="w-4 h-4" />
        커스텀 해제
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 text-muted-foreground"
      >
        <FileText className="w-4 h-4" />
        내 스크립트
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 px-6"
          >
            <div className="max-w-3xl mx-auto rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  연습할 문장을 입력하세요 (엔터로 구분)
                </p>
                <span
                  className={`text-xs ${
                    charCount > MAX_CHARS ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    setText(e.target.value);
                  }
                }}
                placeholder={`I have plans tomorrow.\nCould you tell me where the station is?\nI've been studying English for three years.`}
                className="min-h-[160px] resize-y text-base"
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="gap-2 text-muted-foreground"
                >
                  <Save className="w-4 h-4" />
                  저장
                </Button>
                <div className="flex gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={charCount === 0 || charCount > MAX_CHARS}
                  >
                    연습 시작 ({splitSentences(text).length}문장)
                  </Button>
                </div>
              </div>

              {/* Saved scripts */}
              {saved.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    저장된 스크립트
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {saved.map((s) => {
                      const parts = splitSentences(s.text);
                      const preview = parts.slice(0, 2).join(" / ");
                      const count = parts.length;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-lg border border-border px-4 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <button
                            onClick={() => handleLoad(s)}
                            className="flex-1 text-left text-sm text-foreground truncate mr-3"
                          >
                            <span className="text-muted-foreground mr-2">{count}문장</span>
                            {preview}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomScriptInput;
