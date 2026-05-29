import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const map: Record<Severity, { bg: string; text: string; label: string }> = {
  SEV0: { bg: "bg-[color:var(--color-sev-0)]/15 border-[color:var(--color-sev-0)]/40", text: "text-[color:var(--color-sev-0)]", label: "SEV0 · Critical" },
  SEV1: { bg: "bg-[color:var(--color-sev-1)]/15 border-[color:var(--color-sev-1)]/40", text: "text-[color:var(--color-sev-1)]", label: "SEV1 · High" },
  SEV2: { bg: "bg-[color:var(--color-sev-2)]/15 border-[color:var(--color-sev-2)]/40", text: "text-[color:var(--color-sev-2)]", label: "SEV2 · Medium" },
  SEV3: { bg: "bg-[color:var(--color-sev-3)]/15 border-[color:var(--color-sev-3)]/40", text: "text-[color:var(--color-sev-3)]", label: "SEV3 · Low" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const m = map[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", m.bg, m.text, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function RoleBadge({ role, level }: { role?: string; level?: number }) {
  if (!role) return null;
  const tone = level && level >= 4 ? "bg-primary/15 text-primary border-primary/30"
    : level && level >= 2 ? "bg-info/15 text-info border-info/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide", tone)}>
      L{level} · {role.replace("_", " ")}
    </span>
  );
}

export function StatusDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
}
