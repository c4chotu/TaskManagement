// React Query hooks for the TaskFlow Pro REST API.
// When VITE_API_BASE_URL is unset, falls back to template data in mock-data.ts
// so the UI is fully explorable.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, USE_MOCK } from "./api";
import * as mock from "./mock-data";
import type {
  Attachment, AuthResult, AutomationRule, Comment, CustomTaskStatus, Department, Issue,
  OnCallShift, OrgSetupPayload, Project, RoleName, RoutingRule, Sprint, Task, TaskDependency,
  Team, TimeEntry, User, WorkloadInfo,
} from "./types";


const sleep = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// ---------- auth ----------
export async function authLogin(email: string, password: string): Promise<AuthResult> {
  if (USE_MOCK) {
    await sleep();
    const user = mock.mockUsers.find((u) => u.email === email) || mock.mockUsers[0];
    return { accessToken: "mock-token", refreshToken: "mock-refresh", userId: user.id, orgId: "org-mock", email: user.email, name: user.name };
  }
  return apiRequest<AuthResult>("/auth/login", { method: "POST", body: { email, password }, auth: false });
}

export async function authRegister(payload: { email: string; password: string; name: string; orgName: string }): Promise<AuthResult> {
  if (USE_MOCK) {
    await sleep();
    return { accessToken: "mock-token", refreshToken: "mock-refresh", userId: "u-new", orgId: "org-mock", email: payload.email, name: payload.name };
  }
  return apiRequest<AuthResult>("/auth/register", { method: "POST", body: payload, auth: false });
}

// ---------- users / org ----------
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => (USE_MOCK ? mock.mockUsers : apiRequest<User[]>("/users")),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> => (USE_MOCK ? mock.mockDepartments : apiRequest<Department[]>("/departments")),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => (USE_MOCK ? mock.mockTeams : apiRequest<Team[]>("/teams")),
  });
}

// ---------- projects ----------
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => (USE_MOCK ? mock.mockProjects : apiRequest<Project[]>("/projects")),
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
        const np: Project = { id: `p-${Date.now()}`, status: "ACTIVE", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400_000).toISOString(), progress: 0, description: "", ...payload };
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
        return mock.mockTasks.filter((t) =>
          (!filter?.projectId || t.projectId === filter.projectId) &&
          (!filter?.taskType || t.taskType === filter.taskType)
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
        const nt: Task = { id: `t-${Date.now()}`, statusId: "s-todo", taskType: "TASK", createdAt: new Date().toISOString(), assigneeIds: [], ...payload };
        mock.mockTasks.unshift(nt);
        return nt;
      }
      return apiRequest<Task>("/tasks", { method: "POST", body: payload });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (vars.projectId) qc.invalidateQueries({ queryKey: ["tasks", { projectId: vars.projectId }] });
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
      return apiRequest(`/tasks/${vars.taskId}/status`, { method: "POST", body: { newStatusId: vars.statusId, comment: vars.comment } });
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
        const nc: Comment = { id: `c-${Date.now()}`, taskId: vars.taskId, userId: "u-dev1", content: vars.content, createdAt: new Date().toISOString() };
        mock.mockComments.push(nc);
        return nc;
      }
      return apiRequest<Comment>(`/tasks/${vars.taskId}/comments`, { method: "POST", body: { content: vars.content } });
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["comments", v.taskId] }),
  });
}

// ---------- issues ----------
export function useIssues() {
  return useQuery({
    queryKey: ["issues"],
    queryFn: async (): Promise<Issue[]> => (USE_MOCK ? mock.mockIssues : apiRequest<Issue[]>("/issues")),
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
        if (i) { i.resolved = true; i.rootCause = vars.rootCause; i.resolution = vars.resolution; }
        return i;
      }
      return apiRequest(`/issues/${vars.issueId}/resolve`, { method: "POST", body: { rootCause: vars.rootCause, resolution: vars.resolution } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

// ---------- time tracking ----------
export function useTimeEntries() {
  return useQuery({
    queryKey: ["time-entries"],
    queryFn: async (): Promise<TimeEntry[]> => (USE_MOCK ? mock.mockTimeEntries : apiRequest<TimeEntry[]>("/time-entries")),
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (USE_MOCK) {
        const te: TimeEntry = { id: `te-${Date.now()}`, taskId, startTime: new Date().toISOString(), endTime: null, billable: true };
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
    queryFn: async (): Promise<WorkloadInfo[]> => (USE_MOCK ? mock.mockWorkload : apiRequest<WorkloadInfo[]>("/workload")),
  });
}

export function useOnCall() {
  return useQuery({
    queryKey: ["on-call"],
    queryFn: async (): Promise<OnCallShift[]> => (USE_MOCK ? mock.mockOnCall : apiRequest<OnCallShift[]>("/on-call/schedule")),
  });
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routing-rules"],
    queryFn: async (): Promise<RoutingRule[]> => (USE_MOCK ? mock.mockRoutingRules : apiRequest<RoutingRule[]>("/routing/rules")),
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: ["automations"],
    queryFn: async (): Promise<AutomationRule[]> => (USE_MOCK ? mock.mockAutomations : apiRequest<AutomationRule[]>("/automations")),
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
        xhr.open("POST", `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")}/api/v1/tasks/${vars.taskId}/attachments`);
        const token = localStorage.getItem("tfp.accessToken");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => e.lengthComputable && vars.onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.statusText));
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
      return apiRequest(`/tasks/${vars.taskId}/attachments/${vars.attachmentId}`, { method: "DELETE" });
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
    mutationFn: async (vars: { predecessorId: string; successorId: string; type?: TaskDependency["type"] }) => {
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
      if (USE_MOCK) return projectId ? mock.mockSprints.filter((s) => s.projectId === projectId) : mock.mockSprints;
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
  constructor(message: string) { super(message); this.name = "PermissionError"; }
}

export function canPromote(actorLevel: number | undefined, targetCurrentLevel: number, targetNewLevel: number): { ok: boolean; reason?: string } {
  if (actorLevel === undefined) return { ok: false, reason: "Unknown actor role" };
  if (targetNewLevel <= targetCurrentLevel) return { ok: false, reason: "New role must be higher than current" };
  // L+2 rule: actor can promote others to at most (actorLevel - 2)
  const maxAssignable = actorLevel - 2;
  if (targetNewLevel > maxAssignable) {
    return { ok: false, reason: `Insufficient authority. Your L${actorLevel} role can grant up to L${maxAssignable} only.` };
  }
  return { ok: true };
}

export function usePromoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; newRole: RoleName; newLevel: number; actorLevel: number; currentLevel: number }) => {
      const check = canPromote(vars.actorLevel, vars.currentLevel, vars.newLevel);
      if (!check.ok) throw new PermissionError(check.reason ?? "Forbidden");
      if (USE_MOCK) {
        const u = mock.mockUsers.find((x) => x.id === vars.userId);
        if (u) { u.roleName = vars.newRole; u.roleLevel = vars.newLevel as User["roleLevel"]; }
        return u;
      }
      return apiRequest<User>(`/users/${vars.userId}/role`, { method: "POST", body: { roleName: vars.newRole, roleLevel: vars.newLevel } });
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
          mock.mockDepartments.push({ id: `d-new-${Date.now()}-${i}`, name: d.name, description: d.description, headUserId: "u-owner" });
        });
        payload.teams.forEach((t, i) => {
          const dept = mock.mockDepartments.find((d) => d.name === t.departmentName);
          mock.mockTeams.push({ id: `t-new-${Date.now()}-${i}`, name: t.name, description: t.description, departmentId: dept?.id ?? "d-plat", leadUserId: "u-lead" });
        });
        payload.members.forEach((m, i) => {
          mock.mockUsers.push({ id: `u-new-${Date.now()}-${i}`, name: m.name, email: m.email, roleName: m.roleName, roleLevel: roleLevelFor(m.roleName) });
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
  return ({ ORG_OWNER: 5, ORG_ADMIN: 4, DEPT_HEAD: 3, TEAM_LEAD: 2, TEAM_MEMBER: 1, GUEST: 0 } as const)[r] as User["roleLevel"];
}
