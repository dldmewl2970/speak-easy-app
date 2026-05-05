import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, Save, Trash2, Edit2, ArrowLeft, Play, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SavedScript {
  id: string;
  name: string;
  text: string;
  created_at: string;
}

export function splitSentences(t: string, divider?: RegExp) {
  return t
    .split(divider ?? /[\n.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function compileDivider(mode: string, custom: string): { regex: RegExp | null; error: string | null } {
  if (mode === "default") return { regex: /[\n.]/, error: null };
  if (!custom.trim()) return { regex: null, error: "Enter a regex pattern" };
  try {
    return { regex: new RegExp(custom), error: null };
  } catch (e) {
    return { regex: null, error: "Invalid regular expression" };
  }
}

const Scripts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [text, setText] = useState("");
  const [scriptName, setScriptName] = useState("");
  const [saved, setSaved] = useState<SavedScript[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dividerMode, setDividerMode] = useState<"default" | "custom">("default");
  const [customRegex, setCustomRegex] = useState("");

  // Load scripts from DB
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    const fetchScripts = async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("id, name, text, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load scripts");
      } else {
        setSaved(data || []);
      }
      setIsLoading(false);
    };
    fetchScripts();
  }, [user, authLoading]);

  const charCount = text.length;
  const MAX_CHARS = 10000;

  const handleSave = async (): Promise<{ saved: SavedScript; sentences: string[] } | null> => {
    if (!text.trim() || !user) return null;
    const { regex, error: rxErr } = compileDivider(dividerMode, customRegex);
    if (rxErr || !regex) {
      toast.error(rxErr || "Invalid divider");
      return null;
    }
    const sentences = splitSentences(text, regex);
    if (sentences.length === 0) {
      toast.error("No sentences parsed from text");
      return null;
    }
    const name = scriptName.trim() || `Script ${saved.length + 1}`;
    const { data, error } = await supabase
      .from("scripts")
      .insert({ name, text, user_id: user.id })
      .select("id, name, text, created_at")
      .single();
    if (error) {
      toast.error("Failed to save script");
      return null;
    }
    setSaved([data, ...saved]);
    setScriptName("");
    setText("");
    toast.success("Script saved!");
    return { saved: data, sentences };
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setSaved(saved.filter((s) => s.id !== id));
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    const { error } = await supabase
      .from("scripts")
      .update({ name: editingName.trim() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to rename");
      return;
    }
    setSaved(saved.map((s) => (s.id === id ? { ...s, name: editingName.trim() } : s)));
    setEditingId(null);
  };

  const handleLoad = (script: SavedScript) => {
    setText(script.text);
    setScriptName(script.name);
  };

  const handleStartPractice = async () => {
    if (user) {
      const result = await handleSave();
      if (!result) return;
      sessionStorage.setItem("speakup-active-sentences", JSON.stringify(result.sentences));
      navigate("/");
      return;
    }
    const { regex, error: rxErr } = compileDivider(dividerMode, customRegex);
    if (rxErr || !regex) {
      toast.error(rxErr || "Invalid divider");
      return;
    }
    const sentences = splitSentences(text, regex);
    if (sentences.length === 0) return;
    sessionStorage.setItem("speakup-active-sentences", JSON.stringify(sentences));
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">My Scripts</h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-1.5 text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Save
              </Button>
            )}
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
                className={`text-xs ${charCount > MAX_CHARS ? "text-destructive" : "text-muted-foreground"}`}
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

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1.5 sm:w-56">
                <label className="text-xs font-medium text-muted-foreground">Divider Options</label>
                <Select
                  value={dividerMode}
                  onValueChange={(v) => setDividerMode(v as "default" | "custom")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Enter or Period</SelectItem>
                    <SelectItem value="custom">Custom Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dividerMode === "custom" && (
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Custom Regex (e.g. <code>,|\/</code>)
                  </label>
                  <Input
                    value={customRegex}
                    onChange={(e) => setCustomRegex(e.target.value)}
                    placeholder=",|\\/"
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}
            </div>

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
                disabled={!text.trim() || !user}
                className="gap-2 shrink-0"
                title={!user ? "Sign in to save scripts" : undefined}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>

            {!user && (
              <p className="text-xs text-muted-foreground text-center">
                Sign in to save scripts to the cloud and access them anywhere.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleStartPractice}
                disabled={charCount === 0 || charCount > MAX_CHARS}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Start Practice ({splitSentences(text, compileDivider(dividerMode, customRegex).regex ?? undefined).length} sentences)
              </Button>
            </div>
          </div>

          {/* Saved scripts */}
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : saved.length > 0 ? (
            <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Saved Scripts
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
                        <button onClick={() => handleLoad(s)} className="flex-1 text-left truncate mr-3">
                          <span className="text-sm font-medium text-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{count} sentences</span>
                        </button>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
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
          ) : user ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No saved scripts yet. Write something above and save it!
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Scripts;
