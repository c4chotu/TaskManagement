import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import apiClient from '../../../shared/lib/apiClient';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestedTask {
  title: string;
  description: string;
  priority: string;
  severity?: string;
  taskType: 'TASK' | 'ISSUE';
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [risks, setRisks] = useState<string[]>([]);

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsTyping(true);
    setAiResponse('');
    setSuggestedTasks([]);
    setRisks([]);

    // Simulate typewriter SSE streaming response
    const fullText = "Analyzing workspace telemetry and project historical logs...\n\nBased on US-East-1 latency thresholds, I have detected a potential overload in replica DB routing. Here is a risk analysis and 2 suggested tickets to resolve the backend bottleneck.";
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setAiResponse((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Load suggestions and risks
        setRisks([
          "Backend Eng team capacity is currently at 120%. Adding high-priority tickets will overload L3 DevOps developers.",
          "Replica DB node failure risk: High. DB connection pools are exhaustively consumed."
        ]);
        setSuggestedTasks([
          {
            title: "Optimize PostgreSQL replica read-connection pool size",
            description: "Increase Spring datasource Hikari maximumPoolSize from 15 to 40 on secondary nodes.",
            priority: "HIGH",
            taskType: "TASK"
          },
          {
            title: "SEV1: Configure automated read-replica failover script",
            description: "Build health check ping script and route to backup node on response failure.",
            priority: "URGENT",
            severity: "SEV1",
            taskType: "ISSUE"
          }
        ]);
      }
    }, 15);
  };

  const handleImportTask = async (task: SuggestedTask) => {
    try {
      // Find a project to allocate the task (e.g. get first project ID)
      const prjListRes = await apiClient.get('/api/v1/projects');
      const prjId = prjListRes.data[0]?.id;

      if (!prjId) {
        alert("No active projects found to import tasks to.");
        return;
      }

      if (task.taskType === 'ISSUE') {
        await apiClient.post('/api/v1/issues', {
          taskRequest: {
            title: task.title,
            description: task.description,
            projectId: prjId
          },
          severity: task.severity || 'SEV2',
          environment: 'Production',
          customerReported: false
        });
      } else {
        await apiClient.post('/api/v1/tasks', {
          title: task.title,
          description: task.description,
          projectId: prjId,
          priority: task.priority
        });
      }

      alert(`Imported "${task.title}" successfully into the Kanban board!`);
      // Remove from suggestions
      setSuggestedTasks((prev) => prev.filter(t => t.title !== task.title));
    } catch (err) {
      alert("Failed to import task via API. Is the server running?");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Drawer overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer content panel */}
      <aside className="relative w-full max-w-lg bg-[#0f131d] h-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-[#424754]/10 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#3b82f6]" size={18} />
              <span className="font-bold text-sm text-white uppercase tracking-wider">AI Assistant Agent</span>
            </div>
            <button
              onClick={onClose}
              className="text-[#c2c6d6] hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* AI Response Output */}
          <div className="bg-[#1c1f2a]/20 border border-white/5 rounded-xl p-4 min-h-[150px] mb-6 flex flex-col justify-between">
            <div className="text-xs text-[#dfe2f1] whitespace-pre-wrap leading-relaxed">
              {aiResponse || (
                <span className="text-[#c2c6d6] italic">
                  Ask me to summarize the sprint goals, estimate a task due-date, or generate SRE resolution cards...
                </span>
              )}
            </div>
            {isTyping && (
              <div className="flex items-center gap-1.5 mt-4 text-[10px] text-[#adc6ff] font-semibold">
                <Sparkles size={11} className="animate-spin" />
                AI is thinking...
              </div>
            )}
          </div>

          {/* Risk Alerts */}
          {risks.length > 0 && (
            <div className="mb-6 flex flex-col gap-2">
              <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider">Telemetry Risk Alerts</span>
              {risks.map((risk, i) => (
                <div key={i} className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex gap-2.5 text-xs text-[#c2c6d6] leading-relaxed">
                  <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Structured Task Suggestions list */}
          {suggestedTasks.length > 0 && (
            <div className="mb-6">
              <span className="text-[10px] text-[#adc6ff] font-mono uppercase tracking-wider block mb-3">Structured Task Suggestions</span>
              <div className="flex flex-col gap-3">
                {suggestedTasks.map((task, i) => (
                  <div key={i} className="bg-[#1c1f2a]/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between gap-3 hover:bg-[#1c1f2a]/60 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          task.taskType === 'ISSUE' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-blue-500/10 border border-blue-500/20 text-[#adc6ff]'
                        }`}>
                          {task.taskType === 'ISSUE' ? `ISSUE (${task.severity})` : 'TASK'}
                        </span>
                        <span className="text-[9px] text-[#c2c6d6] font-mono font-semibold">Priority: {task.priority}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1">{task.title}</h4>
                      <p className="text-[10px] text-[#c2c6d6] leading-normal">{task.description}</p>
                    </div>
                    
                    <button
                      onClick={() => handleImportTask(task)}
                      className="bg-blue-500 hover:brightness-110 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle size={13} />
                      Accept & Import to Sprint
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input prompt form */}
        <form onSubmit={handleSendPrompt} className="relative mt-auto pt-4 border-t border-white/5 flex gap-2">
          <input
            type="text"
            placeholder="Type your AI instruction (e.g. Generate database recovery tasks)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isTyping}
            className="flex-1 bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-3.5 pr-10 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !prompt.trim()}
            className="absolute right-2.5 top-[23px] text-[#c2c6d6] hover:text-white disabled:opacity-30 cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
};
export default AIAssistantPanel;
