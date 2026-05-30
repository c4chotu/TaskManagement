import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Timer } from "lucide-react";

function fmt(ms: number) {
  const negative = ms < 0;
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000) % 60;
  const h = Math.floor(abs / 3_600_000);
  return `${negative ? "-" : ""}${h}h ${m}m`;
}

export function SlaCountdown({
  label,
  target,
  done,
}: {
  label: string;
  target: string;
  done?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(target).getTime() - now;
  const breached = !done && diff < 0;
  return (
    <div
      className={cn(
        "rounded border p-3",
        done
          ? "border-primary/40 bg-primary/5"
          : breached
            ? "border-destructive/40 bg-destructive/5"
            : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Timer
            className={cn("h-3.5 w-3.5", breached ? "text-destructive" : "text-muted-foreground")}
          />
        )}
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          done ? "text-primary" : breached ? "text-destructive" : "",
        )}
      >
        {done ? "Met" : fmt(diff)}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {breached ? "BREACHED" : done ? "Acknowledged in time" : "remaining"}
      </p>
    </div>
  );
}
