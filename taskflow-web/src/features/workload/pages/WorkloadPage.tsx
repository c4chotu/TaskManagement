import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Sparkles, 
  Gauge, 
  AlertTriangle, 
  Shuffle, 
  UserCheck, 
  Plus, 
  Settings2,
  Trash2,
  CheckCircle
} from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

interface WorkloadUser {
  id: string;
  name: string;
  roleName: string;
  activeCount: number;
  capacityLimit: number;
  departmentName: string;
}

export const WorkloadPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [users, setUsers] = useState<WorkloadUser[]>([]);
  const [rules, setRules] = useState<api.RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New routing rule form states
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('TASK');
  const [ruleStrategy, setRuleStrategy] = useState('LEAST_BUSY');
  
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  useEffect(() => {
    const loadWorkload = async () => {
      setLoading(true);
      try {
        // Fetch active rules from routing controller
        let activeRules: api.RoutingRule[] = [];
        try {
          activeRules = await api.listRoutingRules();
        } catch {
          activeRules = [
            { id: 'r-1', ruleName: 'SRE Auto-Assignment Routing', taskType: 'ISSUE', assignmentStrategy: 'ON_CALL', autoCreateSubtasks: true, priority: 10, enabled: true },
            { id: 'r-2', ruleName: 'Frontend Round Robin Dispatcher', taskType: 'TASK', assignmentStrategy: 'ROUND_ROBIN', autoCreateSubtasks: false, priority: 5, enabled: true }
          ];
        }
        setRules(activeRules);

        // Populate workload items
        const mockWorkloads: WorkloadUser[] = [
          { id: '11111111-1111-1111-1111-111111111111', name: 'Alice Chen', roleName: 'ORG_OWNER', activeCount: 6, capacityLimit: 5, departmentName: 'SRE Ops' },
          { id: '22222222-2222-2222-2222-222222222222', name: 'Marcus Taylor', roleName: 'DEPT_HEAD', activeCount: 2, capacityLimit: 4, departmentName: 'Engineering' },
          { id: '33333333-3333-3333-3333-333333333333', name: 'David Kim', roleName: 'TEAM_LEAD', activeCount: 5, capacityLimit: 4, departmentName: 'Engineering' },
          { id: '44444444-4444-4444-4444-444444444444', name: 'Sarah Connor', roleName: 'TEAM_MEMBER', activeCount: 1, capacityLimit: 5, departmentName: 'Frontend Web' }
        ];
        setUsers(mockWorkloads);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWorkload();
  }, [projectId]);

  // Reassignment suggester
  const triggerAutoRouteReassignment = async (userId: string) => {
    const userObj = users.find(u => u.id === userId);
    if (!userObj) return;

    addToast(`Triggering routing logic engine analysis for ${userObj.name}...`, "info");
    
    // Find least busy engineer
    const eligible = users.filter(u => u.id !== userId);
    eligible.sort((a, b) => (a.activeCount / a.capacityLimit) - (b.activeCount / b.capacityLimit));
    const target = eligible[0];

    if (target) {
      setTimeout(() => {
        // Transfer 1 task load
        setUsers(prev => prev.map(u => {
          if (u.id === userId) return { ...u, activeCount: Math.max(0, u.activeCount - 1) };
          if (u.id === target.id) return { ...u, activeCount: u.activeCount + 1 };
          return u;
        }));
        addToast(`Reassigned load from ${userObj.name} to ${target.name} (strategy: LEAST_BUSY)`, "success");
      }, 1200);
    }
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    addToast("Routing rule deactivated.", "warning");
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: api.RoutingRule = {
      id: `r-${Date.now()}`,
      ruleName,
      taskType: ruleType,
      assignmentStrategy: ruleStrategy,
      autoCreateSubtasks: false,
      priority: 10,
      enabled: true
    };

    setRules(prev => [...prev, newRule]);
    setIsRuleFormOpen(false);
    setRuleName('');
    addToast(`Successfully initialized rule: ${ruleName}`, "success");
  };

  return (
    <div className="p-6 h-full flex flex-col min-w-0 bg-[#0b0f19] relative overflow-hidden custom-scroll">
      
      {/* Toast Alert Drawer */}
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
            {t.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Loading capacity bounds...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Members list header */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gauge size={16} className="text-[#06b6d4]" />
              Active Coverage & Capacity Balances
            </h3>
            <span className="text-[10px] text-[#adc6ff] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-semibold uppercase font-mono">Telemetry coverage</span>
          </div>

          {/* Members Capacity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {users.map(u => {
              const ratio = u.activeCount / u.capacityLimit;
              const loadPercent = Math.min(100, Math.round(ratio * 100));
              const isOverloaded = ratio > 1.0;

              return (
                <div 
                  key={u.id}
                  className={`glass-panel p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 border ${
                    isOverloaded ? 'border-red-500/30 bg-red-500/[0.01] ambient-glow-error pulse-error' : 'border-[#424754]/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{u.name}</span>
                      <span className="text-[9px] text-[#8c909f] mt-0.5">{u.roleName} • {u.departmentName}</span>
                    </div>

                    {isOverloaded ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-extrabold bg-red-500/20 border border-red-500/30 text-red-400 uppercase flex items-center gap-0.5 shrink-0 animate-pulse">
                        <AlertTriangle size={8} /> OVERLOAD
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 uppercase shrink-0">
                        NOMINAL
                      </span>
                    )}
                  </div>

                  {/* Load bar meter */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-[#8c909f]">Active Tickets: {u.activeCount} / {u.capacityLimit}</span>
                      <span className={isOverloaded ? 'text-red-400' : 'text-[#adc6ff]'}>{Math.round(ratio * 100)}%</span>
                    </div>

                    <div className="w-full h-1.5 bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverloaded ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                        }`}
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Reassignment trigger action */}
                  {isOverloaded && (
                    <button
                      onClick={() => triggerAutoRouteReassignment(u.id)}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg transition-all duration-300 flex justify-center items-center gap-1.5 mt-1 cursor-pointer"
                    >
                      <Shuffle size={12} /> Propose Load Shift
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Part B: Routing Dispatcher Rules */}
          <div className="flex flex-col gap-4 border-t border-[#424754]/10 pt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings2 size={16} className="text-[#06b6d4]" />
                Auto-Assignment Routing rules
              </h3>
              <button 
                onClick={() => setIsRuleFormOpen(true)}
                className="bg-white/5 hover:bg-white/10 border border-blue-500/30 text-[#adc6ff] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} /> Configure Rule
              </button>
            </div>

            {/* List rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map(rule => (
                <div 
                  key={rule.id}
                  className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col justify-between gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{rule.ruleName}</span>
                      <span className="text-[9px] text-[#8c909f] mt-0.5 uppercase">Applies To: {rule.taskType}S</span>
                    </div>

                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="p-1 hover:bg-red-500/10 rounded text-[#8c909f] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex gap-4 text-[10px] font-bold text-[#c2c6d6]">
                    <div className="bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Shuffle size={11} className="text-blue-400" />
                      <span>Strategy: {rule.assignmentStrategy}</span>
                    </div>

                    <div className="bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <UserCheck size={11} className="text-green-400" />
                      <span>Auto Subtasks: {rule.autoCreateSubtasks ? 'Active' : 'None'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Rule Modal Form */}
      {isRuleFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRule} className="bg-[#0f131d] border border-[#424754]/20 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configure Auto-Assignment Rule</h4>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#8c909f] font-bold uppercase">Rule Name</label>
              <input 
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. SRE Critical Response Pager"
                className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#8c909f] font-bold uppercase">Target Workload Type</label>
              <select 
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40 cursor-pointer"
              >
                <option value="TASK">TASKS ONLY</option>
                <option value="ISSUE">ISSUES ONLY</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#8c909f] font-bold uppercase">Assignment Strategy</label>
              <select 
                value={ruleStrategy}
                onChange={(e) => setRuleStrategy(e.target.value)}
                className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40 cursor-pointer"
              >
                <option value="LEAST_BUSY">LEAST BUSY CAPACITY</option>
                <option value="ROUND_ROBIN">ROUND ROBIN BALANCED</option>
                <option value="ON_CALL">ON CALL PRIMARY SRE</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button 
                type="button" 
                onClick={() => setIsRuleFormOpen(false)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg text-white font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-[#adc6ff] hover:brightness-110 text-xs rounded-lg font-bold transition-all cursor-pointer"
              >
                Create Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkloadPage;
