import { motion } from "framer-motion";
import { FileText } from "lucide-react";

interface ScriptDisplayProps {
  script: string;
}

const ScriptDisplay = ({ script }: ScriptDisplayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="rounded-2xl bg-card border border-border p-8 md:p-12 shadow-lg"
    >
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
        연습 스크립트
      </p>
      {script ? (
        <p
          className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-relaxed text-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {script}
        </p>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <FileText className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-lg font-medium">스크립트를 불러와주세요</p>
          <p className="text-sm mt-1">우측 상단의 "내 스크립트"를 눌러 문장을 추가하세요</p>
        </div>
      )}
    </motion.div>
  );
};

export default ScriptDisplay;
