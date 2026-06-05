// React Query hooks for the TaskFlow Pro REST API.
// When VITE_API_BASE_URL is unset, falls back to template data in mock-data.ts
// so the UI is fully explorable.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, USE_MOCK, tokenStore } from "./api";
import * as mock from "./mock-data";
import type {
  Attachment,
  AuthResult,
  AutomationRule,
  AutomationRuleType,
  Comment,
  CustomTaskStatus,
  Department,
  Issue,
  OnCallShift,
  OrgSetupPayload,
  Project,
  RoleName,
  RoutingRule,
  Sprint,
  Task,
  TaskDependency,
  Team,
  TimeEntry,
  User,
  WorkloadInfo,
  Timesheet,
  AssignmentHistory,
  SuggestedAssignee,
} from "./types";

const sleep = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// ---------- auth ----------
export async function authLogin(email: string, password: string): Promise<AuthResult> {
  if (USE_MOCK) {
    await sleep();
    const user = mock.mockUsers.find((u) => u.email === email) || mock.mockUsers[0];
    return {
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
      userId: user.id,
      orgId: "org-mock",
      email: user.email,
      name: user.name,
    };
  }
  return apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function authRegister(payload: {
  email: string;
  password: string;
  name: string;
  orgName: string;
}): Promise<AuthResult> {
  if (USE_MOCK) {
    await sleep();
    return {
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
      userId: "u-new",
      orgId: "org-mock",
      email: payload.email,
      name: payload.name,
    };
  }
  return apiRequest<AuthResult>("/auth/register", { method: "POST", body: payload, auth: false });
}

// ---------- users / org ----------
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> =>
      USE_MOCK ? mock.mockUsers : apiRequest<User[]>("/users"),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> =>
      USE_MOCK ? mock.mockDepartments : apiRequest<Department[]>("/departments"),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> =>
      USE_MOCK ? mock.mockTeams : apiRequest<Team[]>("/teams"),
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-members", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<{ userId: string; role: string }[]> => {
      if (USE_MOCK) {
        if (teamId === "t-sre") {
          return [
            { userId: "u-dept", role: "LEAD" },
            { userId: "u-dev1", role: "MEMBER" },
          ];
        } else if (teamId === "t-fe") {
          return [
            { userId: "u-lead", role: "LEAD" },
            { userId: "u-dev2", role: "MEMBER" },
          ];
        } else if (teamId === "t-be") {
          return [
            { userId: "u-admin", role: "LEAD" },
            { userId: "u-dev3", role: "MEMBER" },
          ];
        } else if (teamId === "t-ds") {
          return [
            { userId: "u-lead", role: "LEAD" },
            { userId: "u-dev1", role: "MEMBER" },
          ];
        }
        return [];
      }
      return apiRequest<{ userId: string; role: string }[]>(`/teams/${teamId}/members`);
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Department, "id">) => {
      if (USE_MOCK) {
        const nd: Department = { id: `d-${Date.now()}`, ...payload };
        mock.mockDepartments.push(nd);
        return nd;
      }
      return apiRequest<Department>("/departments", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Team, "id">) => {
      if (USE_MOCK) {
        const nt: Team = { id: `t-${Date.now()}`, ...payload };
        mock.mockTeams.push(nt);
        return nt;
      }
      return apiRequest<Team>("/teams", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

// ---------- projects ----------
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> =>
      USE_MOCK ? mock.mockProjects : apiRequest<Project[]>("/projects"),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async (): Promise<Project | null> => {
      if (USE_MOCK) return mock.mockProjects.find((p) => p.id === id) || null;
      try {
        const data = await apiRequest<Project>(`/projects/${id}`);
        return data || null;
      } catch (err) {
        return null;
      }
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Project> & { name: string; type: Project["type"] }) => {
      if (USE_MOCK) {
        const np: Project = {
          id: `p-${Date.now()}`,
          status: "ACTIVE",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
          progress: 0,
          description: "",
          ...payload,
        };
        mock.mockProjects.unshift(np);
        return np;
      }
      return apiRequest<Project>("/projects", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ---------- statuses ----------
export function useStatuses(_projectId?: string) {
  return useQuery({
    queryKey: ["statuses", "default"],
    queryFn: async (): Promise<CustomTaskStatus[]> => {
      if (USE_MOCK) return mock.mockStatuses.default;
      const url = "/organizations/statuses";
      return apiRequest<CustomTaskStatus[]>(url);
    },
  });
}

export function useCreateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId?: string; status: Omit<CustomTaskStatus, "id"> }) => {
      if (USE_MOCK) {
        const ns: CustomTaskStatus = { id: `s-${Date.now()}`, ...vars.status };
        mock.mockStatuses.default.push(ns);
        return ns;
      }
      const url = "/organizations/statuses";
      return apiRequest<CustomTaskStatus>(url, {
        method: "POST",
        body: vars.status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statuses", "default"] });
    },
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { statusId: string; patch: Partial<CustomTaskStatus>; projectId?: string }) => {
      if (USE_MOCK) {
        const s = mock.mockStatuses.default.find(x => x.id === vars.statusId);
        if (s) Object.assign(s, vars.patch);
        return s;
      }
      return apiRequest<CustomTaskStatus>(`/statuses/${vars.statusId}`, {
        method: "PUT",
        body: vars.patch,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["statuses", vars.projectId ?? "default"] });
      qc.invalidateQueries({ queryKey: ["statuses", "default"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { statusId: string; projectId?: string }) => {
      if (USE_MOCK) {
        const idx = mock.mockStatuses.default.findIndex(x => x.id === vars.statusId);
        if (idx >= 0) mock.mockStatuses.default.splice(idx, 1);
        return true;
      }
      return apiRequest<void>(`/statuses/${vars.statusId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["statuses", vars.projectId ?? "default"] });
      qc.invalidateQueries({ queryKey: ["statuses", "default"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ---------- tasks ----------
export function useTasks(filter?: {
  projectId?: string;
  priority?: string;
  phaseId?: string;
  category?: string;
  statusId?: string;
  taskType?: Task["taskType"];
  assigneeId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}) {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: async (): Promise<Task[]> => {
      if (USE_MOCK) {
        return mock.mockTasks.filter(
          (t) =>
            (!filter?.projectId || t.projectId === filter.projectId) &&
            (!filter?.taskType || t.taskType === filter.taskType) &&
            (!filter?.priority || t.priority === filter.priority) &&
            (!filter?.category || t.category === filter.category) &&
            (!filter?.statusId || t.statusId === filter.statusId)
        );
      }
      return apiRequest<Task[]>("/tasks", { query: filter });
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id],
    enabled: !!id,
    queryFn: async (): Promise<Task | null> => {
      if (USE_MOCK) return mock.mockTasks.find((t) => t.id === id) || null;
      try {
        const data = await apiRequest<Task>(`/tasks/${id}`);
        return data || null;
      } catch (err) {
        return null;
      }
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Task> & { title: string; projectId: string }) => {
      if (USE_MOCK) {
        const nt: Task = {
          id: `t-${Date.now()}`,
          statusId: "s-todo",
          taskType: "TASK",
          createdAt: new Date().toISOString(),
          assigneeIds: [],
          ...payload,
        };
        mock.mockTasks.unshift(nt);
        return nt;
      }
      return apiRequest<Task>("/tasks", { method: "POST", body: payload });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (vars.projectId)
        qc.invalidateQueries({ queryKey: ["tasks", { projectId: vars.projectId }] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; statusId: string; comment?: string }) => {
      if (USE_MOCK) {
        const t = mock.mockTasks.find((x) => x.id === vars.taskId);
        if (t) t.statusId = vars.statusId;
        return t;
      }
      return apiRequest(`/tasks/${vars.taskId}/status`, {
        method: "POST",
        body: { newStatusId: vars.statusId, comment: vars.comment },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.taskId] });
    },
  });
}

// ---------- comments ----------
export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<Comment[]> => {
      if (USE_MOCK) return mock.mockComments.filter((c) => c.taskId === taskId);
      return apiRequest<Comment[]>(`/tasks/${taskId}/comments`);
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; content: string }) => {
      if (USE_MOCK) {
        const nc: Comment = {
          id: `c-${Date.now()}`,
          taskId: vars.taskId,
          userId: "u-dev1",
          content: vars.content,
          createdAt: new Date().toISOString(),
        };
        mock.mockComments.push(nc);
        return nc;
      }
      return apiRequest<Comment>(`/tasks/${vars.taskId}/comments`, {
        method: "POST",
        body: { content: vars.content },
      });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["comments", v.taskId] }),
  });
}

// ---------- issues ----------
export function useIssues() {
  return useQuery({
    queryKey: ["issues"],
    queryFn: async (): Promise<Issue[]> =>
      USE_MOCK ? mock.mockIssues : apiRequest<Issue[]>("/issues"),
  });
}

export function useIssue(taskId: string | undefined) {
  return useQuery({
    queryKey: ["issue", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<Issue | null> => {
      if (USE_MOCK) return mock.mockIssues.find((i) => i.taskId === taskId) || null;
      try {
        const data = await apiRequest<Issue>(`/issues/by-task/${taskId}`);
        return data || null;
      } catch (err) {
        return null;
      }
    },
  });
}

export function useAckIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueId: string) => {
      if (USE_MOCK) {
        const i = mock.mockIssues.find((x) => x.id === issueId);
        if (i) i.acknowledged = true;
        return i;
      }
      return apiRequest(`/issues/${issueId}/respond`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useResolveIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { issueId: string; rootCause: string; resolution: string }) => {
      if (USE_MOCK) {
        const i = mock.mockIssues.find((x) => x.id === vars.issueId);
        if (i) {
          i.resolved = true;
          i.rootCause = vars.rootCause;
          i.resolution = vars.resolution;
        }
        return i;
      }
      return apiRequest(`/issues/${vars.issueId}/resolve`, {
        method: "POST",
        body: { rootCause: vars.rootCause, resolution: vars.resolution },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useUpdateIssueDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; patch: Record<string, any> }) => {
      if (USE_MOCK) {
        const i = mock.mockIssues.find((x) => x.taskId === vars.taskId);
        if (i) Object.assign(i, vars.patch);
        return i;
      }
      return apiRequest<Issue>(`/issues/${vars.taskId}`, {
        method: "PATCH",
        body: vars.patch,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["issue", v.taskId] });
    },
  });
}

// ---------- time tracking ----------
export function useTimeEntries() {
  return useQuery({
    queryKey: ["time-entries"],
    queryFn: async (): Promise<TimeEntry[]> =>
      USE_MOCK ? mock.mockTimeEntries : apiRequest<TimeEntry[]>("/time-entries"),
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (USE_MOCK) {
        const te: TimeEntry = {
          id: `te-${Date.now()}`,
          taskId,
          startTime: new Date().toISOString(),
          endTime: null,
          billable: true,
        };
        mock.mockTimeEntries.unshift(te);
        return te;
      }
      return apiRequest<TimeEntry>("/time-entries/start", { method: "POST", body: { taskId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time-entries"] }),
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const te = mock.mockTimeEntries.find((x) => x.id === id);
        if (te && !te.endTime) {
          te.endTime = new Date().toISOString();
          te.hours = Math.max(0.1, (Date.now() - new Date(te.startTime).getTime()) / 3_600_000);
        }
        return te;
      }
      return apiRequest<TimeEntry>(`/time-entries/${id}/stop`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time-entries"] }),
  });
}

// ---------- workload / routing / automations / on-call ----------
export function useWorkload() {
  return useQuery({
    queryKey: ["workload"],
    queryFn: async (): Promise<WorkloadInfo[]> =>
      USE_MOCK ? mock.mockWorkload : apiRequest<WorkloadInfo[]>("/workload"),
  });
}

export function useOnCall() {
  return useQuery({
    queryKey: ["on-call"],
    queryFn: async (): Promise<OnCallShift[]> =>
      USE_MOCK ? mock.mockOnCall : apiRequest<OnCallShift[]>("/on-call/schedule"),
  });
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routing-rules"],
    queryFn: async (): Promise<RoutingRule[]> =>
      USE_MOCK ? mock.mockRoutingRules : apiRequest<RoutingRule[]>("/routing/rules"),
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: ["automations"],
    queryFn: async (): Promise<AutomationRule[]> =>
      USE_MOCK ? mock.mockAutomations : apiRequest<AutomationRule[]>("/automations"),
  });
}

export function useAutomationRuleTypes() {
  return useQuery({
    queryKey: ["automation-rule-types"],
    queryFn: async (): Promise<AutomationRuleType[]> => {
      if (USE_MOCK) {
        // Return a mock set of rule types for development
        return [
          { id: "1", code: "TASK_CREATED", name: "Task Created", description: "Fires when a task is created", category: "TASK", triggerType: "TASK_CREATED", defaultActionType: "ASSIGN_USER", isSystem: true },
          { id: "2", code: "TASK_UPDATED", name: "Task Updated", description: "Fires when a task is changed", category: "TASK", triggerType: "TASK_UPDATED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "3", code: "TASK_STATUS_CHANGED", name: "Task Status Changed", description: "Fires when task status changes", category: "TASK", triggerType: "TASK_STATUS_CHANGED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "4", code: "TASK_ASSIGNED", name: "Task Assigned", description: "Fires when task is assigned", category: "TASK", triggerType: "TASK_ASSIGNED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "5", code: "TASK_DUE_SOON", name: "Task Due Soon", description: "Fires 24h before due date", category: "TASK", triggerType: "TASK_DUE_SOON", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "6", code: "TASK_OVERDUE", name: "Task Overdue", description: "Fires when task passes due date", category: "TASK", triggerType: "TASK_OVERDUE", defaultActionType: "ESCALATE", isSystem: true },
          { id: "7", code: "TASK_COMPLETED", name: "Task Completed", description: "Fires when task is done", category: "TASK", triggerType: "TASK_COMPLETED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "8", code: "TASK_PRIORITY_CHANGED", name: "Task Priority Changed", description: "Fires when priority changes", category: "TASK", triggerType: "TASK_PRIORITY_CHANGED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "9", code: "ISSUE_CREATED", name: "Issue / Incident Created", description: "Fires when an issue is reported", category: "ISSUE", triggerType: "ISSUE_CREATED", defaultActionType: "ASSIGN_USER", isSystem: true },
          { id: "10", code: "SLA_BREACHED", name: "SLA Breached", description: "Fires when SLA threshold is reached", category: "ISSUE", triggerType: "SLA_BREACHED", defaultActionType: "ESCALATE", isSystem: true },
          { id: "11", code: "SPRINT_STARTED", name: "Sprint / Phase Started", description: "Fires when sprint is activated", category: "SPRINT", triggerType: "SPRINT_STARTED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "12", code: "SPRINT_COMPLETED", name: "Sprint / Phase Completed", description: "Fires when sprint completes", category: "SPRINT", triggerType: "SPRINT_COMPLETED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "13", code: "PROJECT_MEMBER_ADDED", name: "Member Added to Project", description: "Fires when user joins project", category: "PROJECT", triggerType: "PROJECT_MEMBER_ADDED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
          { id: "14", code: "COMMENT_ADDED", name: "Comment Added", description: "Fires when comment is posted", category: "TASK", triggerType: "COMMENT_ADDED", defaultActionType: "SEND_NOTIFICATION", isSystem: true },
        ];
      }
      return apiRequest<AutomationRuleType[]>("/automations/rule-types");
    },
    staleTime: 10 * 60 * 1000, // Rule types are stable - cache for 10 mins
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      projectId?: string;
      teamId?: string;
      name: string;
      description?: string;
      triggerType: string;
      conditions: any[];
      actions: any[];
    }) => {
      if (USE_MOCK) {
        const nr: AutomationRule = {
          id: `auto-${Date.now()}`,
          projectId: vars.projectId || "",
          name: vars.name,
          description: vars.description,
          triggerType: vars.triggerType,
          enabled: true,
        };
        mock.mockAutomations.push(nr);
        return nr;
      }
      return apiRequest<AutomationRule>("/automations", {
        method: "POST",
        body: vars,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      projectId?: string;
      teamId?: string;
      name: string;
      description?: string;
      triggerType: string;
      conditions: any[];
      actions: any[];
    }) => {
      if (USE_MOCK) {
        const r = mock.mockAutomations.find((x) => x.id === vars.id);
        if (r) {
          r.name = vars.name;
          r.description = vars.description;
          r.triggerType = vars.triggerType;
        }
        return r;
      }
      return apiRequest<AutomationRule>(`/automations/${vars.id}`, {
        method: "PUT",
        body: vars,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const r = mock.mockAutomations.find((x) => x.id === id);
        if (r) r.enabled = !r.enabled;
        return r;
      }
      return apiRequest<AutomationRule>(`/automations/${id}/toggle`, {
        method: "POST",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const idx = mock.mockAutomations.findIndex((x) => x.id === id);
        if (idx >= 0) mock.mockAutomations.splice(idx, 1);
        return true;
      }
      return apiRequest<void>(`/automations/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

// ---------- task patch (edit/assign) ----------
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<Task> }) => {
      if (USE_MOCK) {
        const t = mock.mockTasks.find((x) => x.id === vars.id);
        if (t) Object.assign(t, vars.patch);
        return t;
      }
      return apiRequest<Task>(`/tasks/${vars.id}`, { method: "PATCH", body: vars.patch });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", v.id] });
    },
  });
}

// ---------- attachments ----------
export function useAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["attachments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<Attachment[]> => {
      if (USE_MOCK) return mock.mockAttachments.filter((a) => a.taskId === taskId);
      const data = await apiRequest<Attachment[]>(`/tasks/${taskId}/attachments`);
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
      return data.map((att) => ({
        ...att,
        url: att.url && !att.url.startsWith("http") ? `${baseUrl}${att.url}` : att.url,
      }));
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; file: File; onProgress?: (p: number) => void }) => {
      if (USE_MOCK) {
        // simulate progress
        for (let p = 10; p <= 100; p += 15) {
          await sleep(80);
          vars.onProgress?.(Math.min(100, p));
        }
        const att: Attachment = {
          id: `att-${Date.now()}`,
          taskId: vars.taskId,
          fileName: vars.file.name,
          mimeType: vars.file.type || "application/octet-stream",
          sizeBytes: vars.file.size,
          url: URL.createObjectURL(vars.file),
          uploadedAt: new Date().toISOString(),
          uploadedBy: "u-dev1",
        };
        mock.mockAttachments.push(att);
        return att;
      }
      // Real upload via XHR for progress tracking
      return new Promise<Attachment>((resolve, reject) => {
        const fd = new FormData();
        fd.append("file", vars.file);
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")}/api/v1/tasks/${vars.taskId}/attachments`,
        );
        const token = localStorage.getItem("tfp.accessToken");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) =>
          e.lengthComputable && vars.onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () =>
          xhr.status < 300
            ? resolve(JSON.parse(xhr.responseText))
            : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(fd);
      });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["attachments", v.taskId] }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; attachmentId: string }) => {
      if (USE_MOCK) {
        const idx = mock.mockAttachments.findIndex((a) => a.id === vars.attachmentId);
        if (idx >= 0) mock.mockAttachments.splice(idx, 1);
        return true;
      }
      return apiRequest(`/tasks/${vars.taskId}/attachments/${vars.attachmentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["attachments", v.taskId] }),
  });
}

export function useProjectAttachments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-attachments", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Attachment[]> => {
      if (USE_MOCK) return mock.mockAttachments.filter((a) => a.projectId === projectId);
      const data = await apiRequest<Attachment[]>(`/projects/${projectId}/attachments`);
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
      return data.map((att) => ({
        ...att,
        url: att.url && !att.url.startsWith("http") ? `${baseUrl}${att.url}` : att.url,
      }));
    },
  });
}

// ---------- export reports ----------
export function useExportReport() {
  return useMutation({
    mutationFn: async (payload: { projectId?: string; filterType?: string; columns: string[] }) => {
      if (USE_MOCK) {
        await sleep(1000);
        return { jobId: `mock-job-${Date.now()}` };
      }
      return apiRequest<{ jobId: string }>("/reports/export-async", {
        method: "POST",
        body: payload,
      });
    },
  });
}

export function useExportStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ["export-status", jobId],
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data as { status?: string } | undefined;
      if (state && (state.status === "COMPLETED" || state.status === "FAILED")) {
        return false;
      }
      return 1000; // poll every 1s
    },
    queryFn: async (): Promise<{ status: string }> => {
      if (USE_MOCK) {
        return { status: "COMPLETED" };
      }
      return apiRequest<{ status: string }>(`/reports/export-async/${jobId}`);
    },
  });
}

export function useUploadProjectAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; file: File; onProgress?: (p: number) => void }) => {
      if (USE_MOCK) {
        for (let p = 10; p <= 100; p += 15) {
          await sleep(80);
          vars.onProgress?.(Math.min(100, p));
        }
        const att: Attachment = {
          id: `att-${Date.now()}`,
          taskId: "",
          projectId: vars.projectId,
          fileName: vars.file.name,
          mimeType: vars.file.type || "application/octet-stream",
          sizeBytes: vars.file.size,
          url: URL.createObjectURL(vars.file),
          uploadedAt: new Date().toISOString(),
          uploadedBy: "u-owner",
        };
        mock.mockAttachments.push(att);
        return att;
      }
      return new Promise<Attachment>((resolve, reject) => {
        const fd = new FormData();
        fd.append("file", vars.file);
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")}/api/v1/projects/${vars.projectId}/attachments`,
        );
        const token = localStorage.getItem("tfp.accessToken");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) =>
          e.lengthComputable && vars.onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () =>
          xhr.status < 300
            ? resolve(JSON.parse(xhr.responseText))
            : reject(new Error(xhr.statusText));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(fd);
      });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["project-attachments", v.projectId] }),
  });
}

export function useDeleteProjectAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; attachmentId: string }) => {
      if (USE_MOCK) {
        const idx = mock.mockAttachments.findIndex((a) => a.id === vars.attachmentId);
        if (idx >= 0) mock.mockAttachments.splice(idx, 1);
        return true;
      }
      return apiRequest(`/projects/${vars.projectId}/attachments/${vars.attachmentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["project-attachments", v.projectId] }),
  });
}

// ---------- dependencies ----------
export function useDependencies(projectId?: string) {
  return useQuery({
    queryKey: ["dependencies", projectId ?? "all"],
    queryFn: async (): Promise<TaskDependency[]> => {
      if (USE_MOCK) return mock.mockDependencies;
      return apiRequest<TaskDependency[]>("/dependencies", { query: { projectId } });
    },
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      predecessorId: string;
      successorId: string;
      type?: TaskDependency["type"];
    }) => {
      if (USE_MOCK) {
        const d: TaskDependency = { id: `dep-${Date.now()}`, type: "FS", ...vars };
        mock.mockDependencies.push(d);
        return d;
      }
      return apiRequest<TaskDependency>("/dependencies", { method: "POST", body: vars });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dependencies"] }),
  });
}

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const i = mock.mockDependencies.findIndex((d) => d.id === id);
        if (i >= 0) mock.mockDependencies.splice(i, 1);
        return true;
      }
      return apiRequest(`/dependencies/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dependencies"] }),
  });
}

// ---------- sprints ----------
export function useSprints(projectId?: string) {
  return useQuery({
    queryKey: ["sprints", projectId ?? "all"],
    queryFn: async (): Promise<Sprint[]> => {
      if (USE_MOCK)
        return projectId
          ? mock.mockSprints.filter((s) => s.projectId === projectId)
          : mock.mockSprints;
      return apiRequest<Sprint[]>("/sprints", { query: { projectId } });
    },
  });
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export function usePhases(projectId?: string) {
  return useQuery({
    queryKey: ["phases", projectId ?? "all"],
    queryFn: async (): Promise<Phase[]> => {
      if (USE_MOCK) return [];
      return apiRequest<Phase[]>(`/projects/${projectId}/phases`);
    },
    enabled: !!projectId,
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Sprint, "id">) => {
      if (USE_MOCK) {
        const s: Sprint = { id: `sp-${Date.now()}`, ...payload };
        mock.mockSprints.push(s);
        return s;
      }
      return apiRequest<Sprint>("/sprints", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; payload: Partial<Sprint> }) => {
      if (USE_MOCK) {
        const s = mock.mockSprints.find((x) => x.id === vars.id);
        if (s) Object.assign(s, vars.payload);
        return s;
      }
      return apiRequest<Sprint>(`/sprints/${vars.id}`, {
        method: "PUT",
        body: vars.payload,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }),
  });
}

// ---------- role promotion (L+2 authority) ----------
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export function canPromote(
  actorLevel: number | undefined,
  targetCurrentLevel: number,
  targetNewLevel: number,
): { ok: boolean; reason?: string } {
  if (actorLevel === undefined) return { ok: false, reason: "Unknown actor role" };
  if (targetNewLevel <= targetCurrentLevel)
    return { ok: false, reason: "New role must be higher than current" };
  // L+2 rule does not apply to Level 5 (ORG_OWNER), who can promote to any level up to ORG_ADMIN (Level 4) or ORG_OWNER (Level 5)
  if (actorLevel === 5) {
    if (targetNewLevel > 5) {
      return { ok: false, reason: "Cannot assign level above ORG_OWNER" };
    }
    return { ok: true };
  }
  // L+2 rule: actor can promote others to at most (actorLevel - 2)
  const maxAssignable = actorLevel - 2;
  if (targetNewLevel > maxAssignable) {
    return {
      ok: false,
      reason: `Insufficient authority. Your L${actorLevel} role can grant up to L${maxAssignable} only.`,
    };
  }
  return { ok: true };
}

export function usePromoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      newRole: RoleName;
      newLevel: number;
      actorLevel: number;
      currentLevel: number;
    }) => {
      const check = canPromote(vars.actorLevel, vars.currentLevel, vars.newLevel);
      if (!check.ok) throw new PermissionError(check.reason ?? "Forbidden");
      if (USE_MOCK) {
        const u = mock.mockUsers.find((x) => x.id === vars.userId);
        if (u) {
          u.roleName = vars.newRole;
          u.roleLevel = vars.newLevel as User["roleLevel"];
        }
        return u;
      }
      return apiRequest<User>(`/users/${vars.userId}/role`, {
        method: "POST",
        body: { roleName: vars.newRole, roleLevel: vars.newLevel },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ---------- user role update (promote/demote, no L+2 gating) ----------
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; newRole: RoleName; newLevel: number }) => {
      if (USE_MOCK) {
        const u = mock.mockUsers.find((x) => x.id === vars.userId);
        if (u) {
          u.roleName = vars.newRole;
          u.roleLevel = vars.newLevel as User["roleLevel"];
        }
        // Also update team lead if demoted below TEAM_LEAD
        if (vars.newLevel < 2) {
          mock.mockTeams.forEach((t) => {
            if (t.leadUserId === vars.userId) t.leadUserId = undefined as any;
          });
        }
        return u;
      }
      return apiRequest<User>(`/users/${vars.userId}/role`, {
        method: "PUT",
        body: { roleName: vars.newRole, roleLevel: vars.newLevel },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

// ---------- update team lead ----------
export function useUpdateTeamLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { teamId: string; leadUserId: string }) => {
      if (USE_MOCK) {
        const t = mock.mockTeams.find((x) => x.id === vars.teamId);
        if (t) t.leadUserId = vars.leadUserId;
        return t;
      }
      return apiRequest<typeof vars>(`/teams/${vars.teamId}/lead`, {
        method: "PUT",
        body: { leadUserId: vars.leadUserId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// ---------- org setup ----------
export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OrgSetupPayload) => {
      if (USE_MOCK) {
        // append to mock state
        payload.departments.forEach((d, i) => {
          mock.mockDepartments.push({
            id: `d-new-${Date.now()}-${i}`,
            name: d.name,
            description: d.description,
            headUserId: "u-owner",
          });
        });
        payload.teams.forEach((t, i) => {
          const dept = mock.mockDepartments.find((d) => d.name === t.departmentName);
          mock.mockTeams.push({
            id: `t-new-${Date.now()}-${i}`,
            name: t.name,
            description: t.description,
            departmentId: dept?.id ?? "d-plat",
            leadUserId: "u-lead",
          });
        });
        payload.members.forEach((m, i) => {
          mock.mockUsers.push({
            id: `u-new-${Date.now()}-${i}`,
            name: m.name,
            email: m.email,
            roleName: m.roleName,
            roleLevel: roleLevelFor(m.roleName),
          });
        });
        return { ok: true };
      }
      return apiRequest("/organizations/bootstrap", { method: "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

function roleLevelFor(r: RoleName): User["roleLevel"] {
  return (
    { SUPER_ADMIN: 10, ORG_OWNER: 5, ORG_ADMIN: 4, DEPT_HEAD: 3, TEAM_LEAD: 2, TEAM_MEMBER: 1, GUEST: 0 } as const
  )[r] as User["roleLevel"];
}

// ---------- timesheets ----------
export function useCurrentTimesheet(date?: string) {
  return useQuery({
    queryKey: ["timesheet", date ?? "current"],
    queryFn: async (): Promise<Timesheet> => {
      if (USE_MOCK) {
        await sleep();
        // find active user
        const user = mock.mockUsers[0]; // sarah
        let ts = mock.mockTimesheets.find((x) => x.userId === user.id);
        if (!ts) {
          ts = {
            id: `ts-${Date.now()}`,
            userId: user.id,
            startDate: "2026-05-25",
            endDate: "2026-05-31",
            status: "PLANNING",
          };
          mock.mockTimesheets.push(ts);
        }
        return ts;
      }
      return apiRequest<Timesheet>("/timesheets/current", { query: { date } });
    },
  });
}

export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        await sleep();
        const ts = mock.mockTimesheets.find((x) => x.id === id);
        if (ts) ts.status = "SUBMITTED";
        return ts;
      }
      return apiRequest<Timesheet>(`/timesheets/${id}/submit`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timesheet"] }),
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        await sleep();
        const ts = mock.mockTimesheets.find((x) => x.id === id);
        if (ts) {
          ts.status = "APPROVED";
          ts.approvedBy = "Marcus Taylor";
        }
        return ts;
      }
      return apiRequest<Timesheet>(`/timesheets/${id}/approve`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timesheet"] }),
  });
}

// ---------- task routing & suggestions ----------
export function useSuggestAssignee(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", taskId, "suggest-assignee"],
    enabled: !!taskId,
    queryFn: async (): Promise<SuggestedAssignee> => {
      if (USE_MOCK) {
        await sleep();
        // Return a mock suggestion for Priya (u-dev1) or Alice (u-dept)
        const t = mock.mockTasks.find((x) => x.id === taskId);
        const isIssue = t?.taskType === "ISSUE";
        const suggestedId = isIssue ? "u-dept" : "u-dev1";
        const reason = isIssue
          ? "Suggested via matching rule: Critical SRE Pager Routing using strategy: ON_CALL (Alice Chen is currently primary SRE)"
          : "Suggested via matching rule: Frontend bug triage using strategy: LEAST_LOADED (Priya Patel has lowest active workload)";
        return { taskId: taskId!, suggestedAssigneeId: suggestedId, reason };
      }
      return apiRequest<SuggestedAssignee>("/tasks/suggest-assignee", { query: { taskId } });
    },
  });
}

export function useManuallyRouteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (USE_MOCK) {
        await sleep();
        const t = mock.mockTasks.find((x) => x.id === taskId);
        if (t) {
          const prev = t.assigneeIds[0] || null;
          const next = t.taskType === "ISSUE" ? "u-dept" : "u-dev1";
          t.assigneeIds = [next];

          // Add to history
          const hist: AssignmentHistory = {
            id: `ah-${Date.now()}`,
            taskId,
            previousAssigneeId: prev,
            newAssigneeId: next,
            assignedBy: "Auto Router (Manual Evaluate)",
            assignedAt: new Date().toISOString(),
            reason:
              t.taskType === "ISSUE"
                ? "Routed to active on-call shift (Critical SRE Pager Routing)"
                : "Routed via workload balance strategy (Frontend bug triage)",
          };
          mock.mockAssignmentHistory.push(hist);
        }
        return { taskId, routed: true, assignedTo: t?.taskType === "ISSUE" ? "u-dept" : "u-dev1" };
      }
      return apiRequest<{ taskId: string; routed: boolean; assignedTo: string }>(
        `/tasks/${taskId}/route`,
        { method: "POST" },
      );
    },
    onSuccess: (_d, taskId) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks", taskId, "routing-history"] });
    },
  });
}

export function useRoutingHistory(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", taskId, "routing-history"],
    enabled: !!taskId,
    queryFn: async (): Promise<AssignmentHistory[]> => {
      if (USE_MOCK) {
        await sleep();
        return mock.mockAssignmentHistory.filter((x) => x.taskId === taskId);
      }
      return apiRequest<AssignmentHistory[]>(`/tasks/${taskId}/routing-history`);
    },
  });
}

export function useReassignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; userId: string }) => {
      if (USE_MOCK) {
        await sleep();
        const t = mock.mockTasks.find((x) => x.id === vars.taskId);
        if (t) {
          const prev = t.assigneeIds[0] || null;
          t.assigneeIds = [vars.userId];

          // Add to history
          const hist: AssignmentHistory = {
            id: `ah-${Date.now()}`,
            taskId: vars.taskId,
            previousAssigneeId: prev,
            newAssigneeId: vars.userId,
            assignedBy: "Sarah Connor (Manual)",
            assignedAt: new Date().toISOString(),
            reason: "Manual reassignment to suggested developer",
          };
          mock.mockAssignmentHistory.push(hist);
        }
        return { taskId: vars.taskId, status: "SUCCESS" };
      }
      return apiRequest<{ taskId: string; status: string }>(`/tasks/${vars.taskId}/reassign`, {
        method: "POST",
        body: { userId: vars.userId },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.taskId] });
      qc.invalidateQueries({ queryKey: ["tasks", vars.taskId, "routing-history"] });
    },
  });
}

// ---------- routing rules creation & edit ----------
export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<RoutingRule> & { ruleName: string; taskType: Task["taskType"] },
    ) => {
      if (USE_MOCK) {
        await sleep();
        const nr: RoutingRule = {
          id: `rr-${Date.now()}`,
          ruleName: payload.ruleName,
          taskType: payload.taskType,
          targetDepartmentId: payload.targetDepartmentId,
          assignToRole: payload.assignToRole || "TEAM_MEMBER",
          assignmentStrategy: payload.assignmentStrategy || "ROUND_ROBIN",
          priority: payload.priority ?? 1,
          enabled: true,
          triggerCondition: payload.triggerCondition,
        };
        mock.mockRoutingRules.unshift(nr);
        return nr;
      }
      return apiRequest<RoutingRule>("/routing/rules", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; rule: Partial<RoutingRule> }) => {
      if (USE_MOCK) {
        await sleep();
        const r = mock.mockRoutingRules.find((x) => x.id === vars.id);
        if (r) Object.assign(r, vars.rule);
        return r;
      }
      return apiRequest<RoutingRule>(`/routing/rules/${vars.id}`, {
        method: "PUT",
        body: vars.rule,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const idx = mock.mockRoutingRules.findIndex((x) => x.id === id);
        if (idx >= 0) mock.mockRoutingRules.splice(idx, 1);
        return true;
      }
      return apiRequest<void>(`/routing/rules/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

// ---------- Super Admin & Onboarding & Project Members ----------

const mockOrgsList = [
  {
    id: "ab0c0d0e-1234-5678-abcd-efabcdef0000",
    name: "Avendum Tech",
    pricingTier: "ENTERPRISE",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    memberCount: 49,
    projectCount: 4,
    taskCount: 12,
    issueCount: 2,
    insights: { activeTasks: 5, averageCompletionRate: 58.3 }
  },
  {
    id: "org-cyberdyne",
    name: "Cyberdyne Systems",
    pricingTier: "PRO",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    memberCount: 8,
    projectCount: 2,
    taskCount: 6,
    issueCount: 1,
    insights: { activeTasks: 2, averageCompletionRate: 66.7 }
  }
];

export function useSuperAdminOrgs() {
  return useQuery({
    queryKey: ["superadmin-orgs"],
    queryFn: async () => {
      if (USE_MOCK) return mockOrgsList;
      return apiRequest<any[]>("/superadmin/organizations");
    }
  });
}

export function useSuperAdminPlans() {
  return useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: async () => {
      if (USE_MOCK) return []; // Mock plans if needed
      return apiRequest<any[]>("/superadmin/plans");
    }
  });
}

export function useCreateOrUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (USE_MOCK) return payload;
      return apiRequest<any>("/superadmin/plans", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-plans"] });
    }
  });
}

export function useUpdateOrgPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, tier }: { orgId: string, tier: string }) => {
      if (USE_MOCK) return { message: "Mock updated", org: { id: orgId, pricingTier: tier } };
      return apiRequest<any>(`/superadmin/organizations/${orgId}/plan`, {
        method: "PUT",
        body: { tier }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-orgs"] });
    }
  });
}

export function useOnboardOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      orgName: string;
      pricingTier: string;
      adminName: string;
      adminEmail: string;
      adminPassword?: string;
    }) => {
      if (USE_MOCK) {
        const newOrg = {
          id: `org-${Date.now()}`,
          name: payload.orgName,
          pricingTier: payload.pricingTier.toUpperCase(),
          createdAt: new Date().toISOString(),
          memberCount: 1,
          projectCount: 0,
          taskCount: 0,
          issueCount: 0,
          insights: { activeTasks: 0, averageCompletionRate: 0.0 }
        };
        mockOrgsList.push(newOrg);
        mock.mockUsers.push({
          id: `u-${Date.now()}`,
          name: payload.adminName,
          email: payload.adminEmail,
          roleName: "ORG_OWNER",
          roleLevel: 5
        });
        return newOrg;
      }
      return apiRequest<any>("/superadmin/organizations", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-orgs"] });
    }
  });
}

export function useOnboardUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password?: string;
      roleName: string;
      teamId?: string;
      departmentId?: string;
    }) => {
      if (USE_MOCK) {
        const newUser = {
          id: `u-${Date.now()}`,
          name: payload.name,
          email: payload.email,
          roleName: payload.roleName as any,
          roleLevel: 1 as import('./types').RoleLevel // fallback
        };
        mock.mockUsers.push(newUser);
        return newUser;
      }
      return apiRequest<any>("/users", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    }
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (USE_MOCK) {
        return mock.mockProjectMembers.filter((pm: any) => pm.projectId === projectId);
      }
      return apiRequest<any[]>(`/projects/${projectId}/members`);
    }
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; userId: string; role: string }) => {
      if (USE_MOCK) {
        const newMember = {
          id: `pm-${Date.now()}`,
          projectId: vars.projectId,
          userId: vars.userId,
          role: vars.role
        };
        mock.mockProjectMembers.push(newMember);
        return newMember;
      }
      return apiRequest<any>(`/projects/${vars.projectId}/members`, {
        method: "POST",
        body: { userId: vars.userId, role: vars.role }
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-members", vars.projectId] });
    }
  });
}

export function useRemoveProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; userId: string }) => {
      if (USE_MOCK) {
        const filtered = mock.mockProjectMembers.filter(
          (pm: any) => !(pm.projectId === vars.projectId && pm.userId === vars.userId)
        );
        mock.mockProjectMembers.splice(0, mock.mockProjectMembers.length, ...filtered);
        return { ok: true };
      }
      return apiRequest<void>(`/projects/${vars.projectId}/members/${vars.userId}`, {
        method: "DELETE"
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-members", vars.projectId] });
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// Timesheet — assigned tasks for calendar view
// ─────────────────────────────────────────────────────────────────
export function useMyAssignedTasks() {
  return useQuery({
    queryKey: ["my-assigned-tasks"],
    queryFn: async (): Promise<Task[]> => {
      if (USE_MOCK) {
        await sleep();
        const user = tokenStore.getUser<User>() || mock.mockUsers[0];
        return mock.mockTasks.filter((t) => t.assigneeIds.includes(user.id));
      }
      return apiRequest<Task[]>("/time/assigned-tasks");
    },
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; startTime: string; endTime: string; description?: string; billable?: boolean }) => {
      if (USE_MOCK) {
        const user = tokenStore.getUser<User>() || mock.mockUsers[0];
        const hours = Math.max(0.1, (new Date(vars.endTime).getTime() - new Date(vars.startTime).getTime()) / 3_600_000);
        const te: TimeEntry = {
          id: `te-${Date.now()}`,
          userId: user.id,
          taskId: vars.taskId,
          startTime: vars.startTime,
          endTime: vars.endTime,
          description: vars.description,
          billable: vars.billable ?? true,
          hours,
        };
        mock.mockTimeEntries.unshift(te);
        return te;
      }
      return apiRequest<TimeEntry>("/time-entries", {
        method: "POST",
        body: vars,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: { taskId?: string; startTime: string; endTime: string; description?: string; billable?: boolean } }) => {
      if (USE_MOCK) {
        const te = mock.mockTimeEntries.find(x => x.id === vars.id);
        if (te) {
          Object.assign(te, vars.patch);
          te.hours = Math.max(0.1, (new Date(vars.patch.endTime).getTime() - new Date(vars.patch.startTime).getTime()) / 3_600_000);
        }
        return te;
      }
      return apiRequest<TimeEntry>(`/time-entries/${vars.id}`, {
        method: "PATCH",
        body: vars.patch,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        const idx = mock.mockTimeEntries.findIndex(x => x.id === id);
        if (idx >= 0) mock.mockTimeEntries.splice(idx, 1);
        return true;
      }
      return apiRequest<void>(`/time-entries/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Bulk log time entries (calendar grid submit)
// ─────────────────────────────────────────────────────────────────
export function useBulkLogTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      entries: { taskId: string; date: string; hours: number; description?: string; billable?: boolean }[]
    ) => {
      if (USE_MOCK) {
        await sleep();
        return entries.map((e) => ({ id: `te-${Date.now()}`, ...e }));
      }
      return apiRequest<TimeEntry[]>("/time-entries/bulk-log", { method: "POST", body: entries });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Bulk Upload helpers
// ─────────────────────────────────────────────────────────────────
export interface BulkUploadResult {
  succeeded: number;
  failed: number;
  errors: string[];
}

async function bulkUploadCsv(endpoint: string, file: File): Promise<BulkUploadResult> {
  if (USE_MOCK) {
    await sleep(600);
    try {
      const text = await file.text();
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 1 && endpoint === "automations") {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim().replace(/^"(.*)"$/, "$1"));
          if (cols.length >= 3) {
            const name = cols[0] || `Automation Rule ${i}`;
            const triggerType = cols[1] || "TASK_UPDATED";
            const actionType = cols[2] || "ASSIGN_USER";
            const projectId = cols[5] || "default";
            mock.mockAutomations.push({
              id: `a-uploaded-${Date.now()}-${i}`,
              projectId,
              name,
              description: `Trigger: ${triggerType}, Action: ${actionType}`,
              triggerType,
              enabled: true
            });
          }
        }
        return { succeeded: lines.length - 1, failed: 0, errors: [] };
      }
    } catch (e) {
      console.error("Mock upload failed", e);
    }
    return { succeeded: 5, failed: 0, errors: [] };
  }
  const fd = new FormData();
  fd.append("file", file);
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${base}/bulk/${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export function useBulkUploadTeams() {
  return useMutation({ mutationFn: (file: File) => bulkUploadCsv("teams", file) });
}
export function useBulkUploadPeople() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => bulkUploadCsv("people", file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
export function useBulkUploadTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => bulkUploadCsv("tasks", file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
export function useBulkUploadAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => bulkUploadCsv("assignments", file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
export function useBulkUploadAutomations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => bulkUploadCsv("automations", file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}




// -----------------------------------------------------------------
// Collaboration Requests
// -----------------------------------------------------------------
export function useProjectJoinRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-requests', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (USE_MOCK) return [];
      return apiRequest<any[]>(`/api/v1/projects/${projectId}/collaboration/requests`);
    }
  });
}

export function useCreateJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; userId: string }) => {
      if (USE_MOCK) return { ok: true };
      return apiRequest<any>(`/api/v1/projects/${vars.projectId}/collaboration/requests`, {
        method: 'POST',
        body: { userId: vars.userId }
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-requests', vars.projectId] });
    }
  });
}

// ---------- Super Admin ----------
export function useSuperAdminOrganizations() {
  return useQuery({
    queryKey: ["superadmin-organizations"],
    queryFn: async () => {
      if (USE_MOCK) return [];
      return apiRequest<any[]>("/superadmin/organizations");
    },
  });
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: async () => {
      if (USE_MOCK) return { totalOrganizations: 0, totalUsers: 0, estimatedMrr: 0 };
      return apiRequest<any>("/superadmin/stats");
    },
  });
}

export function useSuperAdminOrganizationDetails(orgId: string) {
  return useQuery({
    queryKey: ["superadmin-organizations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (USE_MOCK) return null;
      return apiRequest<any>(`/superadmin/organizations/${orgId}`);
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { orgId: string; name?: string; pricingTier?: string; status?: string }) => {
      if (USE_MOCK) return { ok: true };
      return apiRequest<any>(`/superadmin/organizations/${vars.orgId}`, {
        method: "PUT",
        body: vars,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["superadmin-organizations"] });
      qc.invalidateQueries({ queryKey: ["superadmin-organizations", vars.orgId] });
    },
  });
}
export function useApproveJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; requestId: string }) => {
      if (USE_MOCK) return { ok: true };
      return apiRequest<any>(`/api/v1/superadmin/collaboration/requests/${vars.requestId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-requests', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-members', vars.projectId] });
    }
  });
}

export function useRejectJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; requestId: string }) => {
      if (USE_MOCK) return { ok: true };
      return apiRequest<any>(`/api/v1/superadmin/collaboration/requests/${vars.requestId}/reject`, {
        method: 'POST'
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-requests', vars.projectId] });
    }
  });
}

export function useDashboardWidgets() {
  return useQuery({
    queryKey: ["dashboard-widgets"],
    queryFn: async () => {
      if (USE_MOCK) {
        const projectsByStatus: Record<string, number> = {};
        const projectsByType: Record<string, number> = {};
        const projectsByGroup: Record<string, number> = {};
        const projectsByCustomer: Record<string, number> = {};
        mock.mockProjects.forEach(p => {
          projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
          projectsByType[p.type] = (projectsByType[p.type] || 0) + 1;
          const grp = (p as any).group || "Engineering";
          projectsByGroup[grp] = (projectsByGroup[grp] || 0) + 1;
          const cust = (p as any).customer || "Internal";
          projectsByCustomer[cust] = (projectsByCustomer[cust] || 0) + 1;
        });

        const tasksByPriority: Record<string, number> = {};
        const tasksByStatus: Record<string, number> = {};
        const tasksByType: Record<string, number> = {};
        mock.mockTasks.forEach(t => {
          tasksByPriority[t.priority || "MEDIUM"] = (tasksByPriority[t.priority || "MEDIUM"] || 0) + 1;
          tasksByStatus[t.statusId] = (tasksByStatus[t.statusId] || 0) + 1;
          tasksByType[t.taskType] = (tasksByType[t.taskType] || 0) + 1;
        });

        const issuesBySeverity: Record<string, number> = {};
        const issuesByEnvironment: Record<string, number> = {};
        mock.mockIssues.forEach(i => {
          issuesBySeverity[i.severity] = (issuesBySeverity[i.severity] || 0) + 1;
          issuesByEnvironment[i.environment] = (issuesByEnvironment[i.environment] || 0) + 1;
        });

        const phasesByStatus: Record<string, number> = {};
        mock.mockSprints.forEach(s => {
          phasesByStatus[s.status] = (phasesByStatus[s.status] || 0) + 1;
        });

        return {
          projects: mock.mockProjects,
          tasks: mock.mockTasks,
          issues: mock.mockIssues,
          sprints: mock.mockSprints,
          users: mock.mockUsers,
          teams: mock.mockTeams,
          reports: {
            projectsByStatus,
            projectsByType,
            projectsByGroup,
            projectsByCustomer,
            tasksByPriority,
            tasksByStatus,
            tasksByType,
            issuesBySeverity,
            issuesByEnvironment,
            phasesByStatus,
          }
        };
      }
      return apiRequest<any>("/reports/dashboard/widgets");
    }
  });
}

export function useTeamTasks(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-tasks", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      if (USE_MOCK) {
        let teamUserIds: string[] = [];
        if (teamId === "t-sre") teamUserIds = ["u-dept", "u-dev1"];
        else if (teamId === "t-fe") teamUserIds = ["u-lead", "u-dev2"];
        else if (teamId === "t-be") teamUserIds = ["u-admin", "u-dev3"];
        else if (teamId === "t-ds") teamUserIds = ["u-lead", "u-dev1"];
        else teamUserIds = mock.mockUsers.filter(u => (u as any).teamId === teamId).map(u => u.id);

        return mock.mockTasks.filter(t => t.assigneeIds.some(uid => teamUserIds.includes(uid)));
      }
      return apiRequest<any[]>(`/reports/team/${teamId}/tasks`);
    }
  });
}

export function useProjectTeams(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-teams", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (USE_MOCK) {
        return (mock as any).mockProjectTeams?.filter((pt: any) => pt.projectId === projectId) || [];
      }
      return apiRequest<any[]>(`/projects/${projectId}/teams`);
    }
  });
}

export function useAddProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; teamId: string }) => {
      if (USE_MOCK) {
        const newTeam = {
          id: `pt-${Date.now()}`,
          projectId: vars.projectId,
          teamId: vars.teamId
        };
        if (!(mock as any).mockProjectTeams) {
          (mock as any).mockProjectTeams = [];
        }
        (mock as any).mockProjectTeams.push(newTeam);
        return newTeam;
      }
      return apiRequest<any>(`/projects/${vars.projectId}/teams`, {
        method: "POST",
        body: { teamId: vars.teamId }
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-teams", vars.projectId] });
    }
  });
}

export function useRemoveProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; teamId: string }) => {
      if (USE_MOCK) {
        const filtered = ((mock as any).mockProjectTeams || []).filter(
          (pt: any) => !(pt.projectId === vars.projectId && pt.teamId === vars.teamId)
        );
        (mock as any).mockProjectTeams = filtered;
        return { ok: true };
      }
      return apiRequest<void>(`/projects/${vars.projectId}/teams/${vars.teamId}`, {
        method: "DELETE"
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-teams", vars.projectId] });
    }
  });
}

export function useUpdateUserTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; teamId: string | undefined }) => {
      if (USE_MOCK) {
        const u = mock.mockUsers.find((x) => x.id === vars.userId);
        if (u) {
          u.teamId = vars.teamId;
        }
        return u;
      }
      return apiRequest<User>(`/users/${vars.userId}/team`, {
        method: "PUT",
        body: { teamId: vars.teamId }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    }
  });
}




