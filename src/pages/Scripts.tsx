import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, Save, Trash2, Edit2, ArrowLeft, Play } from "lucide-react";
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

const Scripts = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [scriptName, setScriptName] = useState("");
  const [saved, setSaved] = useState<SavedScript[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    setSaved(loadSavedScripts());
  }, []);

  const charCount = text.length;
  const MAX_CHARS = 3000;

  const handleSave = () => {
    if (!text.trim()) return;
    const name = scriptName.trim() || `Script ${saved.length + 1}`;
    const entry: SavedScript = { id: crypto.randomUUID(), name, text, createdAt: Date.now() };
    const updated = [entry, ...saved].slice(0, 20);
    setSaved(updated);
    saveToDisk(updated);
    setScriptName("");
    setText("");
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

  const handleStartPractice = () => {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;
    // Store in sessionStorage so Index can pick it up
    sessionStorage.setItem("speakup-active-sentences", JSON.stringify(sentences));
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              My Scripts
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input section */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Enter sentences to practice (separated by Enter or period)
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
                if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
              }}
              placeholder="Enter your scripts."
              className="min-h-[200px] resize-y text-base"
            />

            <div className="flex items-center gap-3">
              <Input
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="Script name (e.g. Business English)"
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

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleStartPractice}
                disabled={charCount === 0 || charCount > MAX_CHARS}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                연습 시작 ({splitSentences(text).length}문장)
              </Button>
            </div>
          </div>

          {/* Saved scripts */}
          {saved.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                저장된 스크립트
              </p>
              <div className="space-y-2">
                {saved.map((s) => {
                  const count = splitSentences(s.text).length;
                  const isEditing = editingId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleRename(s.id); }}
                          className="flex-1 flex items-center gap-2 mr-2"
                        >
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-sm"
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
      </main>
    </div>
  );
};

export default Scripts;
