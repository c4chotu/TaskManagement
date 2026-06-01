import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check, ChevronRight, X, Play, Pause, Square, Clock, LayoutGrid,
  List as ListIcon, Calendar as CalIcon, GitBranch, MoreHorizontal,
  Bell, Plus, Filter, ArrowUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { findUser } from "@/lib/mock-data";

/* ---------- PageHeader (Zoho project header bar) ---------- */
export function ZPageHeader({
  title, subtitle, breadcrumbs, actions, banner,
}: {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          {breadcrumbs && (
            <nav className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {b.to ? (
                    <Link to={b.to} className="hover:text-foreground">{b.label}</Link>
                  ) : <span>{b.label}</span>}
                  {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
                </span>
              ))}
            </nav>
          )}
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {banner}
    </div>
  );
}

/* ---------- View switcher (List / Kanban / Calendar / Gantt) ---------- */
export type ZView = "list" | "kanban" | "calendar" | "gantt" | "plain";
export function ZViewSwitcher({
  value, onChange, views = ["list", "kanban", "calendar", "gantt"],
}: { value: ZView; onChange: (v: ZView) => void; views?: ZView[] }) {
  const icons: Record<ZView, any> = {
    list: ListIcon, plain: ListIcon, kanban: LayoutGrid, calendar: CalIcon, gantt: GitBranch,
  };
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5">
      {views.map((v) => {
        const Icon = icons[v];
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={v}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] capitalize transition ${
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{v}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Status / Priority / Severity pills ---------- */
export function ZPill({ color, children, dot = true }: { color: string; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
      style={{ background: `${color}14`, borderColor: `${color}40`, color }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

const SEV_COLORS: Record<string, string> = {
  SEV0: "#ef4444", SEV1: "#f97316", SEV2: "#eab308", SEV3: "#3b82f6",
};
export function ZSeverityPill({ sev }: { sev: string }) {
  return <ZPill color={SEV_COLORS[sev] ?? "#64748b"}>{sev}</ZPill>;
}

const PRIO_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04", LOW: "#0891b2",
};
export function ZPriorityPill({ p }: { p?: string }) {
  if (!p) return null;
  return <ZPill color={PRIO_COLORS[p] ?? "#64748b"} dot={false}>{p}</ZPill>;
}

/* ---------- Avatar stack ---------- */
export function ZAvatarStack({ ids, size = 22, max = 3 }: { ids: string[]; size?: number; max?: number }) {
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((uid) => {
        const u = findUser(uid);
        return (
          <Avatar key={uid} className="border-2 border-card" style={{ width: size, height: size }}>
            <AvatarFallback className="bg-muted text-[9px]">
              {u?.name?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-medium text-muted-foreground"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ---------- Bulk action bar ---------- */
export function ZBulkBar({
  count, onClear, children,
}: { count: number; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-2xl ring-1 ring-primary/20">
      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{count}</span>
      <span className="text-[12px] text-muted-foreground">selected</span>
      <span className="mx-1 h-4 w-px bg-border" />
      {children}
      <button onClick={onClear} className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ---------- Stepper header ---------- */
export function ZStepper({
  steps, current,
}: { steps: { label: string; description?: string }[]; current: number }) {
  return (
    <ol className="flex w-full items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={i} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold transition ${
                  done ? "bg-primary text-primary-foreground"
                    : active ? "bg-primary/15 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="hidden sm:block">
                <p className={`text-[12px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < current ? "bg-primary" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Timer widget ---------- */
export function ZTimerWidget({
  running, elapsedSeconds, onStart, onStop, label,
}: {
  running: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
  label?: string;
}) {
  const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1 ${running ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <Clock className={`h-3.5 w-3.5 ${running ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
      <div className="leading-tight">
        <div className="font-mono text-[12px] font-semibold tabular-nums">{hh}:{mm}:{ss}</div>
        {label && <div className="text-[9px] text-muted-foreground truncate max-w-[140px]">{label}</div>}
      </div>
      {running ? (
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onStop}>
          <Square className="h-3 w-3 fill-current" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={onStart}>
          <Play className="h-3 w-3 fill-current" />
        </Button>
      )}
    </div>
  );
}

/* ---------- Stat strip card ---------- */
export function ZStat({
  label, value, sub, tone = "primary", icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "primary" | "info" | "warning" | "destructive" | "muted";
  icon?: React.ElementType;
}) {
  const tones = {
    primary: "from-emerald-50 ring-emerald-200/60",
    info: "from-blue-50 ring-blue-200/60",
    warning: "from-amber-50 ring-amber-200/60",
    destructive: "from-red-50 ring-red-200/60",
    muted: "from-slate-50 ring-slate-200/60",
  } as const;
  return (
    <div className={`rounded-md border border-border bg-gradient-to-br to-card p-3 ring-1 ring-inset ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ---------- Automation rule card (WHEN/IF/THEN chips) ---------- */
export function ZRuleCard({
  name, when, conditions = [], actions = [], enabled, onToggle, onEdit, onDelete, badge,
}: {
  name: string;
  when: string;
  conditions?: string[];
  actions: string[];
  enabled: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  badge?: ReactNode;
}) {
  return (
    <div className={`group rounded-lg border bg-card p-4 transition ${enabled ? "border-border" : "border-dashed border-border opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{name}</h4>
            {badge}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono font-medium uppercase text-blue-700 dark:text-blue-300">WHEN</span>
            <span className="text-foreground">{when}</span>
            {conditions.length > 0 && (
              <>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono font-medium uppercase text-amber-700 dark:text-amber-300">IF</span>
                {conditions.map((c, i) => (
                  <span key={i} className="rounded bg-muted px-2 py-0.5 text-foreground/80">{c}</span>
                ))}
              </>
            )}
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono font-medium uppercase text-emerald-700 dark:text-emerald-300">THEN</span>
            {actions.map((a, i) => (
              <span key={i} className="rounded bg-muted px-2 py-0.5 text-foreground/80">{a}</span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggle}
            className={`relative h-5 w-9 rounded-full transition ${enabled ? "bg-primary" : "bg-muted"}`}
            aria-label="Toggle rule"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${enabled ? "left-4" : "left-0.5"}`}
            />
          </button>
          {onEdit && (
            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onEdit}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- ToolStrip (sort/filter/group buttons) ---------- */
export function ZToolStrip({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}
export function ZToolBtn({
  icon: Icon, label, active, onClick,
}: { icon?: React.ElementType; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}
