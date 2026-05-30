// Template data used when VITE_API_BASE_URL is not configured.
// Mirrors the REST API shapes so swapping to real data is a no-op.
import type {
  Attachment,
  AutomationRule,
  Comment,
  CustomTaskStatus,
  Department,
  Issue,
  OnCallShift,
  Project,
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
} from "./types";

export const mockUsers: User[] = [
  {
    id: "u-owner",
    name: "Sarah Connor",
    email: "sarah@cyberdyne.io",
    roleName: "ORG_OWNER",
    roleLevel: 5,
    bio: "Founder & CEO",
  },
  {
    id: "u-admin",
    name: "Marcus Taylor",
    email: "marcus@cyberdyne.io",
    roleName: "ORG_ADMIN",
    roleLevel: 4,
    bio: "Platform Director",
  },
  {
    id: "u-dept",
    name: "Alice Chen",
    email: "alice@cyberdyne.io",
    roleName: "DEPT_HEAD",
    roleLevel: 3,
    bio: "Head of SRE",
  },
  {
    id: "u-lead",
    name: "Diego Martinez",
    email: "diego@cyberdyne.io",
    roleName: "TEAM_LEAD",
    roleLevel: 2,
    bio: "Frontend Lead",
  },
  {
    id: "u-dev1",
    name: "Priya Patel",
    email: "priya@cyberdyne.io",
    roleName: "TEAM_MEMBER",
    roleLevel: 1,
  },
  {
    id: "u-dev2",
    name: "Jordan Kim",
    email: "jordan@cyberdyne.io",
    roleName: "TEAM_MEMBER",
    roleLevel: 1,
  },
  {
    id: "u-dev3",
    name: "Mei Tanaka",
    email: "mei@cyberdyne.io",
    roleName: "TEAM_MEMBER",
    roleLevel: 1,
  },
  { id: "u-guest", name: "Acme Reviewer", email: "guest@acme.io", roleName: "GUEST", roleLevel: 0 },
];

export const mockDepartments: Department[] = [
  {
    id: "d-plat",
    name: "Platform Engineering",
    description: "Kubernetes, data plane, SRE.",
    headUserId: "u-dept",
  },
  {
    id: "d-prod",
    name: "Product Engineering",
    description: "Web app, mobile, API surface.",
    headUserId: "u-admin",
  },
  {
    id: "d-design",
    name: "Design Systems",
    description: "Lumina design system & brand.",
    headUserId: "u-lead",
  },
];

export const mockTeams: Team[] = [
  {
    id: "t-sre",
    departmentId: "d-plat",
    name: "SRE Core",
    description: "On-call, incidents, reliability.",
    leadUserId: "u-dept",
  },
  {
    id: "t-fe",
    departmentId: "d-prod",
    name: "Frontend Core",
    description: "Web app & glassmorphism UI.",
    leadUserId: "u-lead",
  },
  {
    id: "t-be",
    departmentId: "d-prod",
    name: "Backend API",
    description: "REST + GraphQL services.",
    leadUserId: "u-admin",
  },
  {
    id: "t-ds",
    departmentId: "d-design",
    name: "Design Systems",
    description: "Tokens, components.",
    leadUserId: "u-lead",
  },
];

export const mockProjects: Project[] = [
  {
    id: "p-ingress",
    name: "US-East Ingress Failover",
    description: "Automatic failover for primary ingress under latency spikes.",
    status: "ACTIVE",
    type: "KANBAN",
    startDate: "2026-05-01T00:00:00Z",
    endDate: "2026-06-15T00:00:00Z",
    progress: 62,
  },
  {
    id: "p-billing",
    name: "Billing Pipeline v3",
    description: "Migrate billing pipeline to event-sourced architecture.",
    status: "ACTIVE",
    type: "SCRUM",
    startDate: "2026-04-15T00:00:00Z",
    endDate: "2026-07-10T00:00:00Z",
    progress: 41,
  },
  {
    id: "p-design",
    name: "Lumina Design System",
    description: "Token unification across web/mobile.",
    status: "IN_REVIEW",
    type: "KANBAN",
    startDate: "2026-03-01T00:00:00Z",
    endDate: "2026-05-30T00:00:00Z",
    progress: 88,
  },
  {
    id: "p-mobile",
    name: "Mobile App Beta",
    description: "iOS/Android closed beta launch.",
    status: "ACTIVE",
    type: "SCRUM",
    startDate: "2026-05-10T00:00:00Z",
    endDate: "2026-08-30T00:00:00Z",
    progress: 22,
  },
];

export const mockStatuses: Record<string, CustomTaskStatus[]> = {
  default: [
    {
      id: "s-backlog",
      name: "Backlog",
      category: "PLANNING",
      color: "#64748b",
      sortOrder: 10,
      isDefault: true,
      wipLimit: 5,
    },
    {
      id: "s-todo",
      name: "To Do",
      category: "PLANNING",
      color: "#3b82f6",
      sortOrder: 20,
      wipLimit: 5,
    },
    {
      id: "s-progress",
      name: "In Progress",
      category: "ACTIVE",
      color: "#10b981",
      sortOrder: 30,
      wipLimit: 3,
    },
    {
      id: "s-review",
      name: "In Review",
      category: "ACTIVE",
      color: "#a855f7",
      sortOrder: 40,
      wipLimit: 3,
    },
    {
      id: "s-blocked",
      name: "Blocked",
      category: "BLOCKED",
      color: "#ef4444",
      sortOrder: 50,
      requiresComment: true,
      wipLimit: 1,
    },
    { id: "s-done", name: "Done", category: "COMPLETED", color: "#22c55e", sortOrder: 60 },
  ],
};

const today = new Date();
const iso = (d: number) => new Date(today.getTime() + d * 86400_000).toISOString();

export const mockTasks: Task[] = [
  {
    id: "t-1",
    title: "Migrate JWT to dynamic claims",
    description: "Adjust token claim parameter validations.",
    statusId: "s-progress",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(-3),
    dueDate: iso(2),
    assigneeIds: ["u-dev1"],
    estimatedHours: 8,
    loggedHours: 3,
    priority: "HIGH",
  },
  {
    id: "t-2",
    title: "Hikari pool tuning under burst",
    description: "Increase pool size to 45, validate under k6 load.",
    statusId: "s-review",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(-7),
    dueDate: iso(1),
    assigneeIds: ["u-dev2", "u-lead"],
    estimatedHours: 5,
    loggedHours: 5,
    priority: "HIGH",
  },
  {
    id: "t-3",
    title: "Ingress controller blue/green script",
    statusId: "s-todo",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(-1),
    dueDate: iso(7),
    assigneeIds: ["u-dev3"],
    estimatedHours: 12,
    loggedHours: 0,
    priority: "MEDIUM",
  },
  {
    id: "t-4",
    title: "Add canary metrics to Grafana",
    statusId: "s-backlog",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(0),
    dueDate: iso(14),
    assigneeIds: [],
    estimatedHours: 3,
    loggedHours: 0,
    priority: "LOW",
  },
  {
    id: "t-5",
    title: "Document runbook for failover",
    statusId: "s-done",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(-12),
    dueDate: iso(-2),
    assigneeIds: ["u-dev1"],
    estimatedHours: 4,
    loggedHours: 4,
    priority: "MEDIUM",
  },
  {
    id: "t-6",
    title: "Replication lag on shard-3",
    description: "Replica falling behind by 200s during peak.",
    statusId: "s-blocked",
    projectId: "p-ingress",
    taskType: "TASK",
    createdAt: iso(-2),
    dueDate: iso(3),
    assigneeIds: ["u-dev2"],
    estimatedHours: 6,
    loggedHours: 2,
    priority: "HIGH",
  },
  // Issues
  {
    id: "i-1",
    title: "US-East ingress latency > 1200ms",
    description: "Ingress controllers failing connection replication.",
    statusId: "s-progress",
    projectId: "p-ingress",
    taskType: "ISSUE",
    createdAt: iso(0),
    assigneeIds: ["u-dept"],
    severity: "SEV0",
    priority: "CRITICAL",
  },
  {
    id: "i-2",
    title: "Webhook delivery retry storm",
    statusId: "s-todo",
    projectId: "p-billing",
    taskType: "ISSUE",
    createdAt: iso(-1),
    assigneeIds: ["u-dev2"],
    severity: "SEV1",
    priority: "HIGH",
  },
  {
    id: "i-3",
    title: "Design token contrast regression",
    statusId: "s-review",
    projectId: "p-design",
    taskType: "ISSUE",
    createdAt: iso(-2),
    assigneeIds: ["u-lead"],
    severity: "SEV2",
  },
  {
    id: "i-4",
    title: "iOS Beta crashloop on cold start",
    statusId: "s-done",
    projectId: "p-mobile",
    taskType: "ISSUE",
    createdAt: iso(-5),
    assigneeIds: ["u-dev3"],
    severity: "SEV1",
  },
];

export const mockIssues: Issue[] = [
  {
    id: "is-1",
    taskId: "i-1",
    severity: "SEV0",
    environment: "Production",
    affectedVersion: "v1.4.2",
    customerReported: true,
    customerName: "Acme Corp",
    customerImpact: "Payment gateway processing fails completely",
    slaBreached: false,
    slaTargetResponse: iso(0).replace(/T.*/, "T18:15:00Z"),
    slaTargetFix: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    acknowledged: true,
  },
  {
    id: "is-2",
    taskId: "i-2",
    severity: "SEV1",
    environment: "Production",
    customerReported: false,
    slaBreached: false,
    slaTargetResponse: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    slaTargetFix: new Date(Date.now() + 60 * 60 * 1000 * 3).toISOString(),
    acknowledged: true,
  },
  {
    id: "is-3",
    taskId: "i-3",
    severity: "SEV2",
    environment: "Staging",
    customerReported: false,
    slaBreached: false,
    slaTargetResponse: new Date(Date.now() + 60 * 60 * 1000 * 2).toISOString(),
    slaTargetFix: new Date(Date.now() + 60 * 60 * 1000 * 8).toISOString(),
  },
  {
    id: "is-4",
    taskId: "i-4",
    severity: "SEV1",
    environment: "Production",
    customerReported: true,
    customerName: "Beta Tester Group",
    slaBreached: false,
    slaTargetResponse: iso(-5),
    slaTargetFix: iso(-4),
    acknowledged: true,
    resolved: true,
    rootCause: "Race in keychain access at launch",
    resolution: "Defer keychain read until first user interaction.",
  },
];

export const mockComments: Comment[] = [
  {
    id: "c-1",
    taskId: "i-1",
    userId: "u-dept",
    content: "Acknowledged. Investigating Hikari pool exhaustion.",
    createdAt: iso(0),
  },
  {
    id: "c-2",
    taskId: "i-1",
    userId: "u-dev1",
    content: "Logs show connection wait queue spiking to 300+.",
    createdAt: iso(0),
  },
  {
    id: "c-3",
    taskId: "t-2",
    userId: "u-lead",
    content: "PR ready for review — see #4421.",
    createdAt: iso(-1),
  },
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: "te-1",
    taskId: "t-1",
    userId: "u-dev1",
    startTime: iso(-1),
    endTime: iso(-1),
    billable: true,
    hours: 2.5,
    description: "Token claim audit",
  },
  {
    id: "te-2",
    taskId: "t-2",
    userId: "u-dev2",
    startTime: iso(-2),
    endTime: iso(-2),
    billable: true,
    hours: 5,
    description: "Load test runs",
  },
  {
    id: "te-3",
    taskId: "t-5",
    userId: "u-dev1",
    startTime: iso(-3),
    endTime: iso(-3),
    billable: false,
    hours: 4,
    description: "Runbook writeup",
  },
];

export const mockOnCall: OnCallShift[] = [
  { id: "oc-1", userId: "u-dept", weekStartDate: "2026-05-25", coverageType: "PRIMARY" },
  { id: "oc-2", userId: "u-dev2", weekStartDate: "2026-05-25", coverageType: "SECONDARY" },
  { id: "oc-3", userId: "u-dev1", weekStartDate: "2026-06-01", coverageType: "PRIMARY" },
];

export const mockRoutingRules: RoutingRule[] = [
  {
    id: "rr-1",
    ruleName: "Critical SRE Pager Routing",
    taskType: "ISSUE",
    targetDepartmentId: "d-plat",
    assignToRole: "DEPT_HEAD",
    assignmentStrategy: "ON_CALL",
    priority: 10,
    enabled: true,
  },
  {
    id: "rr-2",
    ruleName: "Frontend bug triage",
    taskType: "ISSUE",
    targetDepartmentId: "d-prod",
    assignToRole: "TEAM_LEAD",
    assignmentStrategy: "LEAST_LOADED",
    priority: 5,
    enabled: true,
  },
  {
    id: "rr-3",
    ruleName: "Design QA round-robin",
    taskType: "TASK",
    targetDepartmentId: "d-design",
    assignToRole: "TEAM_MEMBER",
    assignmentStrategy: "ROUND_ROBIN",
    priority: 1,
    enabled: false,
  },
];

export const mockAutomations: AutomationRule[] = [
  {
    id: "a-1",
    projectId: "p-ingress",
    name: "Notify on Blocked",
    description: "Ping Dept Head when any task enters Blocked.",
    triggerType: "TASK_UPDATED",
    enabled: true,
  },
  {
    id: "a-2",
    projectId: "p-billing",
    name: "Auto-close stale backlog",
    description: "Move tasks idle 30d in Backlog to Archived.",
    triggerType: "SCHEDULED",
    enabled: true,
  },
];

export const mockWorkload: WorkloadInfo[] = [
  { userId: "u-dev1", totalActiveTasks: 4, totalEstimatedHours: 22, overloaded: false },
  { userId: "u-dev2", totalActiveTasks: 6, totalEstimatedHours: 38, overloaded: true },
  { userId: "u-dev3", totalActiveTasks: 3, totalEstimatedHours: 14, overloaded: false },
  { userId: "u-lead", totalActiveTasks: 5, totalEstimatedHours: 28, overloaded: false },
  { userId: "u-dept", totalActiveTasks: 7, totalEstimatedHours: 41, overloaded: true },
];
export function findUser(id: string) {
  return mockUsers.find((u) => u.id === id);
}

export const mockAttachments: Attachment[] = [
  {
    id: "att-1",
    taskId: "i-1",
    fileName: "ingress-error-log.txt",
    mimeType: "text/plain",
    sizeBytes: 12_400,
    url: "#",
    uploadedAt: iso(0),
    uploadedBy: "u-dept",
  },
  {
    id: "att-2",
    taskId: "t-2",
    fileName: "k6-load-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 245_300,
    url: "#",
    uploadedAt: iso(-1),
    uploadedBy: "u-dev2",
  },
];

export const mockDependencies: TaskDependency[] = [
  { id: "dep-1", predecessorId: "t-1", successorId: "t-2", type: "FS" },
  { id: "dep-2", predecessorId: "t-2", successorId: "t-3", type: "FS" },
];

export const mockSprints: Sprint[] = [
  {
    id: "sp-1",
    projectId: "p-billing",
    name: "Sprint 12 · Event Sourcing",
    goal: "Migrate billing reads to event store.",
    startDate: iso(-7),
    endDate: iso(7),
    status: "ACTIVE",
    taskIds: ["t-1", "t-2", "t-3"],
  },
  {
    id: "sp-2",
    projectId: "p-billing",
    name: "Sprint 13 · Cutover",
    goal: "Switch writes to new pipeline.",
    startDate: iso(8),
    endDate: iso(22),
    status: "PLANNED",
    taskIds: ["t-4"],
  },
  {
    id: "sp-3",
    projectId: "p-mobile",
    name: "Beta-A",
    goal: "Stabilize cold-start crashloops.",
    startDate: iso(-14),
    endDate: iso(-1),
    status: "COMPLETED",
    taskIds: ["t-5"],
  },
];

export const mockTimesheets: Timesheet[] = [
  {
    id: "ts-1",
    userId: "u-owner",
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    status: "APPROVED",
    approvedBy: "Marcus Taylor",
  },
  {
    id: "ts-2",
    userId: "u-dev1",
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    status: "PLANNING",
  },
  {
    id: "ts-3",
    userId: "u-dev2",
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    status: "SUBMITTED",
  },
];

export const mockAssignmentHistory: AssignmentHistory[] = [
  {
    id: "ah-1",
    taskId: "t-1",
    previousAssigneeId: null,
    newAssigneeId: "u-dev1",
    assignedBy: "Diego Martinez",
    assignedAt: iso(-3),
    reason: "Initial assignment",
  },
  {
    id: "ah-2",
    taskId: "i-1",
    previousAssigneeId: null,
    newAssigneeId: "u-dept",
    assignedBy: "Auto Router",
    assignedAt: iso(0),
    reason: "Routed to active on-call shift (Critical SRE Pager Routing)",
  },
];

export const mockProjectMembers = [
  { id: "pm-1", projectId: "p-ingress", userId: "u-owner", role: "PROJECT_OWNER" },
  { id: "pm-2", projectId: "p-ingress", userId: "u-admin", role: "PROJECT_ADMIN" },
  { id: "pm-3", projectId: "p-ingress", userId: "u-dept", role: "PROJECT_MANAGER" },
  { id: "pm-4", projectId: "p-ingress", userId: "u-dev1", role: "PROJECT_MEMBER" }
];

