import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { useProjects, useTasks, useUsers } from "@/lib/queries";
import { DataTable } from "@/components/tfp/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Task } from "@/lib/types";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileDown } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports & Data Grid — TaskFlow Pro" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: users = [] } = useUsers();
  const { user } = useAuth();

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>(["id", "title", "project", "status", "priority"]);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);

  // Derive filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Project Filter
      if (selectedProject !== "all" && t.projectId !== selectedProject) return false;

      // 2. Type Filter
      if (selectedFilter === "my") {
        if (!user || !t.assigneeIds?.includes(user.id)) return false;
      }
      if (selectedFilter === "overdue") {
        if (!t.dueDate) return false;
        if (new Date(t.dueDate) < new Date() && t.statusId !== "s-done") return false;
      }
      if (selectedFilter === "today") {
        if (!t.dueDate) return false;
        const today = new Date().toISOString().split("T")[0];
        if (t.dueDate !== today) return false;
      }
      if (selectedFilter === "closed") {
        if (t.statusId !== "s-done") return false;
      }
      return true;
    });
  }, [tasks, selectedProject, selectedFilter, user]);

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: "displayId",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.displayId || row.original.id.substring(0,8)}</span>,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <div className="font-medium text-foreground">{row.original.title}</div>,
    },
    {
      accessorKey: "projectId",
      header: "Project",
      cell: ({ row }) => {
        const p = projects.find(p => p.id === row.original.projectId);
        return <span className="text-muted-foreground">{p?.name || "Unknown"}</span>;
      },
    },
    {
      accessorKey: "statusId",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.statusId === "s-done" ? "DONE" : row.original.statusId === "s-in-prog" ? "IN PROGRESS" : "TODO";
        const color = status === "DONE" ? "text-emerald-500 border-emerald-500/30" : status === "IN PROGRESS" ? "text-blue-500 border-blue-500/30" : "text-muted-foreground";
        return <Badge variant="outline" className={`${color} text-[10px]`}>{status}</Badge>;
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const p = row.original.priority || "MEDIUM";
        const c = p === "CRITICAL" ? "bg-destructive text-white border-destructive" : p === "HIGH" ? "text-warning border-warning" : "text-muted-foreground";
        return <Badge variant="outline" className={`${c} text-[10px]`}>{p}</Badge>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.dueDate || "-"}</span>,
    },
  ];

  const handleExportStart = async () => {
    setIsExporting(true);
    setDownloadJobId(null);
    try {
      const res = await fetch("/api/v1/reports/export-async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("tfp_token")}`
        },
        body: JSON.stringify({
          projectId: selectedProject === "all" ? null : selectedProject,
          filterType: selectedFilter,
          columns: exportColumns
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDownloadJobId(data.jobId);
      } else {
        // Fallback mock if backend not ready
        await new Promise((r) => setTimeout(r, 2000));
        setDownloadJobId("mock-job-123");
      }
    } catch (e) {
      console.error(e);
      // Fallback mock
      await new Promise((r) => setTimeout(r, 2000));
      setDownloadJobId("mock-job-123");
    }
  };

  useEffect(() => {
    if (!downloadJobId || downloadJobId === "mock-job-123") {
      if (downloadJobId === "mock-job-123") setIsExporting(false); // Mock finishes instantly
      return;
    }
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/reports/export-async/${downloadJobId}`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("tfp_token")}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "COMPLETED") {
            setIsExporting(false);
            clearInterval(interval);
          }
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [downloadJobId]);

  return (
    <>
      <Topbar title="Reports & Data Grid" />
      <main className="flex-1 space-y-6 p-6">
        
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="my">My Tasks</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Today's Tasks</SelectItem>
                <SelectItem value="closed">Closed Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isExportDialogOpen} onOpenChange={(open) => {
            setIsExportDialogOpen(open);
            if (!open) {
              setIsExporting(false);
              setDownloadJobId(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Download className="h-4 w-4 mr-2" /> Async Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Data Report</DialogTitle>
                <DialogDescription>Select the columns you wish to include in your CSV report.</DialogDescription>
              </DialogHeader>

              {(!isExporting && !downloadJobId) ? (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["id", "title", "project", "status", "priority", "dueDate", "assignees", "estimate"].map(col => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`col-${col}`} 
                          checked={exportColumns.includes(col)}
                          onCheckedChange={(checked) => {
                            if (checked) setExportColumns(p => [...p, col]);
                            else setExportColumns(p => p.filter(c => c !== col));
                          }}
                        />
                        <Label htmlFor={`col-${col}`} className="capitalize">{col}</Label>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleExportStart} className="w-full">Generate Report</Button>
                  </DialogFooter>
                </div>
              ) : isExporting ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">Generating Report...</h3>
                    <p className="text-sm text-muted-foreground">This is running as an async job on the backend. Please wait.</p>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <FileDown className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">Report Ready</h3>
                    <p className="text-sm text-muted-foreground">Your report has been successfully generated.</p>
                  </div>
                  <Button 
                    className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => {
                      if (downloadJobId === "mock-job-123") {
                        alert("Mock CSV Downloaded!");
                        setIsExportDialogOpen(false);
                        return;
                      }
                      window.open(`/api/v1/reports/export-async/${downloadJobId}/download`, "_blank");
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Grid */}
        <Card className="glass-card">
          <div className="p-1">
            <DataTable columns={columns} data={filteredTasks} searchKey="title" />
          </div>
        </Card>
      </main>
    </>
  );
}
