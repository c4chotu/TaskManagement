import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Search, RefreshCw } from "lucide-react";

export interface FilterFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: "multi" | "single" | "date-range" | "boolean";
  options?: FilterFieldOption[];
}

export type FilterValues = Record<string, unknown>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply?: () => void;
  onReset?: () => void;
  title?: string;
}

/**
 * Zoho-style slide-in Filter panel. Sections expand on click, support
 * multi-select with color dots, single-select, date range, and booleans.
 */
export function ZFilterPanel({
  open,
  onOpenChange,
  fields,
  values,
  onChange,
  onApply,
  onReset,
  title = "Filter",
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [matchAll, setMatchAll] = useState(true);

  const filteredFields = fields.filter((f) =>
    !search || f.label.toLowerCase().includes(search.toLowerCase()),
  );

  const update = (key: string, value: unknown) => onChange({ ...values, [key]: value });

  const activeBadge = (f: FilterField) => {
    const v = values[f.key];
    if (Array.isArray(v) && v.length) return v.length;
    if (typeof v === "string" && v) return 1;
    if (typeof v === "boolean" && v) return 1;
    if (v && typeof v === "object" && ("from" in v || "to" in v)) return 1;
    return 0;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[380px] flex-col p-0 sm:max-w-[380px]">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-4 py-3 space-y-0">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          <button
            onClick={() => {
              onChange({});
              onReset?.();
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Reset
          </button>
        </SheetHeader>

        <div className="border-b border-border bg-card px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter Search"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredFields.map((f) => {
            const count = activeBadge(f);
            const isOpen = expanded === f.key;
            return (
              <div key={f.key} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : f.key)}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-medium transition hover:bg-muted/40 ${
                    isOpen ? "bg-primary/5 text-primary" : "text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{f.label}</span>
                    {count > 0 && (
                      <Badge variant="default" className="h-4 min-w-4 rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
                        {count}
                      </Badge>
                    )}
                  </div>
                  {f.type === "multi" || f.type === "single" ? (
                    <ConditionPicker
                      value={(values[`${f.key}__op`] as string) ?? "is"}
                      onChange={(v) => update(`${f.key}__op`, v)}
                    />
                  ) : (
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  )}
                </button>

                {isOpen && (
                  <div className="space-y-2 bg-card px-4 pb-3 pt-1">
                    {f.type === "multi" && (
                      <MultiOptions field={f} values={values} update={update} />
                    )}
                    {f.type === "single" && (
                      <SingleOption field={f} values={values} update={update} />
                    )}
                    {f.type === "date-range" && (
                      <DateRange field={f} values={values} update={update} />
                    )}
                    {f.type === "boolean" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`bool-${f.key}`}
                          checked={!!values[f.key]}
                          onCheckedChange={(v) => update(f.key, !!v)}
                        />
                        <Label htmlFor={`bool-${f.key}`} className="text-xs font-normal">
                          {f.label}
                        </Label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredFields.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">No filters match.</p>
          )}
        </div>

        <div className="border-t border-border bg-card px-4 py-3">
          <div className="mb-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={!matchAll} onChange={() => setMatchAll(false)} className="accent-primary" />
              Any of these
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={matchAll} onChange={() => setMatchAll(true)} className="accent-primary" />
              All of these
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-primary text-primary-foreground"
              onClick={() => {
                onApply?.();
                onOpenChange(false);
              }}
            >
              Find
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ConditionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-6 w-[70px] border-border bg-background text-[10px]"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="is">Is</SelectItem>
        <SelectItem value="not">Is not</SelectItem>
      </SelectContent>
    </Select>
  );
}

function MultiOptions({ field, values, update }: { field: FilterField; values: FilterValues; update: (k: string, v: unknown) => void }) {
  const current = (values[field.key] as string[]) ?? [];
  const toggle = (val: string) => {
    if (current.includes(val)) update(field.key, current.filter((x) => x !== val));
    else update(field.key, [...current, val]);
  };
  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
      {(field.options ?? []).map((opt) => {
        const checked = current.includes(opt.value);
        return (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/40"
          >
            <span className="flex items-center gap-2">
              <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} />
              <span>{opt.label}</span>
            </span>
            {opt.color && <span className="h-2 w-2 rounded-full" style={{ background: opt.color }} />}
          </label>
        );
      })}
    </div>
  );
}

function SingleOption({ field, values, update }: { field: FilterField; values: FilterValues; update: (k: string, v: unknown) => void }) {
  return (
    <Select value={(values[field.key] as string) ?? ""} onValueChange={(v) => update(field.key, v)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {(field.options ?? []).map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateRange({ field, values, update }: { field: FilterField; values: FilterValues; update: (k: string, v: unknown) => void }) {
  const range = (values[field.key] as { from?: string; to?: string }) ?? {};
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[10px] text-muted-foreground">From</Label>
        <Input
          type="date"
          value={range.from ?? ""}
          onChange={(e) => update(field.key, { ...range, from: e.target.value })}
          className="h-7 text-xs"
        />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">To</Label>
        <Input
          type="date"
          value={range.to ?? ""}
          onChange={(e) => update(field.key, { ...range, to: e.target.value })}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

/** Compact trigger button with count badge. */
export function ZFilterButton({
  onClick,
  count,
  children = "Filter",
}: {
  onClick: () => void;
  count: number;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
    >
      <RefreshCw className="h-3 w-3" />
      {children}
      {count > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
