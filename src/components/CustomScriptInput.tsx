import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Save, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "speakup-custom-scripts";

interface SavedScript {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

function loadSavedScripts(): SavedScript[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // migrate old format without name
    return data.map((s: any) => ({
      ...s,
      name: s.name || `Script ${new Date(s.createdAt).toLocaleDateString()}`,
    }));
  } catch {
    return [];
  }
}

function saveToDisk(scripts: SavedScript[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

export function splitSentences(t: string) {
  return t
    .split(/[\n.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface CustomScriptInputProps {
  onSubmit: (sentences: string[]) => void;
  isActive: boolean;
  onClear: () => void;
}

const CustomScriptInput = ({ onSubmit, isActive, onClear }: CustomScriptInputProps) => {
  const [text, setText] = useState("");
  const [scriptName, setScriptName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState<SavedScript[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    setSaved(loadSavedScripts());
  }, []);

  const charCount = text.length;
  const MAX_CHARS = 3000;

  const handleSubmit = () => {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;
    onSubmit(sentences);
    setIsOpen(false);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const name = scriptName.trim() || `Script ${saved.length + 1}`;
    const entry: SavedScript = { id: crypto.randomUUID(), name, text, createdAt: Date.now() };
    const updated = [entry, ...saved].slice(0, 20);
    setSaved(updated);
    saveToDisk(updated);
    setScriptName("");
  };

  const handleDelete = (id: string) => {
    const updated = saved.filter((s) => s.id !== id);
    setSaved(updated);
    saveToDisk(updated);
  };

  const handleRename = (id: string) => {
    if (!editingName.trim()) return;
    const updated = saved.map((s) =>
      s.id === id ? { ...s, name: editingName.trim() } : s
    );
    setSaved(updated);
    saveToDisk(updated);
    setEditingId(null);
  };

  const handleLoad = (script: SavedScript) => {
    setText(script.text);
    setScriptName(script.name);
  };

  const handleClear = () => {
    setText("");
    setScriptName("");
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
        Clear Custom
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
            className="absolute top-full left-0 right-0 z-50 mt-2 px-4"
          >
            <div className="max-w-6xl mx-auto rounded-2xl bg-card border border-border p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  연습할 문장을 입력하세요 (엔터 또는 마침표로 구분)
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
                placeholder="Enter your scripts."
                className="min-h-[100px] resize-y text-base px-[5px] py-[5px]"
              />
              <div className="flex items-center gap-3">
                <Input
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="스크립트 이름 (예: 비즈니스 영어)"
                  className="flex-1 h-9 text-sm"
                  maxLength={50}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="gap-2 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  저장
                </Button>
              </div>
              <div className="flex justify-end gap-3">
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

              {/* Saved scripts */}
              {saved.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    저장된 스크립트
                  </p>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {saved.map((s) => {
                      const count = splitSentences(s.text).length;
                      const isEditing = editingId === s.id;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          {isEditing ? (
                            <form
                              onSubmit={(e) => { e.preventDefault(); handleRename(s.id); }}
                              className="flex-1 flex items-center gap-2 mr-2"
                            >
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                maxLength={50}
                                onBlur={() => handleRename(s.id)}
                              />
                            </form>
                          ) : (
                            <button
                              onClick={() => handleLoad(s)}
                              className="flex-1 text-left truncate mr-3"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {s.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {count}문장
                              </span>
                            </button>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(s.id);
                                setEditingName(s.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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
