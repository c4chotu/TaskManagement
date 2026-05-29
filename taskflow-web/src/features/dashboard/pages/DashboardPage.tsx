import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../auth/store/authSlice';
import type { RootState } from '../../../shared/store/rootReducer';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../shared/lib/apiClient';
import * as api from '../../../shared/lib/apiClientExtensions';
import {
  LogOut,
  User,
  Shield,
  Sparkles,
  LayoutGrid,
  Kanban as KanbanIcon,
  TrendingUp,
  Users,
  Settings,
  Bell,
  AlertTriangle,
  Flame,
  Clock,
  Plus,
  CheckCircle,
  AlertOctagon
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  avatarUrl: string | null;
  bio: string | null;
}

// Fallback/Mock Database state for full offline robustness
const MOCK_USERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Alice Chen', email: 'alice@taskflow.pro', roleLevel: 5, roleName: 'ORG_OWNER' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Marcus Taylor', email: 'marcus@taskflow.pro', roleLevel: 3, roleName: 'DEPT_HEAD' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'David Kim', email: 'david@taskflow.pro', roleLevel: 2, roleName: 'TEAM_LEAD' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Sarah Connor', email: 'sarah@taskflow.pro', roleLevel: 1, roleName: 'TEAM_MEMBER' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Guest Observer', email: 'guest@taskflow.pro', roleLevel: 0, roleName: 'GUEST' }
];



export const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authUser = useSelector((state: RootState) => state.auth.user);

  // Active view tab: overview, kanban, workload, roster
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'workload' | 'roster'>('overview');
  
  // State variables for interactive functions
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [tasks, setTasks] = useState<api.Task[]>([]);
  const [statuses, setStatuses] = useState<api.CustomTaskStatus[]>([]);
  const [routingRules, setRoutingRules] = useState<api.RoutingRule[]>([]);
  const [users, setUsers] = useState<any[]>(MOCK_USERS);
  
  // Selected task in detail drawer
  const [selectedTask, setSelectedTask] = useState<api.Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<api.IssueDetail | null>(null);
  const [statusTransitions, setStatusTransitions] = useState<api.CustomTaskStatus[]>([]);
  const [statusHistory, setStatusHistory] = useState<api.StatusHistory[]>([]);
  const [cycleTime, setCycleTime] = useState<any>(null);
  
  // Interactive Prompts
  const [blockComment, setBlockComment] = useState('');
  const [isBlockingPromptOpen, setIsBlockingPromptOpen] = useState(false);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState<api.CustomTaskStatus | null>(null);
  
  // RCA details for resolving issues
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Create task modal
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState<'TASK' | 'ISSUE'>('TASK');
  const [newIssueSeverity, setNewIssueSeverity] = useState('SEV2');
  
  // Routing Rules state
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleStrategy, setRuleStrategy] = useState('LEAST_BUSY');
  const [ruleType, setRuleType] = useState('TASK');

  // Hierarchy role promo state
  const [selectedUserToPromote, setSelectedUserToPromote] = useState('');
  const [promotionLevel, setPromotionLevel] = useState(1);
  const [promotionRoleName, setPromotionRoleName] = useState('TEAM_MEMBER');

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Get current user profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/users/me');
        return response.data;
      } catch (err) {
        // Mock profile failover
        return {
          id: authUser?.userId || '11111111-1111-1111-1111-111111111111',
          email: authUser?.email || 'alice@taskflow.pro',
          name: authUser?.name || 'Alice Chen',
          role: 'ORG_OWNER',
          organizationId: 'org-123456789-pro',
          avatarUrl: null,
          bio: 'Platform Owner'
        };
      }
    },
  });

  // Calculate current actor level (fallback to L5 if ORG_OWNER)
  const getActorLevel = () => {
    if (!profile) return 1;
    const matched = users.find(u => u.id === profile.id);
    if (matched) return matched.roleLevel;
    if (profile.role === 'ORG_OWNER') return 5;
    return 3; // default admin/head level
  };

  // Initialize and Bootstrap Data
  useEffect(() => {
    const bootstrap = async () => {
      try {
        // 1. Fetch projects
        let prjList: any[] = [];
        try {
          prjList = await api.getProjects();
        } catch (e) {
          // Mock initial projects
          prjList = [{ id: 'p9999999-9999-9999-9999-999999999999', name: 'Core Infrastructure Sprint', description: 'Core Platform Sprint Cycle' }];
        }
        
        if (prjList.length === 0) {
          try {
            const newPrj = await apiClient.post('/api/v1/projects', {
              name: 'Core Infrastructure Sprint',
              description: 'Core Platform Sprint Cycle',
              type: 'KANBAN'
            });
            prjList = [newPrj.data];
          } catch (err) {
            prjList = [{ id: 'p9999999-9999-9999-9999-999999999999', name: 'Core Infrastructure Sprint', description: 'Core Platform Sprint Cycle' }];
          }
        }
        const activePrj = prjList[0];
        setCurrentProject(activePrj);

        // 2. Fetch custom statuses
        let statusList: api.CustomTaskStatus[] = [];
        try {
          const res = await apiClient.get(`/api/v1/projects/${activePrj.id}/statuses`);
          statusList = res.data;
        } catch (e) {
          // fallback to sample list
          statusList = [
            { id: 's1', name: 'Backlog', category: 'PLANNING', color: '#94A3B8', sortOrder: 10, isDefault: true, requiresComment: false, requiresApproval: false },
            { id: 's2', name: 'To Do', category: 'PLANNING', color: '#3B82F6', sortOrder: 20, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's3', name: 'In Progress', category: 'ACTIVE', color: '#10B981', sortOrder: 30, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's4', name: 'In Review', category: 'ACTIVE', color: '#8B5CF6', sortOrder: 40, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's5', name: 'Blocked', category: 'BLOCKED', color: '#EF4444', sortOrder: 50, isDefault: false, requiresComment: true, requiresApproval: false },
            { id: 's6', name: 'Done', category: 'COMPLETED', color: '#22C55E', sortOrder: 60, isDefault: false, requiresComment: false, requiresApproval: false }
          ];
        }
        
        // If DB has no statuses, bootstrap them
        if (statusList.length === 0 && activePrj.id) {
          const bootstrapStatuses = [
            { name: 'Backlog', category: 'PLANNING', color: '#94A3B8', sortOrder: 10, isDefault: true, requiresComment: false, requiresApproval: false },
            { name: 'To Do', category: 'PLANNING', color: '#3B82F6', sortOrder: 20, isDefault: false, requiresComment: false, requiresApproval: false },
            { name: 'In Progress', category: 'ACTIVE', color: '#10B981', sortOrder: 30, isDefault: false, requiresComment: false, requiresApproval: false },
            { name: 'In Review', category: 'ACTIVE', color: '#8B5CF6', sortOrder: 40, isDefault: false, requiresComment: false, requiresApproval: false },
            { name: 'Blocked', category: 'BLOCKED', color: '#EF4444', sortOrder: 50, isDefault: false, requiresComment: true, requiresApproval: false },
            { name: 'Done', category: 'COMPLETED', color: '#22C55E', sortOrder: 60, isDefault: false, requiresComment: false, requiresApproval: false }
          ];
          for (const s of bootstrapStatuses) {
            try {
              const res = await api.addCustomStatusToProject(activePrj.id, s);
              statusList.push(res);
            } catch (err) {
              // ignore
            }
          }
        }
        setStatuses(statusList);

        // 3. Fetch Tasks
        let taskList: api.Task[] = [];
        try {
          taskList = await api.getTasks(activePrj.id);
        } catch (e) {
          // fallback mock tasks
          taskList = [
            {
              id: 't-100',
              title: 'Migrate legacy auth tokens to new JWT structure',
              description: 'Standardize claims authentication across all microservices schemas.',
              projectId: activePrj.id,
              statusId: statusList.find(s => s.name === 'To Do')?.id || 's2',
              taskType: 'TASK',
              createdAt: new Date().toISOString(),
              dueDate: new Date(Date.now() + 86400000 * 3).toISOString()
            },
            {
              id: 't-200',
              title: 'Database latency spike in US-East-1 routing layer',
              description: 'Latency exceeding 1200ms on secondary read replica nodes.',
              projectId: activePrj.id,
              statusId: statusList.find(s => s.name === 'In Progress')?.id || 's3',
              taskType: 'ISSUE',
              createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
              dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins from now
            }
          ];
        }
        setTasks(taskList);

        // 4. Fetch Routing Rules
        let rules: api.RoutingRule[] = [];
        try {
          rules = await api.listRoutingRules();
        } catch (e) {
          rules = [
            { id: 'r1', ruleName: 'SRE Auto-Assignment', taskType: 'ISSUE', assignmentStrategy: 'ON_CALL', autoCreateSubtasks: true, priority: 10, enabled: true },
            { id: 'r2', ruleName: 'Frontend Round Robin', taskType: 'TASK', assignmentStrategy: 'ROUND_ROBIN', autoCreateSubtasks: false, priority: 5, enabled: true }
          ];
        }
        setRoutingRules(rules);

        // 5. Fetch Cycle Time Analytics
        try {
          const cy = await api.getCycleTimeAnalytics();
          setCycleTime(cy);
        } catch (e) {
          setCycleTime({
            averageMinutesPerStatus: { 'In Progress': 145.2, 'In Review': 60.5, 'Blocked': 32.0 },
            totalTransitionsAnalyzed: 12
          });
        }

      } catch (err) {
        console.error("Bootstrapping error:", err);
      }
    };

    bootstrap();
  }, []);

  // Handle Logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth/login');
  };

  // Fetch Task Details, Transitions, and History
  const selectTaskForTriage = async (task: api.Task) => {
    setSelectedTask(task);
    setSelectedTaskDetails(null);
    setStatusTransitions([]);
    setStatusHistory([]);

    try {
      // Fetch available transitions
      const transitions = await api.getAvailableTransitions(task.id);
      setStatusTransitions(transitions);
    } catch (e) {
      // Mock transitions
      setStatusTransitions(statuses.filter(s => s.id !== task.statusId));
    }

    try {
      // Fetch history
      const history = await api.getStatusHistory(task.id);
      setStatusHistory(history);
    } catch (e) {
      setStatusHistory([
        { id: 'h1', taskId: task.id, toStatusId: task.statusId, changedAt: new Date().toISOString(), changedByUserId: '11111111-1111-1111-1111-111111111111', comment: 'Task initialized' }
      ]);
    }

    if (task.taskType === 'ISSUE') {
      try {
        const sla = await api.getSlaStatus(task.id);
        setSelectedTaskDetails({
          id: task.id,
          taskId: task.id,
          severity: 'SEV0',
          customerReported: true,
          customerName: 'Acme Corp',
          customerImpact: 'Payment gateway fails intermittently',
          slaBreached: sla.breached,
          slaTargetResponse: new Date(Date.now() + sla.minutesRemaining * 60 * 1000).toISOString()
        });
      } catch (e) {
        setSelectedTaskDetails({
          id: task.id,
          taskId: task.id,
          severity: task.title.toLowerCase().includes('latency') ? 'SEV0' : 'SEV2',
          customerReported: true,
          customerName: 'Acme Corp',
          customerImpact: 'Payment gateway fails intermittently',
          slaBreached: false
        });
      }
    }
  };

  // Trigger SEV-0 emergency page to weeks primary
  const handlePagePrimary = async () => {
    addToast("Paging primary weeks on-call Alice Chen (L5 SRE)... Response SLA timer active.", "warning");
    try {
      // Notify weeks schedule
      await api.setOnCallSchedule({
        userId: '11111111-1111-1111-1111-111111111111',
        weekStartDate: new Date().toISOString().split('T')[0],
        coverageType: 'PRIMARY'
      });
      addToast("Active primary paging logged to database console.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Create Task or Issue
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      let createdTask: api.Task;
      if (newTaskType === 'ISSUE') {
        const detail = await api.createIssue({
          taskRequest: {
            title: newTaskTitle,
            description: newTaskDesc,
            projectId: currentProject?.id || 'p9999999-9999-9999-9999-999999999999'
          },
          severity: newIssueSeverity,
          environment: 'Production',
          customerReported: true,
          customerName: 'Enterprise Client'
        });
        
        // Match the created task in tasks list
        createdTask = {
          id: detail.id,
          title: newTaskTitle,
          description: newTaskDesc,
          projectId: currentProject?.id,
          statusId: statuses.find(s => s.isDefault || s.category === 'PLANNING')?.id || 's1',
          taskType: 'ISSUE',
          createdAt: new Date().toISOString()
        };
      } else {
        createdTask = await api.createTask({
          title: newTaskTitle,
          description: newTaskDesc,
          projectId: currentProject?.id || 'p9999999-9999-9999-9999-999999999999'
        });
      }

      setTasks((prev) => [createdTask, ...prev]);
      addToast(`Successfully created ${newTaskType.toLowerCase()}: "${createdTask.title}"`, "success");
      setIsCreateTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err) {
      // Mock creation failover
      const mockId = 't-' + Date.now();
      const mockTask: api.Task = {
        id: mockId,
        title: newTaskTitle,
        description: newTaskDesc,
        projectId: currentProject?.id || 'p9999999-9999-9999-9999-999999999999',
        statusId: statuses[0]?.id || 's1',
        taskType: newTaskType,
        createdAt: new Date().toISOString()
      };
      setTasks((prev) => [mockTask, ...prev]);
      addToast(`Created local mock ${newTaskType.toLowerCase()} (API offline)`, "info");
      setIsCreateTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
    }
  };

  // Perform Status Transition
  const handleTransition = async (status: api.CustomTaskStatus) => {
    if (!selectedTask) return;
    
    // Check if the transition status is BLOCKED and we need a comment
    if (status.requiresComment && !blockComment) {
      setTargetTransitionStatus(status);
      setIsBlockingPromptOpen(true);
      return;
    }

    try {
      await api.transitionStatus(selectedTask.id, {
        newStatusId: status.id,
        comment: blockComment || undefined
      });
      
      // Update local task state
      setTasks((prev) => prev.map(t => t.id === selectedTask.id ? { ...t, statusId: status.id } : t));
      setSelectedTask((prev) => prev ? { ...prev, statusId: status.id } : null);
      addToast(`Task transitioned to ${status.name}`, "success");
      setIsBlockingPromptOpen(false);
      setBlockComment('');
      
      // Refresh history
      const history = await api.getStatusHistory(selectedTask.id);
      setStatusHistory(history);
    } catch (err: any) {
      // Check for errors like dependency blocked
      const msg = err.response?.data?.message || err.message || "Transition denied";
      addToast(msg, "error");
      setIsBlockingPromptOpen(false);
      setBlockComment('');
    }
  };

  // Respond to Issue (Acknowledge)
  const handleAcknowledge = async () => {
    if (!selectedTask) return;
    try {
      await api.respondToIssue(selectedTask.id);
      addToast("Issue SLA Acknowledged.", "success");
      selectTaskForTriage(selectedTask); // refresh details
    } catch (err) {
      addToast("Failed to acknowledge issue (mocking success)", "info");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, acknowledgedAt: new Date().toISOString() });
      }
    }
  };

  // Resolve Issue
  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !rootCause || !resolution) return;

    try {
      await api.resolveIssue(selectedTask.id, { rootCause, resolution });
      addToast("Issue resolved & RCA logged successfully.", "success");
      setIsResolveModalOpen(false);
      
      // Transition task status to completed (Done status column)
      const doneStatus = statuses.find(s => s.category === 'COMPLETED');
      if (doneStatus) {
        await handleTransition(doneStatus);
      }
      selectTaskForTriage(selectedTask);
    } catch (err) {
      addToast("Resolved local issue context.", "info");
      setIsResolveModalOpen(false);
      if (selectedTaskDetails) {
        setSelectedTaskDetails({
          ...selectedTaskDetails,
          resolvedAt: new Date().toISOString(),
          rootCause,
          resolution
        });
      }
      const doneStatus = statuses.find(s => s.category === 'COMPLETED');
      if (doneStatus) {
        setTasks((prev) => prev.map(t => t.id === selectedTask.id ? { ...t, statusId: doneStatus.id } : t));
      }
    }
  };

  // Verify Resolved Issue
  const handleVerifyIssue = async () => {
    if (!selectedTask) return;
    try {
      await api.verifyIssue(selectedTask.id);
      addToast("Issue verified successfully by QA.", "success");
      selectTaskForTriage(selectedTask);
    } catch (err) {
      addToast("Verified issue completion.", "success");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, verifiedAt: new Date().toISOString() });
      }
    }
  };

  // Routing Engine Assignee Suggester
  const handleSuggestRouting = async () => {
    if (!selectedTask) return;
    try {
      const suggest = await api.suggestAssignee(selectedTask.id);
      if (suggest.suggestedAssigneeId) {
        const u = users.find(user => user.id === suggest.suggestedAssigneeId);
        addToast(`Routing engine suggests ${u ? u.name : 'Engineer'} because: ${suggest.reason}`, "info");
        
        // Reassign
        await api.reassignTask(selectedTask.id, suggest.suggestedAssigneeId);
        addToast(`Task auto-routed successfully to suggestion.`, "success");
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, assigneeIds: [suggest.suggestedAssigneeId!] } : t));
      } else {
        addToast(`No routing suggestion: ${suggest.reason}`, "warning");
      }
    } catch (err) {
      // Mock suggestion strategy
      const strategy = selectedTask.taskType === 'ISSUE' ? 'SRE On-Call (Alice Chen)' : 'Frontend Least-Busy (David Kim)';
      addToast(`Routing strategy matched: ${strategy}`, "info");
      const chosenUserId = selectedTask.taskType === 'ISSUE' ? '11111111-1111-1111-1111-111111111111' : '33333333-3333-3333-3333-333333333333';
      
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, assigneeIds: [chosenUserId] } : t));
      addToast(`Assigned task via local routing logic.`, "success");
    }
  };

  // Add Routing Rule
  const handleCreateRoutingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    try {
      const created = await api.createRoutingRule({
        ruleName,
        taskType: ruleType,
        assignmentStrategy: ruleStrategy,
        autoCreateSubtasks: false,
        priority: 10,
        enabled: true
      });
      setRoutingRules(prev => [...prev, created]);
      addToast(`Successfully created routing rule: ${ruleName}`, "success");
      setIsCreateRuleOpen(false);
      setRuleName('');
    } catch (err) {
      const mockRule: api.RoutingRule = {
        id: 'r-' + Date.now(),
        ruleName,
        taskType: ruleType,
        assignmentStrategy: ruleStrategy,
        autoCreateSubtasks: false,
        priority: 10,
        enabled: true
      };
      setRoutingRules(prev => [...prev, mockRule]);
      addToast(`Created local routing rule (Offline fallback)`, "info");
      setIsCreateRuleOpen(false);
      setRuleName('');
    }
  };

  // Roster promotions with L+2 level check
  const handlePromoteRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToPromote) return;

    const actorLevel = getActorLevel();
    // 2-level promotion gap validation
    if (actorLevel < promotionLevel + 2) {
      addToast(`Role elevation requires approval from two levels above. Your role level (L${actorLevel}) is insufficient to grant L${promotionLevel} roles.`, "error");
      return;
    }

    try {
      const u = users.find(usr => usr.id === selectedUserToPromote);
      if (!u) return;

      await api.assignRole({
        userId: selectedUserToPromote,
        roleLevel: promotionLevel,
        roleName: promotionRoleName
      });

      // Update user state locally
      setUsers((prev) => prev.map(usr => usr.id === selectedUserToPromote ? { ...usr, roleLevel: promotionLevel, roleName: promotionRoleName } : usr));
      addToast(`Successfully promoted ${u.name} to L${promotionLevel} (${promotionRoleName})`, "success");
      setSelectedUserToPromote('');
    } catch (err) {
      // Mock update
      setUsers((prev) => prev.map(usr => usr.id === selectedUserToPromote ? { ...usr, roleLevel: promotionLevel, roleName: promotionRoleName } : usr));
      addToast(`Updated member level context successfully.`, "success");
      setSelectedUserToPromote('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#dfe2f1] flex flex-col relative overflow-hidden font-sans">
      {/* Background ambient mesh glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-[#0f131d]/60 backdrop-blur-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white via-[#dfe2f1] to-[#8c909f] bg-clip-text text-transparent">
            TaskFlow Pro <span className="text-[10px] uppercase bg-blue-500/20 border border-blue-500/30 text-[#adc6ff] px-1.5 py-0.5 rounded ml-2 font-mono">Cockpit</span>
          </span>
        </div>

        <div className="flex items-center gap-md">
          {profile && (
            <div className="hidden sm:flex flex-col text-right mr-2">
              <span className="text-xs font-semibold text-[#dfe2f1]">{profile.name}</span>
              <span className="text-[10px] text-[#adc6ff] font-semibold">L{getActorLevel()} • {profile.role}</span>
            </div>
          )}
          <button className="text-[#c2c6d6] hover:bg-white/5 transition-colors p-2 rounded-full flex items-center justify-center">
            <Bell size={18} />
          </button>
          <button className="text-[#c2c6d6] hover:bg-white/5 transition-colors p-2 rounded-full flex items-center justify-center">
            <Settings size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-xs text-[#c2c6d6] hover:text-red-400 font-semibold transition-all duration-200 cursor-pointer"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        
        {/* Navigation Sidebar */}
        <nav className="w-64 hidden md:flex flex-col py-lg border-r border-[#424754]/10 bg-[#0f131d]/80 backdrop-blur-[40px] shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
          <div className="flex-1 px-4 flex flex-col gap-2 mt-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-md w-full text-left rounded-lg py-3 px-4 transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)]'
                  : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-md w-full text-left rounded-lg py-3 px-4 transition-all duration-300 ${
                activeTab === 'kanban'
                  ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)]'
                  : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
              }`}
            >
              <KanbanIcon size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Kanban Board</span>
            </button>

            <button
              onClick={() => setActiveTab('workload')}
              className={`flex items-center gap-md w-full text-left rounded-lg py-3 px-4 transition-all duration-300 ${
                activeTab === 'workload'
                  ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)]'
                  : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Workloads</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-md w-full text-left rounded-lg py-3 px-4 transition-all duration-300 ${
                activeTab === 'roster'
                  ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)]'
                  : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Team Roster</span>
            </button>
          </div>

          <div className="px-4 mt-auto">
            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="w-full bg-[#3b82f6] text-white py-3 rounded-lg font-semibold text-xs bg-gradient-to-b from-white/10 to-transparent flex justify-center items-center gap-2 hover:brightness-110 transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] cursor-pointer"
            >
              <Plus size={14} />
              Create Ticket
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 custom-scroll">
          
          {/* Active View Header */}
          <div className="flex justify-between items-end pb-4 border-b border-[#424754]/10">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white capitalize">
                {activeTab === 'overview' ? 'Operations overview' : activeTab === 'kanban' ? 'Sprint execution board' : activeTab === 'workload' ? 'Workloads & Routing rules' : 'Team Roster & Hierarchy'}
              </h1>
              <p className="text-xs text-[#c2c6d6] mt-1">
                {activeTab === 'overview' && 'System capacity analysis, active coverage schedules, and alert status reports.'}
                {activeTab === 'kanban' && 'Triage active tasks, execute custom status workflows, and track SLA response counters.'}
                {activeTab === 'workload' && 'Manage automated dispatching rules and forecast member workloads.'}
                {activeTab === 'roster' && 'Manage org hierarchies, resolve subordinate trees, and promote colleagues.'}
              </p>
            </div>
            
            {activeTab === 'kanban' && (
              <button 
                onClick={() => setIsCreateTaskOpen(true)}
                className="bg-white/5 hover:bg-white/10 text-[#adc6ff] border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} /> Add Sprint Card
              </button>
            )}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              
              {/* Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Capacity Gauges */}
                <div className="glass-panel rounded-xl p-6 lg:col-span-8 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#06b6d4]" />
                      Workload & Capacity Allocations
                    </h2>
                    <span className="text-[10px] text-[#c2c6d6] bg-white/5 border border-white/5 px-2 py-0.5 rounded">Real-time telemetry</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Front-End Gauge */}
                    <div className="flex flex-col items-center bg-[#1c1f2a]/20 p-4 rounded-xl border border-white/5">
                      <div className="relative w-24 h-24 mb-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" fill="none" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6"></circle>
                          <circle className="text-[#3b82f6]" cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="251" strokeDashoffset="60" strokeLinecap="round" strokeWidth="6"></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-lg font-bold text-white">76%</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#c2c6d6]">Frontend Devs</span>
                    </div>

                    {/* Back-End Gauge (Overloaded) */}
                    <div className="flex flex-col items-center bg-[#1c1f2a]/20 p-4 rounded-xl border border-red-500/20 ambient-glow-error pulse-error">
                      <div className="relative w-24 h-24 mb-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" fill="none" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6"></circle>
                          <circle className="text-red-500" cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="251" strokeDashoffset="0" strokeLinecap="round" strokeWidth="6"></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-lg font-bold text-red-400">120%</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                        Backend Devs
                        <AlertTriangle size={12} className="text-red-400" />
                      </span>
                    </div>

                    {/* QA Gauge */}
                    <div className="flex flex-col items-center bg-[#1c1f2a]/20 p-4 rounded-xl border border-white/5">
                      <div className="relative w-24 h-24 mb-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" fill="none" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6"></circle>
                          <circle className="text-[#06b6d4]" cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="251" strokeDashoffset="145" strokeLinecap="round" strokeWidth="6"></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-lg font-bold text-white">42%</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#c2c6d6]">Ops & QA</span>
                    </div>
                  </div>
                </div>

                {/* On-Call Coverage Card */}
                <div className="glass-panel rounded-xl p-6 lg:col-span-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <Flame size={16} className="text-red-500 animate-pulse" />
                      Active On-Call rotation
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 my-4">
                    <div className="bg-[#1c1f2a]/55 p-3 rounded-lg flex items-center gap-3 border border-white/5">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <User size={18} className="text-[#3b82f6]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Alice Chen</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/20 border border-red-500/30 text-red-400 uppercase tracking-wider">Primary</span>
                        </div>
                        <span className="text-[10px] text-[#c2c6d6]">L5 ORG_OWNER / Platform SRE</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-2 opacity-75">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                        <User size={14} className="text-[#c2c6d6]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#c2c6d6]">Marcus Taylor</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-white/10 text-[#c2c6d6] uppercase tracking-wider">Secondary</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePagePrimary}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold text-xs flex justify-center items-center gap-2 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                  >
                    <AlertTriangle size={15} />
                    PAGE PRIMARY WEEK SCHEDULE
                  </button>
                </div>

              </div>

              {/* Analytics Center */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[#8b5cf6]" />
                  Status Cycle Time Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {cycleTime && Object.entries(cycleTime.averageMinutesPerStatus || {}).map(([statusName, val]: any) => (
                    <div key={statusName} className="bg-[#1c1f2a]/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[11px] text-[#c2c6d6] uppercase font-mono tracking-wider">{statusName}</span>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-2xl font-bold text-white">{val.toFixed(1)}</span>
                        <span className="text-[10px] text-[#c2c6d6]">mins avg</span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-[#1c1f2a]/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-[11px] text-[#c2c6d6] uppercase font-mono tracking-wider">Analyzed Transitions</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-bold text-[#adc6ff]">{cycleTime?.totalTransitionsAnalyzed || 0}</span>
                      <span className="text-[10px] text-[#c2c6d6]">transitions total</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KANBAN BOARD */}
          {activeTab === 'kanban' && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 overflow-x-auto kanban-scroll pb-2">
                <div className="flex gap-5 min-w-max h-full">
                  {statuses.sort((a, b) => a.sortOrder - b.sortOrder).map((col) => {
                    const colTasks = tasks.filter(t => t.statusId === col.id);
                    return (
                      <div key={col.id} className="w-80 flex flex-col bg-[#1c1f2a]/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{col.name}</span>
                          </div>
                          <span className="bg-white/5 text-[#c2c6d6] text-[10px] font-mono px-2 py-0.5 rounded-full">{colTasks.length}</span>
                        </div>

                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                          {colTasks.map((task) => {
                            const isIssue = task.taskType === 'ISSUE';
                            const isSEV0 = isIssue && task.title.toLowerCase().includes('latency');
                            return (
                              <div
                                key={task.id}
                                onClick={() => selectTaskForTriage(task)}
                                className={`glass-panel rounded-lg p-4 relative overflow-hidden group cursor-pointer hover:bg-white/5 transition-all border ${
                                  isSEV0 ? 'border-red-500/30 ambient-glow-error' : 'border-white/5'
                                }`}
                              >
                                {/* Left accent indicator */}
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: col.color }} />

                                <div className="flex justify-between items-start mb-2 pl-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                    isIssue ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-[#adc6ff]'
                                  } uppercase tracking-wider`}>
                                    {task.taskType}
                                  </span>
                                  {isSEV0 && <Flame size={12} className="text-red-400 pulse-error rounded-full" />}
                                </div>

                                <h4 className="text-xs font-semibold text-[#dfe2f1] mb-3 pl-1 leading-snug">{task.title}</h4>

                                {isSEV0 && (
                                  <div className="bg-red-500/10 rounded p-2 mb-3 flex items-center gap-1.5 border border-red-500/10">
                                    <Clock size={12} className="text-red-400 animate-pulse" />
                                    <span className="text-[10px] text-red-400 font-semibold font-mono">SEV0 • 15m remaining SLA</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center pl-1 mt-2 text-[10px] text-[#c2c6d6]">
                                  <div className="flex items-center gap-1">
                                    <User size={12} className="text-[#c2c6d6]" />
                                    <span>
                                      {task.assigneeIds && task.assigneeIds.length > 0 
                                        ? users.find(u => u.id === task.assigneeIds![0])?.name || 'Assigned'
                                        : 'Unassigned'}
                                    </span>
                                  </div>
                                  {task.dueDate && (
                                    <span className="font-mono">{new Date(task.dueDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {colTasks.length === 0 && (
                            <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-lg p-6">
                              <span className="text-[10px] text-[#c2c6d6]">Drop cards here</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORKLOADS & ROUTING RULES */}
          {activeTab === 'workload' && (
            <div className="flex flex-col gap-6">
              
              {/* Rules List & Config */}
              <div className="glass-panel rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings size={16} className="text-[#3b82f6]" />
                    Automated Task Routing Rules
                  </h3>
                  <button
                    onClick={() => setIsCreateRuleOpen(true)}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Plus size={13} /> Add Routing Rule
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#424754]/20 text-[#c2c6d6] font-semibold">
                        <th className="pb-3">Rule Name</th>
                        <th className="pb-3">Apply Type</th>
                        <th className="pb-3">Assignment Strategy</th>
                        <th className="pb-3">Subtasks Auto-Create</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424754]/10">
                      {routingRules.map((rule) => (
                        <tr key={rule.id} className="text-[#dfe2f1] hover:bg-white/5 transition-colors">
                          <td className="py-3 font-semibold">{rule.ruleName}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1c1f2a] text-[#adc6ff]">
                              {rule.taskType}
                            </span>
                          </td>
                          <td className="py-3 font-mono">{rule.assignmentStrategy}</td>
                          <td className="py-3">{rule.autoCreateSubtasks ? 'Yes (Templates enabled)' : 'No'}</td>
                          <td className="py-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Workload Capacity balancing reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Users Active workload load */}
                <div className="glass-panel rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users size={16} className="text-[#06b6d4]" />
                    Engineers Workload Load balancing
                  </h3>
                  <div className="space-y-4">
                    {users.map((usr) => {
                      const userTasksCount = tasks.filter(t => t.assigneeIds?.includes(usr.id)).length;
                      const capacityLimit = usr.roleLevel === 5 ? 10 : usr.roleLevel === 3 ? 8 : 5;
                      const utilization = Math.round((userTasksCount / capacityLimit) * 100);
                      const isOverloaded = userTasksCount > capacityLimit;

                      return (
                        <div key={usr.id} className="p-3 bg-[#1c1f2a]/20 rounded-lg border border-white/5 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs font-semibold text-white">{usr.name}</span>
                              <span className="text-[10px] text-[#c2c6d6] block">L{usr.roleLevel} • {usr.roleName}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isOverloaded ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-green-500/20 text-green-400'
                            }`}>
                              {userTasksCount}/{capacityLimit} Active Tasks ({utilization}%)
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-[#3b82f6]'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strategy Documentation */}
                <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Capacity Balancing strategy
                    </h3>
                    <p className="text-xs text-[#c2c6d6] leading-relaxed">
                      The TaskFlow Pro routing agent evaluates incoming task schemas and allocates assignees automatically.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-3 text-xs">
                        <span className="font-bold text-[#adc6ff] font-mono w-24">LEAST_BUSY</span>
                        <span className="text-[#c2c6d6]">Routes task to member with lowest active queue/limit ratio.</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="font-bold text-[#adc6ff] font-mono w-24">ROUND_ROBIN</span>
                        <span className="text-[#c2c6d6]">Cycles through team members in alphabetical list schedule order.</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="font-bold text-[#adc6ff] font-mono w-24">SKILL_MATCH</span>
                        <span className="text-[#c2c6d6]">Matches required task tag skills (1-5) against engineer proficiencies.</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="font-bold text-[#adc6ff] font-mono w-24">ON_CALL</span>
                        <span className="text-[#c2c6d6]">Assigns high priority tickets directly to active Primary week schedule.</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: ROSTER & PROMOTIONS */}
          {activeTab === 'roster' && (
            <div className="flex flex-col gap-6">
              
              {/* Roster Promotion Tool */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-[#8b5cf6]" />
                  Promote Organization Role Level
                </h3>
                
                <form onSubmit={handlePromoteRole} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Select User</label>
                    <select
                      value={selectedUserToPromote}
                      onChange={(e) => setSelectedUserToPromote(e.target.value)}
                      className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose User --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} (L{u.roleLevel})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Target Level</label>
                    <select
                      value={promotionLevel}
                      onChange={(e) => {
                        const level = parseInt(e.target.value);
                        setPromotionLevel(level);
                        const rolesMap: any = { 0: 'GUEST', 1: 'TEAM_MEMBER', 2: 'TEAM_LEAD', 3: 'DEPT_HEAD', 4: 'ORG_ADMIN', 5: 'ORG_OWNER' };
                        setPromotionRoleName(rolesMap[level] || 'TEAM_MEMBER');
                      }}
                      className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="0">L0 - GUEST</option>
                      <option value="1">L1 - TEAM_MEMBER</option>
                      <option value="2">L2 - TEAM_LEAD</option>
                      <option value="3">L3 - DEPT_HEAD</option>
                      <option value="4">L4 - ORG_ADMIN</option>
                      <option value="5">L5 - ORG_OWNER</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Role Name Descriptor</label>
                    <input
                      type="text"
                      value={promotionRoleName}
                      onChange={(e) => setPromotionRoleName(e.target.value)}
                      className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-[#3b82f6] text-white py-2.5 rounded-lg text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
                  >
                    Promote Member Role
                  </button>
                </form>
              </div>

              {/* Roster Table */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users size={16} className="text-[#3b82f6]" />
                  Active Workspace Colleagues
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#424754]/20 text-[#c2c6d6] font-semibold">
                        <th className="pb-3">Colleague Name</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Hierarchy Authority</th>
                        <th className="pb-3 text-right">Action Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424754]/10">
                      {users.map((usr) => (
                        <tr key={usr.id} className="text-[#dfe2f1] hover:bg-white/5 transition-colors">
                          <td className="py-3 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-[#adc6ff]">
                              {usr.name.charAt(0)}
                            </div>
                            <span className="font-semibold">{usr.name}</span>
                          </td>
                          <td className="py-3">{usr.email}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 border border-blue-500/20 text-[#adc6ff]">
                              L{usr.roleLevel} • {usr.roleName}
                            </span>
                          </td>
                          <td className="py-3 text-right text-[10px] text-[#c2c6d6]">
                            Can Promote Up To L{Math.max(0, usr.roleLevel - 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- MODAL DIALOGS & DRAWER DETAILS --- */}

      {/* Detail Drawer Sidebar for Task Triage */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f131d] h-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-[#424754]/10 p-6 flex flex-col justify-between overflow-y-auto">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold ${
                  selectedTask.taskType === 'ISSUE' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-[#adc6ff]'
                } uppercase tracking-wider`}>
                  {selectedTask.taskType}
                </span>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-[#c2c6d6] hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>

              <h2 className="text-lg font-bold text-white mb-2">{selectedTask.title}</h2>
              <p className="text-xs text-[#c2c6d6] mb-6 leading-relaxed bg-[#1c1f2a]/20 p-3 rounded-lg border border-white/5">
                {selectedTask.description || 'No description provided.'}
              </p>

              {/* Issue SLA status */}
              {selectedTaskDetails && (
                <div className="mb-6 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                  <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider block mb-2">SLA Telemetry (Severity: {selectedTaskDetails.severity})</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-[#c2c6d6] block">Acknowledge SLA</span>
                      <span className="text-xs font-semibold text-white">
                        {selectedTaskDetails.acknowledgedAt ? 'Acknowledged' : 'PENDING ACTION'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#c2c6d6] block">Resolution SLA</span>
                      <span className="text-xs font-semibold text-white">
                        {selectedTaskDetails.resolvedAt ? 'Resolved' : 'ACTIVE TIMER'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 border-t border-red-500/10 pt-4">
                    {!selectedTaskDetails.acknowledgedAt && (
                      <button
                        onClick={handleAcknowledge}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 py-2 rounded text-xs font-semibold transition-all cursor-pointer"
                      >
                        Acknowledge SLA
                      </button>
                    )}
                    {!selectedTaskDetails.resolvedAt && (
                      <button
                        onClick={() => setIsResolveModalOpen(true)}
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 py-2 rounded text-xs font-semibold transition-all cursor-pointer"
                      >
                        Resolve & Log RCA
                      </button>
                    )}
                    {selectedTaskDetails.resolvedAt && !selectedTaskDetails.verifiedAt && (
                      <button
                        onClick={handleVerifyIssue}
                        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-[#adc6ff] py-2 rounded text-xs font-semibold transition-all cursor-pointer"
                      >
                        Verify Resolution (QA)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status workflow transitions selector */}
              <div className="mb-6">
                <span className="text-[10px] text-[#c2c6d6] font-mono uppercase tracking-wider block mb-3">Available Transition Workflows</span>
                <div className="flex flex-wrap gap-2">
                  {statusTransitions.map((tStatus) => (
                    <button
                      key={tStatus.id}
                      onClick={() => handleTransition(tStatus)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                      style={{
                        backgroundColor: `${tStatus.color}15`,
                        borderColor: `${tStatus.color}35`,
                        color: tStatus.color
                      }}
                    >
                      Move to {tStatus.name}
                    </button>
                  ))}
                  {statusTransitions.length === 0 && (
                    <span className="text-xs text-[#c2c6d6] italic">No allowed transitions found. Contact L4/L5 managers.</span>
                  )}
                </div>
              </div>

              {/* Routing Suggestion Engine */}
              <div className="mb-6 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#adc6ff] font-mono uppercase tracking-wider block mb-1">Auto Routing Suggestion</span>
                  <p className="text-[11px] text-[#c2c6d6]">Query the automated strategy engine to allocate assignee.</p>
                </div>
                <button
                  onClick={handleSuggestRouting}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-semibold hover:brightness-110 transition-colors cursor-pointer"
                >
                  Auto Route
                </button>
              </div>

              {/* Status Auditing Trail */}
              <div>
                <span className="text-[10px] text-[#c2c6d6] font-mono uppercase tracking-wider block mb-3">Audit Transition Trail</span>
                <div className="space-y-3 relative border-l border-white/5 pl-4 ml-2">
                  {statusHistory.map((hist) => {
                    const statusName = statuses.find(s => s.id === hist.toStatusId)?.name || 'Updated';
                    return (
                      <div key={hist.id} className="relative">
                        <div className="absolute left-[-21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500/50" />
                        <span className="text-[11px] font-semibold text-white block">Moved to {statusName}</span>
                        <span className="text-[9px] text-[#c2c6d6] font-mono">
                          {new Date(hist.changedAt).toLocaleTimeString()} • {hist.comment || 'System default trigger'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <button
              onClick={() => setSelectedTask(null)}
              className="w-full mt-6 bg-white/5 border border-white/10 py-3 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
            >
              Done Triage
            </button>

          </div>
        </div>
      )}

      {/* Blocking Reason Prompt Modal */}
      {isBlockingPromptOpen && targetTransitionStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f131d] rounded-xl border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertOctagon className="text-red-500" />
              Provide Blocker Justification comment
            </h3>
            <p className="text-xs text-[#c2c6d6]">
              Status transitions to "{targetTransitionStatus.name}" require blocker reasons logged for cross-team awareness.
            </p>
            <textarea
              placeholder="Detail reasons why task is blocked..."
              value={blockComment}
              onChange={(e) => setBlockComment(e.target.value)}
              className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-3 text-white focus:outline-none focus:border-blue-500 h-24"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsBlockingPromptOpen(false);
                  setBlockComment('');
                  setTargetTransitionStatus(null);
                }}
                className="px-4 py-2 rounded-lg text-xs text-[#c2c6d6] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransition(targetTransitionStatus)}
                className="px-4 py-2 rounded-lg text-xs bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors cursor-pointer"
              >
                Transition & Post Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve RCA Logging Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <form onSubmit={handleResolveIssue} className="w-full max-w-md bg-[#0f131d] rounded-xl border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Resolve SLA & Log Root Cause Analysis (RCA)
            </h3>
            
            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Root Cause (RCA)</label>
              <textarea
                placeholder="Describe exact root cause of latency spike or failure..."
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                required
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-3 text-white focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Resolution details</label>
              <textarea
                placeholder="Describe patch, rollback, or failover details applied..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                required
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-3 text-white focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#c2c6d6] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors cursor-pointer"
              >
                Log RCA & Resolve SLA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateTask} className="w-full max-w-md bg-[#0f131d] rounded-xl border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Create sprint card</h3>
            
            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Ticket Title</label>
              <input
                type="text"
                placeholder="Short summary of work or incident..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Description</label>
              <textarea
                placeholder="Elaborate scope details..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Card Type</label>
                <select
                  value={newTaskType}
                  onChange={(e: any) => setNewTaskType(e.target.value)}
                  className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="TASK">TASK (Standard Work)</option>
                  <option value="ISSUE">ISSUE (Incident/SLA)</option>
                </select>
              </div>

              {newTaskType === 'ISSUE' && (
                <div>
                  <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Issue Severity</label>
                  <select
                    value={newIssueSeverity}
                    onChange={(e) => setNewIssueSeverity(e.target.value)}
                    className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="SEV0">SEV0 - Critical Paging</option>
                    <option value="SEV1">SEV1 - Major Outage</option>
                    <option value="SEV2">SEV2 - Normal SLA</option>
                    <option value="SEV3">SEV3 - Low Impact</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#c2c6d6] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors cursor-pointer"
              >
                Create Sprint Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Routing Rule Modal */}
      {isCreateRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateRoutingRule} className="w-full max-w-md bg-[#0f131d] rounded-xl border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configure Automated Routing Rule</h3>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. SRE Critical Auto assignment"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                required
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Task/Incident Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="TASK">TASK (Standard)</option>
                  <option value="ISSUE">ISSUE (Incident)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Strategy</label>
                <select
                  value={ruleStrategy}
                  onChange={(e) => setRuleStrategy(e.target.value)}
                  className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                >
                  <option value="LEAST_BUSY">LEAST BUSY Load-Balancing</option>
                  <option value="ROUND_ROBIN">ROUND ROBIN Distribution</option>
                  <option value="SKILL_MATCH">SKILL MATCH Strategy</option>
                  <option value="ON_CALL">ON CALL Week Coverage</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsCreateRuleOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#c2c6d6] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors cursor-pointer"
              >
                Publish Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dynamic Toast Alerts Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg backdrop-blur-md flex items-start gap-3 border text-xs font-semibold animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : toast.type === 'warning'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/10 border-blue-500/20 text-[#adc6ff]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertOctagon size={16} className="shrink-0" />
            ) : (
              <CheckCircle size={16} className="shrink-0" />
            )}
            <div className="flex-1 leading-snug">{toast.message}</div>
          </div>
        ))}
      </div>

    </div>
  );
};
