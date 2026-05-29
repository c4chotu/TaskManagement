import apiClient from './apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleLevel: number;
  roleName: string;
  departmentId?: string;
  teamId?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  headUserId: string;
  parentDepartmentId?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leadUserId: string;
  departmentId: string;
}

export interface SlaDefinition {
  id: string;
  severity: string;
  responseTimeMinutes: number;
  fixTimeMinutes: number;
  escalateAfterMinutes?: number;
  escalateToRole?: string;
  businessHoursOnly: boolean;
}

export interface OnCallSchedule {
  id: string;
  userId: string;
  weekStartDate: string;
  coverageType: string;
}

export interface CustomTaskStatus {
  id: string;
  name: string;
  category: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  requiresComment: boolean;
  requiresApproval: boolean;
  autoTransitionDays?: number;
  transitionToOnAuto?: string;
}

export interface StatusTransition {
  id: string;
  fromStatusId: string;
  toStatusId: string;
  allowedRole?: string;
  requiresApproval: boolean;
  approvalRole?: string;
  webhookUrl?: string;
}

export interface StatusHistory {
  id: string;
  taskId: string;
  fromStatusId?: string;
  toStatusId: string;
  changedAt: string;
  changedByUserId: string;
  comment?: string;
  timeInStatusMinutes?: number;
}

export interface RoutingRule {
  id: string;
  ruleName: string;
  taskType: string;
  triggerCondition?: any;
  sourceDepartmentId?: string;
  sourceTeamId?: string;
  targetDepartmentId?: string;
  targetTeamId?: string;
  assignToRole?: string;
  assignmentStrategy: string;
  autoCreateSubtasks: boolean;
  subtaskTemplate?: any;
  priority: number;
  enabled: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  statusId: string;
  projectId: string;
  taskType: string; // "TASK" or "ISSUE"
  departmentId?: string;
  teamId?: string;
  escalatedAt?: string;
  escalationCount?: number;
  createdAt: string;
  dueDate?: string;
  assigneeIds?: string[];
  assignees?: User[];
}

export interface IssueDetail {
  id: string;
  taskId: string;
  severity: string; // "SEV0", "SEV1", etc.
  environment?: string;
  affectedVersion?: string;
  customerReported: boolean;
  customerName?: string;
  customerImpact?: string;
  slaBreached: boolean;
  slaTargetResponse?: string;
  slaTargetFix?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  rootCause?: string;
  resolution?: string;
  verifiedAt?: string;
  duplicateOfTaskId?: string;
}

// --- API Methods ---

// User & Role Hierarchy
export const assignRole = async (data: {
  userId: string;
  roleLevel: number;
  roleName: string;
  departmentId?: string;
  teamId?: string;
}) => {
  const response = await apiClient.post<UserRole>('/api/v1/roles/assign', data);
  return response.data;
};

export const getUserRoles = async (userId: string) => {
  const response = await apiClient.get<UserRole[]>(`/api/v1/roles/user/${userId}`);
  return response.data;
};

export const revokeRole = async (roleId: string) => {
  await apiClient.delete(`/api/v1/roles/${roleId}`);
};

export const getRoleHierarchy = async () => {
  const response = await apiClient.get<Record<string, string>>('/api/v1/roles/hierarchy');
  return response.data;
};

export const getSubordinates = async () => {
  const response = await apiClient.get<User[]>('/api/v1/roles/subordinates');
  return response.data;
};

export const getAllUsers = async () => {
  // Try fetching from users listing, fallback to standard listing
  const response = await apiClient.get<User[]>('/api/v1/users');
  return response.data;
};

// Departments & Teams
export const createDepartment = async (data: {
  name: string;
  description: string;
  headUserId: string;
  parentDepartmentId?: string;
}) => {
  const response = await apiClient.post<Department>('/api/v1/departments', data);
  return response.data;
};

export const createTeamInDepartment = async (departmentId: string, data: {
  name: string;
  description: string;
  leadUserId: string;
}) => {
  const response = await apiClient.post<Team>(`/api/v1/departments/${departmentId}/teams`, data);
  return response.data;
};

// Issues & SLA
export const createIssue = async (data: {
  taskRequest: {
    title: string;
    description: string;
    projectId: string;
    dueDate?: string;
  };
  severity: string;
  environment?: string;
  affectedVersion?: string;
  customerReported: boolean;
  customerName?: string;
  customerImpact?: string;
}) => {
  const response = await apiClient.post<IssueDetail>('/api/v1/issues', data);
  return response.data;
};

export const getSlaStatus = async (issueId: string) => {
  const response = await apiClient.get<{ minutesRemaining: number; breached: boolean }>(`/api/v1/issues/${issueId}/sla-status`);
  return response.data;
};

export const respondToIssue = async (issueId: string) => {
  await apiClient.post(`/api/v1/issues/${issueId}/respond`);
};

export const resolveIssue = async (issueId: string, data: { rootCause: string; resolution: string }) => {
  await apiClient.post(`/api/v1/issues/${issueId}/resolve`, data);
};

export const verifyIssue = async (issueId: string) => {
  await apiClient.post(`/api/v1/issues/${issueId}/verify`);
};

export const markDuplicate = async (issueId: string, parentId: string) => {
  await apiClient.post(`/api/v1/issues/${issueId}/duplicate/${parentId}`);
};

export const configureSla = async (data: {
  severity: string;
  responseTimeMinutes: number;
  fixTimeMinutes: number;
  escalateAfterMinutes?: number;
  escalateToRole?: string;
  businessHoursOnly: boolean;
}) => {
  const response = await apiClient.post<SlaDefinition>('/api/v1/sla/definitions', data);
  return response.data;
};

export const setOnCallSchedule = async (data: {
  userId: string;
  weekStartDate: string;
  coverageType: string;
}) => {
  const response = await apiClient.post<OnCallSchedule>('/api/v1/on-call/schedule', data);
  return response.data;
};

// Custom Status & Workflow
export const getAvailableTransitions = async (taskId: string) => {
  const response = await apiClient.get<CustomTaskStatus[]>(`/api/v1/statuses/available/${taskId}`);
  return response.data;
};

export const transitionStatus = async (taskId: string, data: { newStatusId: string; comment?: string }) => {
  const response = await apiClient.post<Task>(`/api/v1/tasks/${taskId}/status`, data);
  return response.data;
};

export const getStatusHistory = async (taskId: string) => {
  const response = await apiClient.get<StatusHistory[]>(`/api/v1/statuses/history/${taskId}`);
  return response.data;
};

export const getCycleTimeAnalytics = async () => {
  const response = await apiClient.get<any>('/api/v1/statuses/analytics');
  return response.data;
};

export const addCustomStatusToProject = async (projectId: string, data: {
  departmentId?: string;
  name: string;
  category: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  requiresComment: boolean;
  requiresApproval: boolean;
  autoTransitionDays?: number;
  transitionToOnAuto?: string;
}) => {
  const response = await apiClient.post<CustomTaskStatus>(`/api/v1/projects/${projectId}/statuses`, data);
  return response.data;
};

// Routing & Workloads
export const createRoutingRule = async (data: Omit<RoutingRule, 'id'>) => {
  const response = await apiClient.post<RoutingRule>('/api/v1/routing/rules', data);
  return response.data;
};

export const listRoutingRules = async () => {
  const response = await apiClient.get<RoutingRule[]>('/api/v1/routing/rules');
  return response.data;
};

export const updateRoutingRule = async (id: string, data: Omit<RoutingRule, 'id'>) => {
  const response = await apiClient.put<RoutingRule>(`/api/v1/routing/rules/${id}`, data);
  return response.data;
};

export const suggestAssignee = async (taskId: string) => {
  const response = await apiClient.get<{ taskId: string; suggestedAssigneeId: string | null; reason: string }>(`/api/v1/tasks/suggest-assignee?taskId=${taskId}`);
  return response.data;
};

export const getUserWorkload = async (userId: string) => {
  const response = await apiClient.get<any>(`/api/v1/workload/user/${userId}`);
  return response.data;
};

export const getTeamWorkload = async (teamId: string) => {
  const response = await apiClient.get<any>(`/api/v1/workload/team/${teamId}`);
  return response.data;
};

export const getDepartmentWorkload = async (deptId: string) => {
  const response = await apiClient.get<any>(`/api/v1/workload/department/${deptId}`);
  return response.data;
};

export const manuallyRouteTask = async (taskId: string) => {
  const response = await apiClient.post<any>(`/api/v1/tasks/${taskId}/route`);
  return response.data;
};

export const reassignTask = async (taskId: string, userId: string) => {
  const response = await apiClient.post<any>(`/api/v1/tasks/${taskId}/reassign`, { userId });
  return response.data;
};

// Additional helper listing utilities
export const getProjects = async () => {
  const response = await apiClient.get<any[]>('/api/v1/projects');
  return response.data;
};

export const getTasks = async (projectId: string) => {
  const response = await apiClient.get<Task[]>(`/api/v1/tasks?projectId=${projectId}`);
  return response.data;
};

export const createTask = async (data: {
  title: string;
  description: string;
  projectId: string;
  dueDate?: string;
  assigneeIds?: string[];
  statusId?: string;
}) => {
  const response = await apiClient.post<Task>('/api/v1/tasks', data);
  return response.data;
};
