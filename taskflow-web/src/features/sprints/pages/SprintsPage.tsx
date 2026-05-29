import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Sparkles, 
  TrendingUp, 
  ChevronRight, 
  Plus, 
  Layers,
  ThumbsUp,
  Meh,
  MessageSquare
} from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

interface RetroItem {
  id: string;
  category: 'well' | 'improved';
  feedback: string;
  votes: number;
}

export const SprintsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Lists
  const [backlogTasks, setBacklogTasks] = useState<api.Task[]>([]);
  const [activeTasks, setActiveTasks] = useState<api.Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Retrospective lists
  const [retroFeedback, setRetroFeedback] = useState<RetroItem[]>([
    { id: 'ret-1', category: 'well', feedback: 'Response SLA automated routing dispatch works seamlessly', votes: 4 },
    { id: 'ret-2', category: 'well', feedback: 'Natural language task imports speed is outstanding', votes: 3 },
    { id: 'ret-3', category: 'improved', feedback: 'Database secondary replicas replication lag remains above 600ms', votes: 5 },
    { id: 'ret-4', category: 'improved', feedback: 'L+2 promotion authorization checks require offline fallback clarity', votes: 2 }
  ]);
  const [newRetroText, setNewRetroText] = useState('');
  const [retroCategory, setRetroCategory] = useState<'well' | 'improved'>('well');

  // Burndown graph values: Day index 0 to 10
  const idealPoints = [80, 72, 64, 56, 48, 40, 32, 24, 16, 8, 0];
  const actualPoints = [80, 78, 68, 68, 52, 45, 30, 20, 10]; // Day 0 to 8 recorded

  useEffect(() => {
    const loadSprintData = async () => {
      setLoading(true);
      try {
        let taskList: api.Task[] = [];
        try {
          taskList = await api.getTasks(projectId || '');
        } catch {
          taskList = [];
        }

        if (taskList.length === 0) {
          taskList = [
            { id: 't-501', title: 'Optimize SRE alerts ingestion middleware', description: 'Batch process raw metric inputs.', projectId: projectId || 'p-1', statusId: 's1', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-502', title: 'Verify US-West replication consistency', description: 'Monitor read replica delays.', projectId: projectId || 'p-1', statusId: 's1', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-503', title: 'Standardize organization settings views', description: 'Build premium profile grids.', projectId: projectId || 'p-1', statusId: 's3', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-504', title: 'Check checkout flow API timeouts', description: 'Spikes during high traffic hours.', projectId: projectId || 'p-1', statusId: 's5', taskType: 'ISSUE', createdAt: new Date().toISOString() },
            { id: 't-505', title: 'Create automated database failover plan', description: 'Document steps for secondary nodes promote.', projectId: projectId || 'p-1', statusId: 's6', taskType: 'TASK', createdAt: new Date().toISOString() }
          ];
        }

        // Split tasks between Backlog (s1 or planning status) and Active Sprint (other statuses)
        setBacklogTasks(taskList.filter(t => t.statusId === 's1'));
        setActiveTasks(taskList.filter(t => t.statusId !== 's1'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSprintData();
  }, [projectId]);

  const moveTaskToSprint = (task: api.Task) => {
    // Transition to Todo status
    const updated = { ...task, statusId: 's2' }; // To Do Status
    setBacklogTasks(prev => prev.filter(t => t.id !== task.id));
    setActiveTasks(prev => [updated, ...prev]);
  };

  const handleAddRetro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRetroText.trim()) return;

    const newItem: RetroItem = {
      id: `ret-${Date.now()}`,
      category: retroCategory,
      feedback: newRetroText,
      votes: 1
    };

    setRetroFeedback(prev => [...prev, newItem]);
    setNewRetroText('');
  };

  const voteRetro = (id: string) => {
    setRetroFeedback(prev => prev.map(item => 
      item.id === id ? { ...item, votes: item.votes + 1 } : item
    ));
  };

  // Convert points to SVG points coordinates
  const svgWidth = 500;
  const svgHeight = 200;
  const padding = 25;

  const getSvgCoordinates = (dayIndex: number, points: number) => {
    const x = padding + (dayIndex / 10) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - (points / 80) * (svgHeight - 2 * padding);
    return { x, y };
  };

  const idealPathPoints = idealPoints.map((pts, idx) => {
    const { x, y } = getSvgCoordinates(idx, pts);
    return `${x},${y}`;
  }).join(' ');

  const actualPathPoints = actualPoints.map((pts, idx) => {
    const { x, y } = getSvgCoordinates(idx, pts);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-6 h-full flex flex-col min-w-0 bg-[#0b0f19] custom-scroll">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Plotting sprint iterations...
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* Part 1: Sprint capacity split panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left side Backlog Column Drawer */}
            <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 lg:col-span-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-[#8c909f] uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-blue-400" />
                Planning Product Backlog ({backlogTasks.length})
              </h4>

              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scroll">
                {backlogTasks.length === 0 ? (
                  <span className="text-[10px] text-[#8c909f] italic">Backlog folder is empty.</span>
                ) : (
                  backlogTasks.map(task => (
                    <div 
                      key={task.id}
                      className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-lg p-3 flex justify-between items-center gap-3 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{task.title}</span>
                        <span className="text-[9px] text-[#8c909f] font-mono mt-0.5">#{task.id}</span>
                      </div>
                      <button 
                        onClick={() => moveTaskToSprint(task)}
                        className="p-1 hover:bg-blue-500/10 rounded text-[#8c909f] hover:text-[#3b82f6] transition-colors shrink-0 cursor-pointer"
                        title="Move to Active Sprint"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right side Active Tasks and Burndown Chart */}
            <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 lg:col-span-8 flex flex-col gap-5">
              
              {/* Burndown Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[#424754]/10">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-cyan-400" />
                  Sprint burndown trajectory
                </h4>
                <div className="flex items-center gap-4 text-[9px] font-bold text-[#8c909f]">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-0.5 bg-red-500" />
                    <span>Ideal Trend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    <span>Actual Remaining</span>
                  </div>
                </div>
              </div>

              {/* SVG Burndown Graph */}
              <div className="w-full flex justify-center bg-[#0f131d]/60 border border-white/5 p-4 rounded-lg overflow-x-auto">
                <svg width={svgWidth} height={svgHeight} className="overflow-visible select-none">
                  {/* Grid boundary guides */}
                  <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="rgba(255,255,255,0.03)" />
                  <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="rgba(255,255,255,0.03)" />
                  <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="rgba(255,255,255,0.05)" />
                  <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="rgba(255,255,255,0.05)" />

                  {/* Ideal burndown line */}
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                    points={idealPathPoints}
                  />

                  {/* Actual remaining burndown line */}
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    points={actualPathPoints}
                    className="shadow-lg shadow-cyan-500/25"
                  />

                  {/* Data points markers */}
                  {actualPoints.map((pts, idx) => {
                    const { x, y } = getSvgCoordinates(idx, pts);
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#22d3ee"
                        stroke="#0f131d"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Grid labels */}
                  <text x={padding} y={svgHeight - 8} fill="#8c909f" fontSize="8" textAnchor="middle">Day 0</text>
                  <text x={padding + (5/10)*(svgWidth-2*padding)} y={svgHeight - 8} fill="#8c909f" fontSize="8" textAnchor="middle">Day 5</text>
                  <text x={svgWidth - padding} y={svgHeight - 8} fill="#8c909f" fontSize="8" textAnchor="middle">Day 10</text>

                  <text x={padding - 5} y={padding} fill="#8c909f" fontSize="8" textAnchor="end">80 SP</text>
                  <text x={padding - 5} y={svgHeight / 2} fill="#8c909f" fontSize="8" textAnchor="end">40 SP</text>
                  <text x={padding - 5} y={svgHeight - padding} fill="#8c909f" fontSize="8" textAnchor="end">0 SP</text>
                </svg>
              </div>

              {/* Active sprint list list */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Active Sprint Cards ({activeTasks.length})</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeTasks.map(task => (
                    <div 
                      key={task.id}
                      className="p-3 bg-white/[0.01] border border-[#424754]/10 rounded-lg flex flex-col justify-between"
                    >
                      <span className="text-xs font-semibold text-white truncate">{task.title}</span>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                        <span className="text-[9px] font-mono text-[#8c909f]">#{task.id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-500/10 text-[#adc6ff]">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Part 2: Retrospective Lanes */}
          <div className="flex flex-col gap-5 border-t border-[#424754]/10 pt-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#06b6d4]" />
              Sprint Retrospective boards
            </h4>

            {/* Input feedback form */}
            <form onSubmit={handleAddRetro} className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Log retrospective feedback note..."
                value={newRetroText}
                onChange={(e) => setNewRetroText(e.target.value)}
                className="flex-1 bg-[#161a26]/60 border border-[#424754]/20 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-blue-500/40 min-w-[240px]"
              />

              <div className="flex items-center gap-1 bg-[#161a26]/40 border border-[#424754]/20 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setRetroCategory('well')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    retroCategory === 'well' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-[#c2c6d6]'
                  }`}
                >
                  Went Well
                </button>
                <button
                  type="button"
                  onClick={() => setRetroCategory('improved')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    retroCategory === 'improved' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-[#c2c6d6]'
                  }`}
                >
                  To Improve
                </button>
              </div>

              <button 
                type="submit"
                className="bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:brightness-110 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add Retro
              </button>
            </form>

            {/* Retro columns layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Went well */}
              <div className="bg-[#10b981]/[0.01] border border-green-500/10 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-green-500/10">
                  <ThumbsUp size={13} /> What Went Well
                </span>

                <div className="flex flex-col gap-3">
                  {retroFeedback.filter(item => item.category === 'well').map(item => (
                    <div 
                      key={item.id}
                      className="bg-white/[0.01] border border-white/5 rounded-lg p-3.5 flex justify-between items-center gap-3"
                    >
                      <span className="text-xs text-[#dfe2f1] leading-relaxed">{item.feedback}</span>
                      <button
                        onClick={() => voteRetro(item.id)}
                        className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded text-[10px] font-bold text-green-400 transition-colors cursor-pointer"
                      >
                        Vote ({item.votes})
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Could be improved */}
              <div className="bg-[#f59e0b]/[0.01] border border-yellow-500/10 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-yellow-500/10">
                  <Meh size={13} /> Areas For Improvement
                </span>

                <div className="flex flex-col gap-3">
                  {retroFeedback.filter(item => item.category === 'improved').map(item => (
                    <div 
                      key={item.id}
                      className="bg-white/[0.01] border border-white/5 rounded-lg p-3.5 flex justify-between items-center gap-3"
                    >
                      <span className="text-xs text-[#dfe2f1] leading-relaxed">{item.feedback}</span>
                      <button
                        onClick={() => voteRetro(item.id)}
                        className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded text-[10px] font-bold text-yellow-400 transition-colors cursor-pointer"
                      >
                        Vote ({item.votes})
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintsPage;
