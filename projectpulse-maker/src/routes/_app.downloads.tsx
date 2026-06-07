import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useDownloads } from "@/components/tfp/downloads-tray";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ZExportDialog } from "@/components/tfp/export-dialog";
import {
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
  FileText,
  Filter as FilterIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { ZPageHeader } from "@/components/zoho/components";

export const Route = createFileRoute("/_app/downloads")({
  head: () => ({ meta: [{ title: "Downloads — TaskFlow Pro" }] }),
  component: DownloadsPage,
});

const MODULES = ["All", "Issues", "Tasks", "Time Logs", "Reports"] as const;

function DownloadsPage() {
  const { jobs, remove, clear } = useDownloads();
  const [moduleFilter, setModuleFilter] = useState<(typeof MODULES)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "ready" | "failed">("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportModule, setExportModule] = useState<string>("Issues");

  const filtered = jobs.filter((j) => {
    if (moduleFilter !== "All" && j.module !== moduleFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "running" && j.status !== "running" && j.status !== "queued") return false;
      if (statusFilter !== "running" && j.status !== statusFilter) return false;
    }
    return true;
  });

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === "running" || j.status === "queued").length,
    ready: jobs.filter((j) => j.status === "ready").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <>
      <Topbar title="Downloads" />
      <ZPageHeader
        title="Downloads & Exports"
        subtitle="Generate and track async report and data exports across modules."
        actions={
          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <Button size="sm" variant="outline" onClick={clear}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear all
              </Button>
            )}
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                setExportModule("Issues");
                setExportOpen(true);
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> New Export
            </Button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-5">
        {/* Metric tiles */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Exports" value={stats.total} tone="muted" icon={Download} />
          <Stat label="In Progress" value={stats.running} tone="info" icon={Loader2} spin={stats.running > 0} />
          <Stat label="Ready" value={stats.ready} tone="primary" icon={CheckCircle2} />
          <Stat label="Failed" value={stats.failed} tone="destructive" icon={AlertCircle} />
        </div>

        {/* Quick generate cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Issues", "Tasks", "Time Logs", "Reports"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setExportModule(m);
                setExportOpen(true);
              }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-100 text-emerald-700 transition group-hover:bg-primary group-hover:text-primary-foreground">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{m}</p>
                <p className="text-[10px] text-muted-foreground">Generate new export</p>
              </div>
              <Download className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="flex items-center gap-1">
              <FilterIcon className="h-3 w-3 text-muted-foreground" />
              <span className="mr-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Module</span>
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    moduleFilter === m
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(["all", "running", "ready", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                    statusFilter === s
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11.5px]">
              <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Format</th>
                  <th className="px-3 py-2 font-medium">Rows</th>
                  <th className="px-3 py-2 font-medium">Status / Progress</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Download className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No exports yet — start one from the cards above.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((j) => {
                    const Icon = j.format === "pdf" ? FileText : FileSpreadsheet;
                    return (
                      <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{j.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{j.module}</td>
                        <td className="px-3 py-2.5 uppercase text-muted-foreground">{j.format}</td>
                        <td className="px-3 py-2.5 tabular-nums">{j.rowCount ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          {j.status === "running" || j.status === "queued" ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                                  style={{ width: `${j.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{j.progress}%</span>
                            </div>
                          ) : j.status === "ready" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}
                          <span className="ml-1.5 text-[9px] opacity-60">
                            {format(new Date(j.createdAt), "MMM d, HH:mm")}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {j.status === "ready" && j.url && (
                              <a
                                href={j.url}
                                download={`${j.name}.${j.format}`}
                                className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                              >
                                Download
                              </a>
                            )}
                            <button
                              onClick={() => remove(j.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Files are retained for 15 days. After that, they are automatically purged.
        </p>
      </main>

      <ZExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        module={exportModule}
        defaultName={`${exportModule.replace(/\s+/g, "_")}_Export`}
        availableColumns={getColumnsFor(exportModule)}
        defaultSelected={getDefaultColumnsFor(exportModule)}
      />
    </>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
  spin,
}: {
  label: string;
  value: number;
  tone: "primary" | "info" | "muted" | "destructive";
  icon: React.ElementType;
  spin?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "from-emerald-50 ring-emerald-200 text-emerald-700",
    info: "from-blue-50 ring-blue-200 text-blue-700",
    muted: "from-slate-50 ring-slate-200 text-slate-700",
    destructive: "from-red-50 ring-red-200 text-red-700",
  };
  return (
    <div className={`flex items-center justify-between rounded-md bg-gradient-to-br to-card p-3 ring-1 ring-inset ${tones[tone]}`}>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
      </div>
      <Icon className={`h-5 w-5 opacity-70 ${spin ? "animate-spin" : ""}`} />
    </div>
  );
}

function getColumnsFor(module: string) {
  if (module === "Issues") {
    return [
      { key: "id", label: "Issue Key", required: true },
      { key: "name", label: "Issue Name", required: true },
      { key: "sysId", label: "Issue System ID" },
      { key: "team", label: "Associated Team" },
      { key: "release", label: "Release Phase" },
      { key: "affected", label: "Affected Phase" },
      { key: "comments", label: "Comments" },
      { key: "resolution", label: "Resolution" },
      { key: "project", label: "Project Name" },
      { key: "created", label: "Created Time" },
      { key: "reporter", label: "Reporter" },
      { key: "assignee", label: "Assignee" },
      { key: "tags", label: "Tags" },
      { key: "modified", label: "Last Modified Time" },
    ];
  }
  if (module === "Tasks") {
    return [
      { key: "id", label: "Task ID", required: true },
      { key: "name", label: "Task Name", required: true },
      { key: "project", label: "Project" },
      { key: "status", label: "Status" },
      { key: "assignee", label: "Assignee" },
      { key: "priority", label: "Priority" },
      { key: "due", label: "Due Date" },
      { key: "created", label: "Created" },
      { key: "estimated", label: "Estimated Hours" },
      { key: "logged", label: "Logged Hours" },
      { key: "tags", label: "Tags" },
    ];
  }
  if (module === "Time Logs") {
    return [
      { key: "id", label: "Log ID", required: true },
      { key: "task", label: "Task / Issue", required: true },
      { key: "project", label: "Project" },
      { key: "user", label: "User" },
      { key: "date", label: "Date" },
      { key: "hours", label: "Hours" },
      { key: "billing", label: "Billing Type" },
      { key: "notes", label: "Notes" },
    ];
  }
  return [
    { key: "id", label: "Report ID", required: true },
    { key: "name", label: "Report Name", required: true },
    { key: "scope", label: "Scope" },
    { key: "created", label: "Created" },
  ];
}

function getDefaultColumnsFor(module: string) {
  if (module === "Issues") return ["id", "name", "reporter", "assignee", "tags", "modified"];
  if (module === "Tasks") return ["id", "name", "project", "status", "assignee", "due"];
  if (module === "Time Logs") return ["id", "task", "project", "user", "date", "hours"];
  return ["id", "name", "scope", "created"];
}
