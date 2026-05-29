import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle,
  FileDown
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleExport = () => {
    setExporting(true);
    addToast(`Asynchronously generating secure ${exportFormat.toUpperCase()} package...`, "info");
    
    setTimeout(() => {
      setExporting(false);
      addToast(`Telemetry report package downloaded successfully.`, "success");
    }, 2500);
  };

  // SVG Area Chart points coordinates generator
  const areaPoints = "40,140 100,110 160,120 220,80 280,60 340,90 400,40 460,20";
  const areaFillPoints = "40,150 " + areaPoints + " 460,150";

  return (
    <div className="p-6 md:p-8 h-full flex flex-col min-w-0 bg-[#0b0f19] custom-scroll">
      
      {/* Toast Alert panel */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg min-w-[280px] pointer-events-auto animate-slide-in flex items-center gap-2 ${
              t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            <CheckCircle size={14} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Banner Actions */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 pb-4 border-b border-[#424754]/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-[#3b82f6]" />
            Operations Analytics Dashboard
          </h2>
          <p className="text-xs text-[#c2c6d6] mt-1">Lead times distribution, SRE response rates, and capacity limits summaries.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500/40 cursor-pointer"
          >
            <option value="pdf">SECURE PDF</option>
            <option value="csv">SPREADSHEET CSV</option>
          </select>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-500 hover:brightness-110 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {exporting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileDown size={14} />
            )}
            {exporting ? 'Generating...' : 'Export telemetry'}
          </button>
        </div>
      </div>

      {/* Grid statistics summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1 */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#8c909f]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Lead Time</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <span className="text-2xl font-bold text-white">3.4 Days</span>
          <span className="text-[9px] text-green-400 font-semibold mt-1">↓ 12.5% from last sprint</span>
        </div>

        {/* Card 2 */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#8c909f]">
            <span className="text-[10px] font-bold uppercase tracking-wider">SLA breaches</span>
            <ShieldAlert size={16} className="text-red-400" />
          </div>
          <span className="text-2xl font-bold text-white">0 Count</span>
          <span className="text-[9px] text-[#8c909f] font-semibold mt-1">Nominal performance</span>
        </div>

        {/* Card 3 */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#8c909f]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sprint velocity</span>
            <TrendingUp size={16} className="text-cyan-400" />
          </div>
          <span className="text-2xl font-bold text-white">76 Points</span>
          <span className="text-[9px] text-green-400 font-semibold mt-1">↑ 4.2% completion capacity</span>
        </div>

        {/* Card 4 */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#8c909f]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Deploy compliance</span>
            <CheckCircle size={16} className="text-green-400" />
          </div>
          <span className="text-2xl font-bold text-white">100% Rate</span>
          <span className="text-[9px] text-[#8c909f] font-semibold mt-1">99.99% system availability</span>
        </div>

      </div>

      {/* Analytics Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left chart: Lead Time Area graph */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Lead Time Distributions</span>
            <span className="text-[9px] text-[#8c909f] bg-white/5 px-2 py-0.5 rounded">Cycle time trend</span>
          </div>

          <div className="w-full flex justify-center bg-[#0f131d]/60 border border-white/5 p-4 rounded-lg">
            <svg width="480" height="180" className="overflow-visible select-none">
              {/* Gradients definitions */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid guides */}
              <line x1="40" y1="30" x2="460" y2="30" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="90" x2="460" y2="90" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="150" x2="460" y2="150" stroke="rgba(255,255,255,0.05)" />
              <line x1="40" y1="30" x2="40" y2="150" stroke="rgba(255,255,255,0.05)" />

              {/* Shaded Area */}
              <polygon points={areaFillPoints} fill="url(#areaGradient)" />

              {/* Outline Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points={areaPoints}
              />

              {/* Data Markers */}
              {[
                { x: 40, y: 140 }, { x: 100, y: 110 }, { x: 160, y: 120 },
                { x: 220, y: 80 }, { x: 280, y: 60 }, { x: 340, y: 90 },
                { x: 400, y: 40 }, { x: 460, y: 20 }
              ].map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#3b82f6"
                  stroke="#0f131d"
                  strokeWidth="1"
                />
              ))}

              {/* X Labels */}
              <text x="40" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">W1</text>
              <text x="160" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">W3</text>
              <text x="280" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">W5</text>
              <text x="400" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">W7</text>
            </svg>
          </div>
        </div>

        {/* Right chart: Completions Bar Chart */}
        <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Task Completion Volume</span>
            <span className="text-[9px] text-[#8c909f] bg-white/5 px-2 py-0.5 rounded">Tickets velocity</span>
          </div>

          <div className="w-full flex justify-center bg-[#0f131d]/60 border border-white/5 p-4 rounded-lg">
            <svg width="480" height="180" className="overflow-visible select-none">
              {/* Definitions */}
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Grid guides */}
              <line x1="40" y1="30" x2="460" y2="30" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="90" x2="460" y2="90" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="150" x2="460" y2="150" stroke="rgba(255,255,255,0.05)" />
              <line x1="40" y1="30" x2="40" y2="150" stroke="rgba(255,255,255,0.05)" />

              {/* Vertical Bars */}
              {[
                { x: 60, h: 40, val: '24' },
                { x: 120, h: 65, val: '39' },
                { x: 180, h: 50, val: '30' },
                { x: 240, h: 90, val: '54' },
                { x: 300, h: 110, val: '66' },
                { x: 360, h: 80, val: '48' },
                { x: 420, h: 115, val: '69' }
              ].map((b, idx) => (
                <g key={idx}>
                  <rect
                    x={b.x}
                    y={150 - b.h}
                    width="24"
                    height={b.h}
                    fill="url(#barGradient)"
                    rx="3"
                    className="hover:brightness-110 transition-all cursor-pointer"
                  />
                  <text x={b.x + 12} y={145 - b.h} fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="middle">{b.val}</text>
                </g>
              ))}

              {/* X Labels */}
              <text x="72" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">Mon</text>
              <text x="192" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">Wed</text>
              <text x="312" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">Fri</text>
              <text x="432" y="165" fill="#8c909f" fontSize="8" textAnchor="middle">Sun</text>
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportsPage;
