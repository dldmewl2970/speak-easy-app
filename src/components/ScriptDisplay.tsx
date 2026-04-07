import { motion } from "framer-motion";

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
        오늘의 스크립트
      </p>
      <p
        className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-relaxed text-foreground"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {script}
      </p>
    </motion.div>
  );
};

export default ScriptDisplay;
