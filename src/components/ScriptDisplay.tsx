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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl bg-card border border-border p-8 md:p-10 shadow-sm overflow-hidden"
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-accent rounded-t-2xl" />
      
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-5">
        Practice Script
      </p>
      {script ? (
        <p
          className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed text-foreground tracking-tight"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {script}
        </p>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 opacity-50" />
          </div>
          <p className="text-base font-semibold">스크립트를 불러와주세요</p>
          <p className="text-sm mt-1.5 opacity-70">
            우측 상단의 "내 스크립트"를 눌러 문장을 추가하세요
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ScriptDisplay;
