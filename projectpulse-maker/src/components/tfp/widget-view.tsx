/**
 * WidgetView — full-screen modal that renders any widget type with real data.
 * Used from the Widgets Gallery when the user clicks a tile.
 */
import React, { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from "recharts";
import { useWidgetReports, AllWidgetData, WidgetDataPoint, WidgetCompletionRow } from "@/lib/widget-queries";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, BarChart2, PieChart as PieIcon, List, Clock } from "lucide-react";

const PALETTE = [
  "#10b981", "#3b82f6", "#f59e0b", "#f87171", "#a855f7",
  "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#6366f1",
  "#14b8a6", "#8b5cf6", "#d946ef", "#0ea5e9", "#22c55e",
];

const SEV_COLORS: Record<string, string> = {
  SEV0: "#ef4444",
  SEV1: "#f97316",
  SEV2: "#eab308",
  SEV3: "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  IN_REVIEW: "#3b82f6",
  COMPLETED: "#6366f1",
  ARCHIVED: "#94a3b8",
  PLANNED: "#f59e0b",
  Open: "#f87171",
  Resolved: "#10b981",
  PRODUCTION: "#ef4444",
  STAGING: "#f97316",
  DEV: "#3b82f6",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
  MEDIUM: "#f59e0b",
  LOW: "#10b981",
  Billable: "#10b981",
  "Non-Billable": "#94a3b8",
};

const TP = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 11,
  },
};

// ────────────────────────────────────────────
// Sub-chart renderers
// ────────────────────────────────────────────

export function BarChartView({ data, label = "value" }: { data: WidgetDataPoint[]; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-30} textAnchor="end" tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip {...TP} />
        <Bar dataKey="value" name={label} radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={STATUS_COLORS[d.name] ?? PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChartView({ data }: { data: WidgetDataPoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={3} startAngle={90} endAngle={-270}>
              {data.map((d, i) => (
                <Cell key={i} fill={SEV_COLORS[d.name] ?? STATUS_COLORS[d.name] ?? PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...TP} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 min-w-[180px]">
        <p className="text-2xl font-bold font-mono text-foreground">{total}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</p>
        <div className="space-y-2 mt-3">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: SEV_COLORS[d.name] ?? STATUS_COLORS[d.name] ?? PALETTE[i % PALETTE.length] }}
                />
                <span className="text-muted-foreground truncate">{d.name}</span>
              </div>
              <span className="font-mono font-semibold shrink-0">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendChartView({ data }: { data: { day: string; created: number; completed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip {...TP} />
        <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#wg1)" strokeWidth={2} />
        <Area type="monotone" dataKey="created" name="Created" stroke="#3b82f6" fill="url(#wg2)" strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ListView({ data, unit = "" }: { data: WidgetDataPoint[]; unit?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: PALETTE[i % PALETTE.length] }}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
              <span className="font-mono text-[11px] text-muted-foreground shrink-0 ml-2">{d.value}{unit}</span>
            </div>
            <Progress value={(d.value / max) * 100} className="h-1.5" style={{ ["--progress-fg" as any]: PALETTE[i % PALETTE.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompletionView({ data }: { data: WidgetCompletionRow[] }) {
  return (
    <div className="space-y-3 max-h-[380px] overflow-y-auto">
      {data.map((row, i) => (
        <div key={i} className="p-3 rounded-xl border border-border/50 bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground truncate">{row.name}</p>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-[11px] text-muted-foreground">{row.completed}/{row.total}</span>
              <Badge variant={row.pct >= 80 ? "default" : row.pct >= 50 ? "secondary" : "outline"}
                className="text-[10px] font-mono">
                {row.pct}%
              </Badge>
            </div>
          </div>
          <Progress value={row.pct} className="h-2" />
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// Widget registry
// ────────────────────────────────────────────

type ChartType = "bar" | "donut" | "pie" | "trend" | "list" | "completion" | "list-hours";

interface WidgetSpec {
  title: string;
  subtitle: string;
  dataKey: keyof AllWidgetData;
  chartType: ChartType;
  unit?: string;
  icon: React.ReactNode;
}

const WIDGET_REGISTRY: Record<string, WidgetSpec> = {
  // Projects
  projects_by_owners: { title: "Projects by Owners", subtitle: "Distribution of projects by status", dataKey: "projects_by_owners", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-indigo-500" /> },
  projects_by_group: { title: "Projects by Group", subtitle: "Projects grouped by group/category", dataKey: "projects_by_group", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-indigo-500" /> },
  projects_by_customers: { title: "Projects by Customers", subtitle: "Projects assigned to each customer", dataKey: "projects_by_customers", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-indigo-500" /> },
  project_status_by_owner: { title: "Project Status by Owner", subtitle: "Project status breakdown", dataKey: "project_status_distribution", chartType: "list", icon: <List className="h-4 w-4 text-indigo-500" /> },
  project_status_by_group: { title: "Project Status by Group", subtitle: "Status across groups", dataKey: "projects_by_group", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-indigo-500" /> },
  project_status_by_customer: { title: "Project Status by Customer", subtitle: "Status by customer", dataKey: "project_status_distribution", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-indigo-500" /> },

  // Tasks
  task_status_report: { title: "Task Status Report", subtitle: "Tasks grouped by their current status", dataKey: "task_status_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-emerald-500" /> },
  task_owner_report: { title: "Task Owner Report", subtitle: "Tasks per assignee", dataKey: "task_owner_report", chartType: "list", icon: <List className="h-4 w-4 text-emerald-500" /> },
  task_priority_report: { title: "Task Priority Report", subtitle: "Task count by priority level", dataKey: "task_priority_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-emerald-500" /> },
  task_by_milestone: { title: "Task by Milestone", subtitle: "Tasks grouped by sprint/milestone", dataKey: "task_by_milestone", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-emerald-500" /> },
  task_completion_pct: { title: "Task Completion % Report", subtitle: "Completion percentage per project", dataKey: "task_completion_report", chartType: "completion", icon: <BarChart2 className="h-4 w-4 text-emerald-500" /> },
  task_status_by_owner: { title: "Task Status by Owner", subtitle: "Task status breakdown per user", dataKey: "task_owner_report", chartType: "list", icon: <List className="h-4 w-4 text-emerald-500" /> },
  task_priority_by_owner: { title: "Task Priority by Owner", subtitle: "Priority distribution per user", dataKey: "task_owner_report", chartType: "list", icon: <List className="h-4 w-4 text-emerald-500" /> },
  task_completion_by_owner: { title: "Task Completion by Owner", subtitle: "Completion rate per assignee", dataKey: "task_owner_report", chartType: "list", icon: <List className="h-4 w-4 text-emerald-500" /> },
  created_vs_completed: { title: "Created Vs Completed", subtitle: "14-day trend of task creation vs resolution", dataKey: "created_vs_completed", chartType: "trend", icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
  avg_task_completion_time: { title: "Average Task Completion Time", subtitle: "Avg hours taken to close a task per user", dataKey: "avg_task_completion_time", chartType: "list", unit: "h", icon: <Clock className="h-4 w-4 text-emerald-500" /> },
  blueprint_usage: { title: "Blueprint Usage Report", subtitle: "Blueprint usage distribution", dataKey: "task_status_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-emerald-500" /> },
  blueprint_transition_usage: { title: "Blueprint Transition Overall Usage", subtitle: "Transition usage across blueprints", dataKey: "task_priority_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-emerald-500" /> },
  blueprint_status_usage: { title: "Blueprint Status Overall Usage", subtitle: "Status usage across all blueprints", dataKey: "task_status_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-emerald-500" /> },

  // Issues
  issue_completion_time: { title: "Issue Completion Time Report", subtitle: "Avg hours to close issues per user", dataKey: "avg_issue_completion_time", chartType: "list", unit: "h", icon: <Clock className="h-4 w-4 text-red-500" /> },
  issue_assignee_report: { title: "Issue Assignee Report", subtitle: "Issues assigned per team member", dataKey: "issue_assignee_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-red-500" /> },
  issue_reporter: { title: "Issue Reporter", subtitle: "Who reported the most issues", dataKey: "issue_assignee_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-red-500" /> },
  issue_escalation: { title: "Issue Escalation", subtitle: "Escalated issues over time", dataKey: "issue_severity_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-red-500" /> },
  issue_severity_report: { title: "Issue Severity Report", subtitle: "Issue count by severity level", dataKey: "issue_severity_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-red-500" /> },
  issue_module: { title: "Issue Module", subtitle: "Issues grouped by environment/module", dataKey: "issue_module_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-red-500" /> },
  issue_classification: { title: "Issue Classification Report", subtitle: "Issues by classification tag", dataKey: "issue_severity_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-red-500" /> },
  issue_reproducible: { title: "Issue Reproducible", subtitle: "Reproducible vs non-reproducible", dataKey: "issue_status_report", chartType: "list", icon: <List className="h-4 w-4 text-red-500" /> },
  issue_status_report: { title: "Issue Status Report", subtitle: "Open vs Resolved issues", dataKey: "issue_status_report", chartType: "donut", icon: <PieIcon className="h-4 w-4 text-red-500" /> },
  issue_count_by_release_ms: { title: "Issue Count By Release Milestone", subtitle: "Issues tied to release phases", dataKey: "issue_count_by_milestone", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-red-500" /> },
  issue_count_by_affected_ms: { title: "Issue Count By Affected Milestone", subtitle: "Issues affecting each milestone", dataKey: "issue_count_by_milestone", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-red-500" /> },
  issue_status_by_assignee: { title: "Issue Status by Assignee", subtitle: "Issue status per team member", dataKey: "issue_assignee_report", chartType: "list", icon: <List className="h-4 w-4 text-red-500" /> },
  issue_escalation_by_assignee: { title: "Issue Escalation by Assignee", subtitle: "Escalations per assignee", dataKey: "issue_assignee_report", chartType: "list", icon: <List className="h-4 w-4 text-red-500" /> },
  issue_created_vs_completed: { title: "Created Vs Completed (Issues)", subtitle: "14-day issue trend", dataKey: "issue_created_vs_completed", chartType: "trend", icon: <TrendingUp className="h-4 w-4 text-red-500" /> },
  issue_avg_age: { title: "Average Age by Assignee", subtitle: "Hours since creation per assignee", dataKey: "avg_issue_completion_time", chartType: "list", unit: "h", icon: <Clock className="h-4 w-4 text-red-500" /> },
  avg_issue_completion_time: { title: "Average Issue Completion Time", subtitle: "Avg hours to close an issue", dataKey: "avg_issue_completion_time", chartType: "list", unit: "h", icon: <Clock className="h-4 w-4 text-red-500" /> },

  // Phases
  phase_status_report: { title: "Phase Status Report", subtitle: "Phases by current status", dataKey: "phase_status_report", chartType: "list", icon: <List className="h-4 w-4 text-amber-500" /> },
  phase_owner_report: { title: "Phase Owner Report", subtitle: "Phases per project owner", dataKey: "phase_status_report", chartType: "bar", icon: <BarChart2 className="h-4 w-4 text-amber-500" /> },
  phase_status_by_owner: { title: "Phase Status by Owner", subtitle: "Phase status per owner", dataKey: "phase_status_report", chartType: "list", icon: <List className="h-4 w-4 text-amber-500" /> },
  phase_completion_time: { title: "Phase Completion Time Report", subtitle: "Days taken to complete each phase", dataKey: "phase_completion_time", chartType: "bar", unit: "d", icon: <BarChart2 className="h-4 w-4 text-amber-500" /> },

  // Time Logs
  time_logged_by_user: { title: "Time Logged by User", subtitle: "Total hours logged per team member", dataKey: "time_logged_by_user", chartType: "bar", unit: "h", icon: <Clock className="h-4 w-4 text-cyan-500" /> },
  time_logged_by_project: { title: "Time Logged by Project", subtitle: "Total hours logged per project", dataKey: "time_logged_by_project", chartType: "bar", unit: "h", icon: <Clock className="h-4 w-4 text-cyan-500" /> },
  billable_vs_nonbillable: { title: "Billable vs Non-Billable", subtitle: "Hours breakdown by billing type", dataKey: "billable_vs_nonbillable", chartType: "donut", unit: "h", icon: <PieIcon className="h-4 w-4 text-cyan-500" /> },
};

// ────────────────────────────────────────────
// Main WidgetView modal
// ────────────────────────────────────────────
import { Button } from "@/components/ui/button";

export function WidgetView({
  widgetId,
  onClose,
  onAddToDashboard,
}: {
  widgetId: string | null;
  onClose: () => void;
  onAddToDashboard?: (id: string) => void;
}) {
  const { data: widgetData, isLoading } = useWidgetReports();

  const spec = widgetId ? WIDGET_REGISTRY[widgetId] : null;

  const chartData = useMemo(() => {
    if (!widgetData || !spec) return [];
    return widgetData[spec.dataKey] as any[];
  }, [widgetData, spec]);

  const renderChart = () => {
    if (!spec || !chartData) return null;
    switch (spec.chartType) {
      case "bar":
        return <BarChartView data={chartData} label={spec.unit ?? "count"} />;
      case "donut":
      case "pie":
        return <DonutChartView data={chartData} />;
      case "trend":
        return <TrendChartView data={chartData} />;
      case "list":
        return <ListView data={chartData} unit={spec.unit} />;
      case "completion":
        return <CompletionView data={chartData} />;
      default:
        return <BarChartView data={chartData} />;
    }
  };

  return (
    <Dialog open={!!widgetId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card/95 backdrop-blur-md border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {spec?.icon}
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">{spec?.title ?? "Widget"}</DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">{spec?.subtitle}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Chart area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No data available yet.</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {renderChart()}
            </div>
          )}
        </div>

        {/* Footer */}
        {onAddToDashboard && spec && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:shadow-glow transition-all gap-1.5 text-xs"
              onClick={() => {
                onAddToDashboard(widgetId!);
                onClose();
              }}
            >
              Add to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Export spec registry so gallery can use it
export { WIDGET_REGISTRY };
