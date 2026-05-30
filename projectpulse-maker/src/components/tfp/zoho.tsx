import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Zoho-style widget panel: titlebar with optional menu + scrollable body.
 * Matches the "My Work Items Due Today", "Bugs Status" etc. cards in Zoho Projects.
 */
export function ZWidget({
  title,
  subtitle,
  actions,
  menu,
  className = "",
  bodyClassName = "",
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  menu?: { label: string; onClick: () => void }[];
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col rounded-md border border-border bg-card shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {menu && menu.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menu.map((m) => (
                  <DropdownMenuItem key={m.label} onClick={m.onClick} className="text-xs">
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

/** Empty state used inside ZWidget when no data is available. */
export function ZEmpty({
  icon: Icon,
  title,
  hint,
}: {
  icon?: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/40" />}
      <p className="text-xs font-medium text-foreground/70">{title}</p>
      {hint && <p className="max-w-[28ch] text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Big colored count tile (e.g. "Open Tasks · 2") used in the home/dashboard.
 */
export function ZCountTile({
  label,
  count,
  tone = "primary",
  to,
}: {
  label: string;
  count: number;
  tone?: "primary" | "info" | "warning" | "destructive" | "muted";
  to?: string;
}) {
  const tones = {
    primary: "from-emerald-50 to-emerald-100/40 text-emerald-700 ring-emerald-200",
    info: "from-blue-50 to-blue-100/40 text-blue-700 ring-blue-200",
    warning: "from-amber-50 to-amber-100/40 text-amber-700 ring-amber-200",
    destructive: "from-red-50 to-red-100/40 text-red-700 ring-red-200",
    muted: "from-slate-50 to-slate-100/40 text-slate-700 ring-slate-200",
  } as const;
  const inner = (
    <div
      className={`flex h-full flex-col justify-between rounded-md bg-gradient-to-br p-3 ring-1 ring-inset transition hover:shadow-sm ${tones[tone]}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-3xl font-semibold tabular-nums leading-none">{count}</span>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

/**
 * Zoho-style group/status header bar — e.g. "Open · 5" colored band above
 * a sub-table. Click to collapse.
 */
export function ZGroupBar({
  label,
  count,
  color = "var(--color-primary)",
  collapsed,
  onToggle,
}: {
  label: string;
  count?: number;
  color?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-y border-border bg-muted/40 px-3 py-1.5 text-left text-[12px] font-semibold text-foreground/80 hover:bg-muted/60"
    >
      {collapsed ? (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="uppercase tracking-wide">{label}</span>
      {typeof count === "number" && (
        <span className="ml-1 text-[11px] font-normal text-muted-foreground">({count})</span>
      )}
    </button>
  );
}

/**
 * Zoho-style filter / toolbar that sits above a list. Holds a left cluster
 * of view chips and a right cluster of actions.
 */
export function ZToolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">{left}</div>
      <div className="flex flex-wrap items-center gap-1">{right}</div>
    </div>
  );
}

/**
 * Pill-shaped filter chip used in ZToolbar (active vs inactive look).
 */
export function ZChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Horizontal Zoho-style project tabs (Dashboard · Feed · Tasks · …).
 */
export function ZProjectTabs({
  tabs,
  current,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  current: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="flex items-end gap-0 overflow-x-auto border-b border-border bg-card px-3">
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative whitespace-nowrap px-3 py-2.5 text-[12.5px] font-medium transition ${
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
