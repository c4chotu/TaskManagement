// Widget Report types and hook — auto-imported in queries.ts via re-export
import { useQuery } from "@tanstack/react-query";
import { apiRequest, USE_MOCK } from "./api";
import * as mock from "./mock-data";

const sleep = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export interface WidgetDataPoint { name: string; value: number; }
export interface WidgetCompletionRow { name: string; total: number; completed: number; pct: number; }
export interface CreatedVsCompletedRow { day: string; created: number; completed: number; }

export interface AllWidgetData {
  projects_by_owners: WidgetDataPoint[];
  projects_by_group: WidgetDataPoint[];
  projects_by_customers: WidgetDataPoint[];
  project_status_distribution: WidgetDataPoint[];
  task_status_report: WidgetDataPoint[];
  task_owner_report: WidgetDataPoint[];
  task_priority_report: WidgetDataPoint[];
  task_by_milestone: WidgetDataPoint[];
  task_completion_report: WidgetCompletionRow[];
  created_vs_completed: CreatedVsCompletedRow[];
  avg_task_completion_time: WidgetDataPoint[];
  issue_severity_report: WidgetDataPoint[];
  issue_assignee_report: WidgetDataPoint[];
  issue_status_report: WidgetDataPoint[];
  issue_module_report: WidgetDataPoint[];
  issue_count_by_milestone: WidgetDataPoint[];
  avg_issue_completion_time: WidgetDataPoint[];
  issue_created_vs_completed: CreatedVsCompletedRow[];
  phase_status_report: WidgetDataPoint[];
  phase_completion_time: WidgetDataPoint[];
  time_logged_by_user: WidgetDataPoint[];
  time_logged_by_project: WidgetDataPoint[];
  billable_vs_nonbillable: WidgetDataPoint[];
}

function mockWidgetData(): AllWidgetData {
  const tasks = mock.mockTasks;
  const projects = mock.mockProjects;
  const users = mock.mockUsers;

  const statusMap: Record<string, number> = {};
  tasks.forEach(t => { statusMap[t.statusId] = (statusMap[t.statusId] ?? 0) + 1; });
  const taskStatusReport = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const ownerMap: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.assigneeIds.length === 0) {
      ownerMap["Unassigned"] = (ownerMap["Unassigned"] ?? 0) + 1;
    } else {
      t.assigneeIds.forEach(uid => {
        const u = users.find(u => u.id === uid);
        const name = u?.name ?? uid;
        ownerMap[name] = (ownerMap[name] ?? 0) + 1;
      });
    }
  });
  const taskOwnerReport = Object.entries(ownerMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const prioMap: Record<string, number> = {};
  tasks.forEach(t => { const p = t.priority ?? "MEDIUM"; prioMap[p] = (prioMap[p] ?? 0) + 1; });
  const taskPriorityReport = Object.entries(prioMap).map(([name, value]) => ({ name, value }));

  const projStatusMap: Record<string, number> = {};
  projects.forEach(p => { projStatusMap[p.status] = (projStatusMap[p.status] ?? 0) + 1; });
  const projectStatusDistribution = Object.entries(projStatusMap).map(([name, value]) => ({ name, value }));

  const groupMap: Record<string, number> = {};
  projects.forEach(p => {
    const g = (p as any).group ?? "Engineering";
    groupMap[g] = (groupMap[g] ?? 0) + 1;
  });
  const projectsByGroup = Object.entries(groupMap).map(([name, value]) => ({ name, value }));

  const createdVsCompleted: CreatedVsCompletedRow[] = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    created: 2 + Math.round(Math.sin(i) * 2 + Math.random() * 3),
    completed: 1 + Math.round(Math.cos(i) * 1.5 + Math.random() * 2),
  }));

  const taskCompletionReport: WidgetCompletionRow[] = projects.slice(0, 6).map(p => {
    const ptasks = tasks.filter(t => t.projectId === p.id);
    const done = ptasks.filter(t => t.statusId === "s-done").length;
    return {
      name: p.name,
      total: ptasks.length,
      completed: done,
      pct: ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0,
    };
  });

  const timeByUser: WidgetDataPoint[] = users.slice(0, 6).map(u => ({
    name: u.name,
    value: Math.round(Math.random() * 80 + 20),
  }));
  const timeByProject: WidgetDataPoint[] = projects.slice(0, 5).map(p => ({
    name: p.name,
    value: Math.round(Math.random() * 200 + 50),
  }));

  return {
    projects_by_owners: projectStatusDistribution,
    projects_by_group: projectsByGroup,
    projects_by_customers: [{ name: "Internal", value: projects.length }],
    project_status_distribution: projectStatusDistribution,
    task_status_report: taskStatusReport,
    task_owner_report: taskOwnerReport,
    task_priority_report: taskPriorityReport,
    task_by_milestone: [{ name: "Unscheduled", value: tasks.length }],
    task_completion_report: taskCompletionReport,
    created_vs_completed: createdVsCompleted,
    avg_task_completion_time: users.slice(0, 5).map(u => ({
      name: u.name,
      value: Math.round(Math.random() * 48 + 8),
    })),
    issue_severity_report: [
      { name: "SEV0", value: 3 },
      { name: "SEV1", value: 7 },
      { name: "SEV2", value: 12 },
      { name: "SEV3", value: 5 },
    ],
    issue_assignee_report: taskOwnerReport.slice(0, 6),
    issue_status_report: [
      { name: "Open", value: 8 },
      { name: "Resolved", value: 19 },
    ],
    issue_module_report: [
      { name: "PRODUCTION", value: 10 },
      { name: "STAGING", value: 6 },
      { name: "DEV", value: 4 },
    ],
    issue_count_by_milestone: [{ name: "Unscheduled", value: 18 }],
    avg_issue_completion_time: users.slice(0, 5).map(u => ({
      name: u.name,
      value: Math.round(Math.random() * 72 + 12),
    })),
    issue_created_vs_completed: createdVsCompleted.map(r => ({
      ...r,
      completed: Math.max(0, r.completed - 1),
    })),
    phase_status_report: [
      { name: "PLANNED", value: 2 },
      { name: "ACTIVE", value: 3 },
      { name: "COMPLETED", value: 5 },
    ],
    phase_completion_time: [
      { name: "Sprint 1", value: 14 },
      { name: "Sprint 2", value: 21 },
      { name: "Sprint 3", value: 10 },
    ],
    time_logged_by_user: timeByUser,
    time_logged_by_project: timeByProject,
    billable_vs_nonbillable: [
      { name: "Billable", value: 320 },
      { name: "Non-Billable", value: 85 },
    ],
  };
}

export function useWidgetReports() {
  return useQuery({
    queryKey: ["widget-reports"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<AllWidgetData> => {
      if (USE_MOCK) {
        await sleep();
        return mockWidgetData();
      }
      return apiRequest<AllWidgetData>("/reports/widgets/all");
    },
  });
}
