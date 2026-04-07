import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CustomScriptInputProps {
  onSubmit: (sentences: string[]) => void;
  isActive: boolean;
  onClear: () => void;
}

const CustomScriptInput = ({ onSubmit, isActive, onClear }: CustomScriptInputProps) => {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const charCount = text.length;
  const MAX_CHARS = 3000;

  const handleSubmit = () => {
    const sentences = text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (sentences.length === 0) return;
    onSubmit(sentences);
    setIsOpen(false);
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
              <div className="flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={charCount === 0 || charCount > MAX_CHARS}
                >
                  연습 시작 ({text.split("\n").filter((s) => s.trim()).length}문장)
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomScriptInput;
