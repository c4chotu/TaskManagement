import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Download, CheckCircle2, Loader2, FileSpreadsheet, FileText, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type DownloadStatus = "queued" | "running" | "ready" | "failed";

export interface DownloadJob {
  id: string;
  name: string;
  module: "Issues" | "Tasks" | "Time Logs" | "Reports" | string;
  format: "xlsx" | "csv" | "pdf";
  progress: number; // 0-100
  status: DownloadStatus;
  createdAt: string;
  url?: string;
  error?: string;
  rowCount?: number;
}

interface Ctx {
  jobs: DownloadJob[];
  enqueue: (j: Omit<DownloadJob, "id" | "createdAt" | "progress" | "status">) => string;
  remove: (id: string) => void;
  clear: () => void;
}

const DownloadsCtx = createContext<Ctx | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);

  const enqueue: Ctx["enqueue"] = useCallback((j) => {
    const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const job: DownloadJob = {
      id,
      createdAt: new Date().toISOString(),
      progress: 0,
      status: "queued",
      ...j,
    };
    setJobs((prev) => [job, ...prev]);
    // simulate async generation
    setTimeout(() => setJobs((p) => p.map((x) => (x.id === id ? { ...x, status: "running" } : x))), 250);
    const tick = (p: number) => {
      setJobs((prev) => prev.map((x) => (x.id === id ? { ...x, progress: p } : x)));
    };
    let p = 0;
    const iv = setInterval(() => {
      p += Math.max(4, Math.round(Math.random() * 14));
      if (p >= 100) {
        clearInterval(iv);
        setJobs((prev) =>
          prev.map((x) =>
            x.id === id
              ? { ...x, progress: 100, status: "ready", url: `data:text/plain,${encodeURIComponent(`${j.name} export`)}` }
              : x,
          ),
        );
      } else {
        tick(p);
      }
    }, 450);
    return id;
  }, []);

  const remove = useCallback((id: string) => setJobs((p) => p.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setJobs([]), []);

  const value = useMemo(() => ({ jobs, enqueue, remove, clear }), [jobs, enqueue, remove, clear]);
  return (
    <DownloadsCtx.Provider value={value}>
      {children}
      <DownloadsTray />
    </DownloadsCtx.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadsCtx);
  if (!ctx) throw new Error("useDownloads must be used inside DownloadsProvider");
  return ctx;
}

function fmtIcon(f: string) {
  if (f === "xlsx" || f === "csv") return FileSpreadsheet;
  return FileText;
}

export function DownloadsTray() {
  const { jobs, remove } = useDownloads();
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);

  // auto-show when a new job arrives
  useEffect(() => {
    if (jobs.length > 0) setOpen(true);
  }, [jobs.length]);

  if (!open || jobs.length === 0) return null;

  const active = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const visible = minimized ? jobs.slice(0, 1) : jobs.slice(0, 4);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl ring-1 ring-primary/10">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Export Status</span>
          {active > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {active} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Link to="/downloads" className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground" title="View all">
            <span className="text-[10px] underline-offset-2 hover:underline">View all</span>
          </Link>
          <button
            onClick={() => setMinimized((v) => !v)}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            title="Hide"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
        {visible.map((job) => {
          const Icon = fmtIcon(job.format);
          return (
            <li key={job.id} className="space-y-1.5 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted">
                  {job.status === "running" || job.status === "queued" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : job.status === "ready" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium leading-tight">{job.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {job.module} · {job.format.toUpperCase()}
                    {job.rowCount ? ` · ${job.rowCount} rows` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {job.status === "ready" && job.url && (
                    <a
                      href={job.url}
                      download={`${job.name}.${job.format}`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Icon className="h-3 w-3" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => remove(job.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {(job.status === "running" || job.status === "queued") && (
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
              {job.status === "failed" && (
                <p className="text-[10px] text-destructive">{job.error ?? "Export failed"}</p>
              )}
            </li>
          );
        })}
      </ul>
      {!minimized && jobs.length > visible.length && (
        <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-center">
          <Link to="/downloads" className="text-[10px] font-medium text-primary hover:underline">
            View {jobs.length - visible.length} more in Downloads
          </Link>
        </div>
      )}
    </div>
  );
}
