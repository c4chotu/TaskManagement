export type RoleName = "ORG_OWNER" | "ORG_ADMIN" | "DEPT_HEAD" | "TEAM_LEAD" | "TEAM_MEMBER" | "GUEST";
export type RoleLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type Severity = "SEV0" | "SEV1" | "SEV2" | "SEV3";
export type StatusCategory = "PLANNING" | "ACTIVE" | "BLOCKED" | "COMPLETED";
export type ProjectType = "KANBAN" | "SCRUM" | "WATERFALL";
export type TaskType = "TASK" | "ISSUE";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  roleName?: RoleName;
  roleLevel?: RoleLevel;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headUserId: string;
  organizationId?: string;
  parentDepartmentId?: string | null;
}

export interface Team {
  id: string;
  departmentId: string;
  name: string;
  description?: string;
  leadUserId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "IN_REVIEW" | "ARCHIVED" | "COMPLETED";
  type: ProjectType;
  startDate: string;
  endDate: string;
  organizationId?: string;
  progress?: number;
}

export interface CustomTaskStatus {
  id: string;
  name: string;
  category: StatusCategory;
  color: string;
  sortOrder: number;
  isDefault?: boolean;
  requiresComment?: boolean;
  requiresApproval?: boolean;
  wipLimit?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  statusId: string;
  projectId: string;
  taskType: TaskType;
  createdAt: string;
  dueDate?: string;
  assigneeIds: string[];
  estimatedHours?: number;
  loggedHours?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity?: Severity;
}

export interface Issue {
  id: string;
  taskId: string;
  severity: Severity;
  environment: string;
  affectedVersion?: string;
  customerReported: boolean;
  customerName?: string;
  customerImpact?: string;
  slaBreached: boolean;
  slaTargetResponse: string;
  slaTargetFix: string;
  acknowledged?: boolean;
  resolved?: boolean;
  rootCause?: string;
  resolution?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId?: string;
  startTime: string;
  endTime: string | null;
  description?: string | null;
  billable: boolean;
  hours?: number;
}

export interface OnCallShift {
  id: string;
  userId: string;
  weekStartDate: string;
  coverageType: "PRIMARY" | "SECONDARY";
}

export interface RoutingRule {
  id: string;
  ruleName: string;
  taskType: TaskType;
  targetDepartmentId?: string;
  assignToRole?: RoleName;
  assignmentStrategy: "ROUND_ROBIN" | "LEAST_LOADED" | "ON_CALL";
  priority: number;
  enabled: boolean;
}

export interface AutomationRule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  triggerType: string;
  enabled: boolean;
}

export interface WorkloadInfo {
  userId: string;
  totalActiveTasks: number;
  totalEstimatedHours: number;
  overloaded: boolean;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TaskDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: "FS" | "SS" | "FF" | "SF";
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  taskIds: string[];
}

export interface OrgSetupPayload {
  organization: { name: string; description?: string };
  departments: { name: string; description?: string }[];
  teams: { name: string; departmentName: string; description?: string }[];
  members: { name: string; email: string; roleName: RoleName; teamName?: string }[];
}

export interface Timesheet {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: "PLANNING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  approvedBy?: string;
}

export interface AssignmentHistory {
  id: string;
  taskId: string;
  previousAssigneeId?: string | null;
  newAssigneeId: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
}

export interface SuggestedAssignee {
  taskId: string;
  suggestedAssigneeId?: string | null;
  reason: string;
}


