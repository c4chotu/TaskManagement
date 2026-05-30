import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  useBulkUploadTeams,
  useBulkUploadPeople,
  useBulkUploadTasks,
  useBulkUploadAssignments,
  type BulkUploadResult,
} from "@/lib/queries";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Users, CheckCircle2, XCircle, Layers,
  Link2, Shield, Download, AlertTriangle, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/_app/bulk-upload")({
  head: () => ({ meta: [{ title: "Bulk Upload — TaskFlow Pro" }] }),
  component: BulkUploadPage,
});

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  {
    id: "teams",
    label: "Teams",
    icon: Layers,
    description: "Create multiple teams at once",
    columns: ["name", "description"],
    sample: "name,description\nTelco Team,Telecom operations squad\nDev Team,Core development squad",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    id: "people",
    label: "People",
    icon: Users,
    description: "Onboard team members in bulk",
    columns: ["name", "email", "password", "roleName", "teamName", "departmentName"],
    sample: [
      "name,email,password,roleName,teamName,departmentName",
      "Alice Smith,alice@company.com,Pass@1234,TEAM_MEMBER,Dev Team,Dev Department",
      "Bob Jones,bob@company.com,Pass@1234,TEAM_LEAD,QA Team,QA Department",
    ].join("\n"),
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: FileText,
    description: "Create tasks with project key prefix",
    columns: ["projectKey", "title", "description", "priority", "type", "dueDate", "assigneeEmail", "teamName"],
    sample: [
      "projectKey,title,description,priority,type,dueDate,assigneeEmail,teamName",
      "NETIQ,Setup BGP routing,Configure BGP sessions,HIGH,TASK,2025-07-01T00:00:00Z,telco.lead@avendum.tech,Telco Team",
      "DEVOPS,CI pipeline setup,GitHub Actions workflow,MEDIUM,TASK,2025-07-15T00:00:00Z,dev.lead@avendum.tech,Dev Team",
    ].join("\n"),
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "assignments",
    label: "Assignments",
    icon: Link2,
    description: "Assign tasks using display IDs",
    columns: ["taskDisplayId", "assigneeEmail"],
    sample: "taskDisplayId,assigneeEmail\nNETIQ-T1,telco.member1@avendum.tech\nDEVOPS-T2,dev.member3@avendum.tech",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── CSV Preview component ────────────────────────────────────────────────────
function CsvPreview({ file, columns }: { file: File; columns: readonly string[] }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length > 0) {
        setHeaders(lines[0].split(",").map((h) => h.trim().replace(/"/g, "")));
        setRows(
          lines.slice(1, 6).map((l) =>
            l.split(",").map((c) => c.trim().replace(/"/g, ""))
          )
        );
      }
      setLoaded(true);
    };
    reader.readAsText(file);
    return <div className="text-xs text-muted-foreground py-4 text-center">Parsing…</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border mt-3">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/30">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-left font-semibold ${
                columns.includes(h as any) ? "text-primary" : "text-destructive"
              }`}>
                {h}
                {!columns.includes(h as any) && (
                  <span className="ml-1 text-[9px]">(unknown)</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate">
                  {cell || <span className="italic opacity-40">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-4">No data rows found.</p>
      )}
    </div>
  );
}

// ── Result summary ───────────────────────────────────────────────────────────
function ResultCard({ result }: { result: BulkUploadResult }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3 mt-4">
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">{result.succeeded} succeeded</span>
        </div>
        {result.failed > 0 && (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">{result.failed} failed</span>
          </div>
        )}
      </div>
      {result.errors.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {result.errors.map((err, i) => (
            <p key={i} className="text-[11px] text-destructive flex gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drop zone ────────────────────────────────────────────────────────────────
function DropZone({
  onFile,
  file,
  color,
  bg,
  border,
}: {
  onFile: (f: File) => void;
  file: File | null;
  color: string;
  bg: string;
  border: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all
        ${dragging ? `${bg} ${border}` : "border-border/60 hover:border-border"}
        ${file ? `${bg} ${border}` : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      {file ? (
        <>
          <FileText className={`h-10 w-10 ${color}`} />
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          <Badge className={`${bg} ${color} border ${border}`}>Click to replace</Badge>
        </>
      ) : (
        <>
          <Upload className={`h-10 w-10 ${color} opacity-70`} />
          <p className="text-sm font-semibold">Drop CSV file here</p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function BulkUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("teams");
  const [files, setFiles] = useState<Partial<Record<TabId, File>>>({});
  const [results, setResults] = useState<Partial<Record<TabId, BulkUploadResult>>>({});

  const uploadTeams = useBulkUploadTeams();
  const uploadPeople = useBulkUploadPeople();
  const uploadTasks = useBulkUploadTasks();
  const uploadAssignments = useBulkUploadAssignments();

  const uploaders = { teams: uploadTeams, people: uploadPeople, tasks: uploadTasks, assignments: uploadAssignments };

  const isAuthorized = user && ((user.roleLevel ?? 0) >= 5 || user.roleName === "SUPER_ADMIN");

  if (!isAuthorized) {
    return (
      <>
        <Topbar title="Bulk Upload" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Shield className="mx-auto h-16 w-16 text-destructive/60" />
            <h2 className="text-xl font-bold">Organization Owner Required</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Bulk upload is available only to Organization Owners (Level 5) and Super Admins.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard" })} className="bg-gradient-primary">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </>
    );
  }

  const tab = TABS.find((t) => t.id === activeTab)!;

  const handleUpload = async () => {
    const file = files[activeTab];
    if (!file) return toast.error("Please select a CSV file first.");
    try {
      const result = await uploaders[activeTab].mutateAsync(file as any);
      setResults((prev) => ({ ...prev, [activeTab]: result }));
      if (result.failed === 0) {
        toast.success(`${result.succeeded} ${activeTab} imported successfully!`);
      } else {
        toast.warning(`${result.succeeded} succeeded, ${result.failed} failed.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  const downloadSample = () => {
    const blob = new Blob([tab.sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar title="Bulk Upload" />
      <main className="flex-1 max-w-5xl mx-auto space-y-6 p-6 overflow-auto">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Bulk Import Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload CSV files to create teams, onboard members, import tasks, and assign work in one go.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = t.id === activeTab;
            const isDone = results[t.id] !== undefined;
            return (
              <div key={t.id} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all flex-1
                    ${isActive ? `${t.bg} ${t.color} border ${t.border}` : "text-muted-foreground hover:text-foreground"}
                    ${isDone ? "opacity-80" : ""}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {t.label}
                </button>
                {i < TABS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Upload panel */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-semibold ${tab.color}`}>{tab.label}</h3>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={downloadSample}>
                  <Download className="h-3.5 w-3.5" /> Sample CSV
                </Button>
              </div>

              <DropZone
                file={files[activeTab] ?? null}
                onFile={(f) => {
                  setFiles((prev) => ({ ...prev, [activeTab]: f }));
                  setResults((prev) => { const next = { ...prev }; delete next[activeTab]; return next; });
                }}
                color={tab.color}
                bg={tab.bg}
                border={tab.border}
              />

              {files[activeTab] && (
                <CsvPreview file={files[activeTab]!} columns={tab.columns} />
              )}

              <Button
                className="w-full bg-gradient-to-r from-primary to-violet-600 text-white"
                disabled={!files[activeTab] || uploaders[activeTab].isPending}
                onClick={handleUpload}
              >
                {uploaders[activeTab].isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Uploading…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import {tab.label}
                  </span>
                )}
              </Button>

              {results[activeTab] && <ResultCard result={results[activeTab]!} />}
            </Card>
          </div>

          {/* Right: Instructions */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              <h4 className="text-sm font-semibold">Required Columns</h4>
              <div className="space-y-2">
                {tab.columns.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${tab.bg} ${tab.color} border ${tab.border}`}>
                      {col}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">CSV Preview</p>
                <pre className={`text-[10px] font-mono leading-relaxed p-3 rounded-md ${tab.bg} overflow-x-auto`}>
                  {tab.sample}
                </pre>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Upload Order</h4>
              <div className="space-y-2">
                {TABS.map((t, i) => {
                  const Icon = t.icon;
                  const done = results[t.id] !== undefined;
                  return (
                    <div key={t.id} className={`flex items-center gap-2.5 text-xs ${done ? t.color : "text-muted-foreground"}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                        ${done ? `${t.bg} ${t.color}` : "bg-muted/50"}`}>
                        {done ? "✓" : i + 1}
                      </span>
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                For best results, upload in order: Teams → People → Tasks → Assignments
              </p>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
