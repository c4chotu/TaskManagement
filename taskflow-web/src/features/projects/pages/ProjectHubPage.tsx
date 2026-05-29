import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Activity, Calendar, ExternalLink } from 'lucide-react';
import apiClient from '../../../shared/lib/apiClient';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  type: string;
  progress: number;
  healthScore?: number;
  overdueTasksCount?: number;
  createdAt: string;
}

export const ProjectHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('KANBAN');

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get('/api/v1/projects');
      setProjects(res.data);
    } catch (e) {
      // Mock projects
      setProjects([
        {
          id: 'p9999999-9999-9999-9999-999999999999',
          name: 'Core Infrastructure Sprint',
          description: 'Core Platform Sprint Cycle for auth schemas and failures replication.',
          status: 'ACTIVE',
          type: 'KANBAN',
          progress: 68,
          healthScore: 85,
          overdueTasksCount: 0,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await apiClient.post('/api/v1/projects', {
        name,
        description: desc,
        type
      });
      setProjects((prev) => [...prev, { ...res.data, progress: 0, healthScore: 100, overdueTasksCount: 0 }]);
      setIsCreateOpen(false);
      setName('');
      setDesc('');
    } catch (err) {
      const mock: Project = {
        id: 'p-' + Date.now(),
        name,
        description: desc,
        status: 'ACTIVE',
        type,
        progress: 0,
        healthScore: 100,
        overdueTasksCount: 0,
        createdAt: new Date().toISOString()
      };
      setProjects((prev) => [...prev, mock]);
      setIsCreateOpen(false);
      setName('');
      setDesc('');
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex justify-between items-end pb-4 border-b border-[#424754]/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Project Portfolio Hub</h1>
          <p className="text-xs text-[#c2c6d6] mt-1">Manage and track active workspace projects, milestones, and status metrics.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#3b82f6] hover:brightness-110 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] cursor-pointer"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="glass-panel rounded-xl p-5 flex flex-col justify-between min-h-[200px] border border-white/5 hover:border-blue-500/20 transition-all group"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="text-[#3b82f6]" size={16} />
                  <span className="text-[10px] text-[#adc6ff] font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{project.type}</span>
                </div>
                <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded font-semibold">{project.status}</span>
              </div>

              <h3 className="text-sm font-bold text-white mb-2">{project.name}</h3>
              <p className="text-[11px] text-[#c2c6d6] line-clamp-2 leading-relaxed mb-4">{project.description || 'No description provided.'}</p>
            </div>

            <div>
              {/* Progress */}
              <div className="flex justify-between items-center text-[10px] text-[#c2c6d6] mb-1.5 font-semibold">
                <span>Overall Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-4">
                <div className="bg-[#3b82f6] h-full rounded-full transition-all" style={{ width: `${project.progress}%` }} />
              </div>

              {/* Footer status buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <div className="flex gap-4 text-[10px] text-[#c2c6d6] font-semibold">
                  <span className="flex items-center gap-1">
                    <Activity size={12} className="text-[#06b6d4]" />
                    Health: {project.healthScore || 100}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Overdue: {project.overdueTasksCount || 0}
                  </span>
                </div>
                
                <button
                  onClick={() => navigate(`/projects/${project.id}/board`)}
                  className="text-xs text-[#3b82f6] hover:text-[#adc6ff] flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-transform cursor-pointer"
                >
                  Enter Project
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md bg-[#0f131d] rounded-xl border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Initialize project space</h3>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Platform Sprints"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Description</label>
              <textarea
                placeholder="Detail deliverables and scope..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#c2c6d6] uppercase font-mono block mb-2">Methodology Strategy</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#1c1f2a] border border-white/10 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="KANBAN">KANBAN Framework</option>
                <option value="AGILE">AGILE Scrum</option>
                <option value="WATERFALL">WATERFALL Gantt Timeline</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#c2c6d6] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default ProjectHubPage;
