import { FileText } from "lucide-react";

interface ScriptDisplayProps {
  script: string;
}

const ScriptDisplay = ({ script }: ScriptDisplayProps) => {
  return (
    <div className="relative rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-accent rounded-t-2xl" />
      <div className="p-8 md:p-10">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Practice Script
          </p>
        </div>
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
            <p className="text-base font-semibold">No script loaded</p>
            <p className="text-sm mt-1.5 opacity-70">
              Tap "My Scripts" in the top right to add sentences
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptDisplay;
