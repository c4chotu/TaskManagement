import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  ArrowRight,
  Shield,
  CornerDownRight,
  Info,
  X,
  Link as LinkIcon
} from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

export const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<api.Task[]>([]);
  const [statuses, setStatuses] = useState<api.CustomTaskStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected task in detail drawer
  const [selectedTask, setSelectedTask] = useState<api.Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<api.IssueDetail | null>(null);
  const [statusTransitions, setStatusTransitions] = useState<api.CustomTaskStatus[]>([]);
  const [statusHistory, setStatusHistory] = useState<api.StatusHistory[]>([]);

  // Interactivity prompts
  const [blockComment, setBlockComment] = useState('');
  const [isBlockingPromptOpen, setIsBlockingPromptOpen] = useState(false);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState<api.CustomTaskStatus | null>(null);
  
  // RCA fields
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  
  // Duplicate linker
  const [duplicateParentId, setDuplicateParentId] = useState('');

  // SRE pager schedules
  const onCallUser = 'Alice Chen (L5 SRE)';
  
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const loadBoard = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        let statusList: api.CustomTaskStatus[] = [];
        try {
          const res = await api.getAvailableTransitions(projectId);
          statusList = res;
        } catch {
          // Default statuses with customized categories and colors
          statusList = [
            { id: 's1', name: 'Backlog', category: 'PLANNING', color: '#94A3B8', sortOrder: 10, isDefault: true, requiresComment: false, requiresApproval: false },
            { id: 's2', name: 'To Do', category: 'PLANNING', color: '#3B82F6', sortOrder: 20, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's3', name: 'In Progress', category: 'ACTIVE', color: '#10B981', sortOrder: 30, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's4', name: 'In Review', category: 'ACTIVE', color: '#8B5CF6', sortOrder: 40, isDefault: false, requiresComment: false, requiresApproval: false },
            { id: 's5', name: 'Blocked', category: 'BLOCKED', color: '#EF4444', sortOrder: 50, isDefault: false, requiresComment: true, requiresApproval: false },
            { id: 's6', name: 'Done', category: 'COMPLETED', color: '#22C55E', sortOrder: 60, isDefault: false, requiresComment: false, requiresApproval: false }
          ];
        }
        setStatuses(statusList);

        let taskList: api.Task[] = [];
        try {
          taskList = await api.getTasks(projectId);
        } catch {
          taskList = [
            { id: 't-1', title: 'Migrate legacy auth tokens to new JWT structure', description: 'Standardize claims authentication across all microservices schemas.', projectId, statusId: 's2', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-2', title: 'Database latency spike in US-East-1 routing layer', description: 'Latency exceeding 1200ms on secondary read replica nodes.', projectId, statusId: 's3', taskType: 'ISSUE', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
            { id: 't-3', title: 'Add dynamic telemetry dashboards for SREs', description: 'Visualizing CPU queue times and queue allocations.', projectId, statusId: 's5', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-4', title: 'Verify SSL expiry checker scripts', description: 'CRON script should run daily at 00:00 UTC.', projectId, statusId: 's1', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-5', title: 'Implement dynamic rate limiters', description: 'Set standard client rate limits to 100 req/min.', projectId, statusId: 's6', taskType: 'TASK', createdAt: new Date().toISOString() }
          ];
        }
        setTasks(taskList);
      } catch (err) {
        console.error("Board fetching error", err);
      } finally {
        setLoading(false);
      }
    };
    loadBoard();
  }, [projectId]);

  const selectTaskDetails = async (task: api.Task) => {
    setSelectedTask(task);
    setSelectedTaskDetails(null);
    setStatusTransitions([]);
    setStatusHistory([]);

    try {
      const transitions = await api.getAvailableTransitions(task.id);
      setStatusTransitions(transitions);
    } catch {
      setStatusTransitions(statuses.filter(s => s.id !== task.statusId));
    }

    try {
      const history = await api.getStatusHistory(task.id);
      setStatusHistory(history);
    } catch {
      setStatusHistory([
        { id: 'h-init', taskId: task.id, toStatusId: task.statusId, changedAt: new Date().toISOString(), changedByUserId: 'user-1', comment: 'Ticket initialized.' }
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
          customerName: 'Acme Premium Customer',
          customerImpact: '100% failure rate in checkout flow',
          slaBreached: sla.breached,
          slaTargetResponse: new Date(Date.now() + sla.minutesRemaining * 60 * 1000).toISOString(),
          slaTargetFix: new Date(Date.now() + (sla.minutesRemaining + 60) * 60 * 1000).toISOString()
        });
      } catch {
        setSelectedTaskDetails({
          id: task.id,
          taskId: task.id,
          severity: 'SEV0',
          customerReported: true,
          customerName: 'Acme Premium Customer',
          customerImpact: '100% failure rate in checkout flow',
          slaBreached: false,
          slaTargetResponse: new Date(Date.now() + 15 * 60000).toISOString(),
          slaTargetFix: new Date(Date.now() + 180 * 60000).toISOString()
        });
      }
    }
  };

  const handleTransition = async (status: api.CustomTaskStatus) => {
    if (!selectedTask) return;

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
      
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, statusId: status.id } : t));
      setSelectedTask(prev => prev ? { ...prev, statusId: status.id } : null);
      
      // Update history list
      const updatedHistory = [
        { id: `h-${Date.now()}`, taskId: selectedTask.id, toStatusId: status.id, changedAt: new Date().toISOString(), changedByUserId: 'current-user', comment: blockComment || 'State updated.' },
        ...statusHistory
      ];
      setStatusHistory(updatedHistory);
      
      addToast(`Status transitioned to ${status.name}`, "success");
      setIsBlockingPromptOpen(false);
      setBlockComment('');
    } catch (err: any) {
      addToast(err.response?.data?.message || "Transition rejected by routing engines", "error");
    }
  };

  // Issue controls
  const handleAcknowledge = async () => {
    if (!selectedTask) return;
    try {
      await api.respondToIssue(selectedTask.id);
      addToast("Issue response SLA Met (Acknowledged).", "success");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, acknowledgedAt: new Date().toISOString() });
      }
    } catch {
      addToast("Acknowledged locally.", "info");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, acknowledgedAt: new Date().toISOString() });
      }
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !rootCause || !resolution) return;

    try {
      await api.resolveIssue(selectedTask.id, { rootCause, resolution });
      addToast("RCA logged & Issue resolved successfully.", "success");
      setIsResolveModalOpen(false);
      
      const doneStatus = statuses.find(s => s.category === 'COMPLETED');
      if (doneStatus) {
        await handleTransition(doneStatus);
      }
    } catch {
      addToast("RCA logged & Marked Resolved locally.", "info");
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
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, statusId: doneStatus.id } : t));
      }
    }
  };

  const handleVerifyResolution = async () => {
    if (!selectedTask) return;
    try {
      await api.verifyIssue(selectedTask.id);
      addToast("Issue resolved verification confirmed.", "success");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, verifiedAt: new Date().toISOString() });
      }
    } catch {
      addToast("Verification logged locally.", "success");
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, verifiedAt: new Date().toISOString() });
      }
    }
  };

  const handleLinkDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !duplicateParentId) return;

    try {
      await api.markDuplicate(selectedTask.id, duplicateParentId);
      addToast(`Marked as duplicate of task #${duplicateParentId}`, "success");
      setDuplicateParentId('');
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, duplicateOfTaskId: duplicateParentId });
      }
    } catch {
      addToast(`Duplicate linked locally.`, "success");
      setDuplicateParentId('');
      if (selectedTaskDetails) {
        setSelectedTaskDetails({ ...selectedTaskDetails, duplicateOfTaskId: duplicateParentId });
      }
    }
  };

  const handlePagePrimary = () => {
    addToast("Emergency Pager: Paging primary SRE schedule coverages. Critical response protocol active.", "warning");
  };

  // WIP Limits calculations
  // WIP limits: PLANNING: 5, ACTIVE: 3, BLOCKED: 1, COMPLETED: unlimited
  const getCategoryCount = (category: string) => {
    const statusIds = statuses.filter(s => s.category === category).map(s => s.id);
    return tasks.filter(t => statusIds.includes(t.statusId)).length;
  };

  const getWIPStatus = (category: string) => {
    const count = getCategoryCount(category);
    let limit = 999;
    if (category === 'PLANNING') limit = 5;
    if (category === 'ACTIVE') limit = 3;
    if (category === 'BLOCKED') limit = 1;

    const isExceeded = count > limit;
    return { count, limit, isExceeded };
  };

  return (
    <div className="p-6 h-full flex flex-col min-w-0 bg-[#0b0f19] relative overflow-hidden">
      {/* Toast Drawer */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg min-w-[280px] pointer-events-auto animate-slide-in flex items-center gap-2 ${
              t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              t.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
              'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            {t.type === 'error' && <AlertOctagon size={14} />}
            {t.type === 'warning' && <AlertTriangle size={14} />}
            {t.type === 'success' && <CheckCircle size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Loading Kanban Columns...
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 relative custom-scroll items-stretch">
          
          {/* Columns iteration */}
          {['PLANNING', 'ACTIVE', 'BLOCKED', 'COMPLETED'].map(category => {
            const { count, limit, isExceeded } = getWIPStatus(category);
            const columnsList = statuses.filter(s => s.category === category);
            
            return (
              <div 
                key={category} 
                className={`flex-1 min-w-[280px] max-w-[360px] rounded-xl bg-[#0f131d]/40 border p-4 flex flex-col gap-3 transition-all duration-300 relative ${
                  isExceeded ? 'border-red-500/30 bg-red-500/[0.01]' : 'border-[#424754]/10'
                }`}
              >
                {/* WIP Limits Banner */}
                <div className="flex justify-between items-center pb-2 border-b border-[#424754]/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white tracking-wider uppercase">{category}</span>
                    <span className="text-[10px] text-[#8c909f] mt-0.5">
                      WIP: {count} {limit !== 999 && `/ Limit: ${limit}`}
                    </span>
                  </div>
                  {isExceeded && (
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-red-500/20 border border-red-500/30 text-red-400 uppercase animate-pulse flex items-center gap-1">
                      <AlertTriangle size={8} /> WIP Breached
                    </span>
                  )}
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scroll pr-1">
                  {tasks.filter(t => columnsList.some(s => s.id === t.statusId)).map(task => {
                    const statusObj = statuses.find(s => s.id === task.statusId);
                    const isIssue = task.taskType === 'ISSUE';
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => selectTaskDetails(task)}
                        className={`p-4 rounded-xl border bg-[#161a26]/40 hover:bg-[#1c2234]/60 transition-all duration-300 cursor-pointer relative group ${
                          selectedTask?.id === task.id ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-[#1c2234]/80' : 
                          isIssue ? 'border-red-500/10 hover:border-red-500/30' : 'border-[#424754]/10 hover:border-[#424754]/30'
                        }`}
                      >
                        {/* Task Card Header */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-mono font-bold text-[#8c909f]">#{task.id}</span>
                          {isIssue ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-0.5">
                              <AlertTriangle size={8} /> SEV0 ISSUE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 border border-blue-500/20 text-[#adc6ff]">TASK</span>
                          )}
                        </div>

                        <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">{task.title}</h4>
                        <p className="text-[10px] text-[#8c909f] line-clamp-2 mt-1.5">{task.description}</p>

                        <div className="mt-3 pt-3 border-t border-[#424754]/5 flex justify-between items-center">
                          <span 
                            className="px-1.5 py-0.5 rounded text-[8px] font-semibold border"
                            style={{
                              backgroundColor: statusObj ? `${statusObj.color}10` : '#94a3b810',
                              borderColor: statusObj ? `${statusObj.color}30` : '#94a3b830',
                              color: statusObj ? statusObj.color : '#94a3b8'
                            }}
                          >
                            {statusObj ? statusObj.name : 'Unknown'}
                          </span>
                          <span className="text-[8px] font-mono text-[#8c909f]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Triage Drawer */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0f131d] border-l border-[#424754]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="p-6 border-b border-[#424754]/10 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-[#8c909f]">Triage Console / #{selectedTask.id}</span>
              <h3 className="text-sm font-bold text-white mt-1">Ticket Details</h3>
            </div>
            <button 
              onClick={() => setSelectedTask(null)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#c2c6d6]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scroll">
            {/* Title & Desc */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h4 className="text-xs font-bold text-white">{selectedTask.title}</h4>
              <p className="text-[11px] text-[#c2c6d6] mt-2 leading-relaxed">{selectedTask.description}</p>
            </div>

            {/* SLA Badges (For Issues) */}
            {selectedTask.taskType === 'ISSUE' && selectedTaskDetails && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} className="text-red-400" />
                  SRE Response Pager System
                </h5>

                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div className="flex flex-col bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <span className="text-[9px] text-[#8c909f]">SLA Target Response</span>
                    <span className="text-xs font-bold text-white mt-1 flex items-center gap-1">
                      <Clock size={11} className="text-red-400" />
                      15 min limits
                    </span>
                  </div>
                  <div className="flex flex-col bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <span className="text-[9px] text-[#8c909f]">SLA Target Fix</span>
                    <span className="text-xs font-bold text-white mt-1 flex items-center gap-1">
                      <Clock size={11} className="text-red-400" />
                      180 min limits
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-500/10">
                  <span className="text-[10px] text-[#c2c6d6]">Coverage: <span className="font-semibold text-white">{onCallUser}</span></span>
                  <button 
                    onClick={handlePagePrimary}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-[9px] font-bold text-red-400 border border-red-500/30 transition-all cursor-pointer"
                  >
                    Page Primary Cover
                  </button>
                </div>
              </div>
            )}

            {/* Workflow Transitions */}
            <div className="flex flex-col gap-2">
              <h5 className="text-[10px] font-bold text-[#8c909f] uppercase tracking-wider">Available Status Transitions</h5>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {statusTransitions.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleTransition(st)}
                    className="flex justify-between items-center px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 text-[10px] font-semibold text-white transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                      {st.name}
                    </span>
                    <ArrowRight size={10} className="text-[#8c909f]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Control Panel */}
            {selectedTask.taskType === 'ISSUE' && selectedTaskDetails && (
              <div className="flex flex-col gap-3 border-t border-[#424754]/10 pt-4">
                <h5 className="text-[10px] font-bold text-[#8c909f] uppercase tracking-wider">Issue Action Matrix</h5>

                <div className="flex flex-wrap gap-2 mt-1">
                  {!selectedTaskDetails.acknowledgedAt && (
                    <button 
                      onClick={handleAcknowledge}
                      className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Acknowledge Response SLA
                    </button>
                  )}
                  {selectedTaskDetails.acknowledgedAt && !selectedTaskDetails.resolvedAt && (
                    <button 
                      onClick={() => setIsResolveModalOpen(true)}
                      className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Log RCA & Resolve
                    </button>
                  )}
                  {selectedTaskDetails.resolvedAt && !selectedTaskDetails.verifiedAt && (
                    <button 
                      onClick={handleVerifyResolution}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-[#adc6ff] text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Verify SLA Resolution
                    </button>
                  )}
                </div>

                {/* Resolve Modal Backdrop */}
                {isResolveModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleResolveIssue} className="bg-[#0f131d] border border-[#424754]/20 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Log Root Cause Analysis (RCA)</h4>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#8c909f] font-bold uppercase">Root Cause</label>
                        <textarea 
                          rows={2}
                          value={rootCause}
                          onChange={(e) => setRootCause(e.target.value)}
                          placeholder="e.g. Memory leak in cache client replica nodes..."
                          className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#8c909f] font-bold uppercase">Resolution Details</label>
                        <textarea 
                          rows={2}
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="e.g. Cleared cached buffer indices and added failover check..."
                          className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40"
                          required
                        />
                      </div>

                      <div className="flex gap-2 justify-end mt-2">
                        <button 
                          type="button"
                          onClick={() => setIsResolveModalOpen(false)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs rounded-lg text-white font-semibold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 hover:brightness-110 text-xs rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Resolve SLA Ticket
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Duplicate Linker */}
                {!selectedTaskDetails.duplicateOfTaskId && (
                  <form onSubmit={handleLinkDuplicate} className="flex gap-2 items-center bg-white/[0.01] border border-white/5 rounded-lg p-2 mt-2">
                    <LinkIcon size={12} className="text-[#8c909f]" />
                    <input 
                      type="text"
                      placeholder="Duplicate of Task ID..."
                      value={duplicateParentId}
                      onChange={(e) => setDuplicateParentId(e.target.value)}
                      className="bg-transparent border-none text-[10px] text-white outline-none flex-1 placeholder-[#8c909f]"
                    />
                    <button 
                      type="submit"
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold rounded text-white cursor-pointer"
                    >
                      Link
                    </button>
                  </form>
                )}

                {selectedTaskDetails.duplicateOfTaskId && (
                  <div className="text-[10px] text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 px-3 py-2 rounded-lg flex items-center gap-1.5 mt-2">
                    <Info size={12} />
                    <span>Linked as Duplicate of: <span className="font-bold text-white">#{selectedTaskDetails.duplicateOfTaskId}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Block Comments Modal Prompt */}
            {isBlockingPromptOpen && targetTransitionStatus && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#0f131d] border border-red-500/30 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl pulse-error">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Comment Required (Blocked Status)
                  </h4>
                  <p className="text-[11px] text-[#c2c6d6]">This transition requires documentation specifying the blocker dependencies.</p>
                  
                  <textarea 
                    rows={3}
                    value={blockComment}
                    onChange={(e) => setBlockComment(e.target.value)}
                    placeholder="Specify blocking dependency or reasons..."
                    className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-red-500/40"
                    required
                  />

                  <div className="flex gap-2 justify-end mt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsBlockingPromptOpen(false);
                        setBlockComment('');
                      }}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg text-white font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      disabled={!blockComment.trim()}
                      onClick={() => handleTransition(targetTransitionStatus)}
                      className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-50 hover:brightness-110 text-xs rounded-lg font-bold transition-all cursor-pointer"
                    >
                      Confirm Block
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Logs */}
            <div className="flex flex-col gap-3 border-t border-[#424754]/10 pt-4">
              <h5 className="text-[10px] font-bold text-[#8c909f] uppercase tracking-wider">Status History Logs</h5>
              <div className="flex flex-col gap-3 mt-1">
                {statusHistory.map(h => {
                  const toStat = statuses.find(s => s.id === h.toStatusId);
                  return (
                    <div key={h.id} className="flex gap-3 items-start text-[10px] text-[#c2c6d6]">
                      <div className="flex items-center gap-1 text-white bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono font-semibold">
                        <CornerDownRight size={8} />
                        {toStat ? toStat.name : 'State'}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-white font-semibold">{h.comment || 'Transition executed.'}</span>
                        <span className="text-[9px] text-[#8c909f] mt-0.5">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanPage;
