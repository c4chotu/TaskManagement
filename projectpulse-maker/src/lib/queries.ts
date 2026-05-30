// React Query hooks for the TaskFlow Pro REST API.
// When VITE_API_BASE_URL is unset, falls back to template data in mock-data.ts
// so the UI is fully explorable.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, USE_MOCK } from "./api";
import * as mock from "./mock-data";
import type {
  Attachment,
  AuthResult,
  AutomationRule,
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
    queryFn: async (): Promise<Project | undefined> => {
      if (USE_MOCK) return mock.mockProjects.find((p) => p.id === id);
      return apiRequest<Project>(`/projects/${id}`);
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
    queryKey: ["statuses", _projectId ?? "default"],
    queryFn: async (): Promise<CustomTaskStatus[]> => {
      if (USE_MOCK) return mock.mockStatuses.default;
      return apiRequest<CustomTaskStatus[]>(`/projects/${_projectId}/statuses`);
    },
  });
}

// ---------- tasks ----------
export function useTasks(filter?: { projectId?: string; taskType?: Task["taskType"] }) {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: async (): Promise<Task[]> => {
      if (USE_MOCK) {
        return mock.mockTasks.filter(
          (t) =>
            (!filter?.projectId || t.projectId === filter.projectId) &&
            (!filter?.taskType || t.taskType === filter.taskType),
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
    queryFn: async (): Promise<Task | undefined> => {
      if (USE_MOCK) return mock.mockTasks.find((t) => t.id === id);
      return apiRequest<Task>(`/tasks/${id}`);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
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
    queryFn: async (): Promise<Issue | undefined> => {
      if (USE_MOCK) return mock.mockIssues.find((i) => i.taskId === taskId);
      return apiRequest<Issue>(`/issues/by-task/${taskId}`);
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
      return apiRequest<Attachment[]>(`/tasks/${taskId}/attachments`);
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
        return mock.mockTasks.slice(0, 10);
      }
      return apiRequest<Task[]>("/time/assigned-tasks");
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

