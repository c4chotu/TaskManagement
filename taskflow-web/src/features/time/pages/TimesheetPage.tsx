import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Clock, 
  Play, 
  Pause, 
  Save, 
  CalendarRange, 
  CheckCircle,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

interface TimesheetRow {
  taskId: string;
  taskTitle: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export const TimesheetPage: React.FC = () => {
  const [tasks, setTasks] = useState<api.Task[]>([]);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stopwatch Tracker state
  const [selectedTrackerTaskId, setSelectedTrackerTaskId] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Approval state
  const [sheetSubmitted, setSheetSubmitted] = useState(false);
  const [approvedBy, setApprovedBy] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const loadTimesheetData = async () => {
      setLoading(true);
      try {
        let prjTasks: api.Task[] = [];
        try {
          // Attempt default fetch
          const projects = await api.getProjects();
          if (projects.length > 0) {
            prjTasks = await api.getTasks(projects[0].id);
          }
        } catch {
          // Failover mock tasks
          prjTasks = [
            { id: 't-10', title: 'Design system tokens & variables', description: '', projectId: 'p-1', statusId: 's6', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-11', title: 'Database connection pools & schema init', description: '', projectId: 'p-1', statusId: 's3', taskType: 'TASK', createdAt: new Date().toISOString() },
            { id: 't-12', title: 'Implement Core JWT Middleware validation', description: '', projectId: 'p-1', statusId: 's3', taskType: 'TASK', createdAt: new Date().toISOString() }
          ];
        }
        setTasks(prjTasks);
        if (prjTasks.length > 0) {
          setSelectedTrackerTaskId(prjTasks[0].id);
        }

        // Mock sheet row data mapped to tasks
        const initialRows = prjTasks.map((t, idx) => ({
          taskId: t.id,
          taskTitle: t.title,
          monday: idx === 0 ? 3.5 : 0,
          tuesday: idx === 0 ? 4 : 2.5,
          wednesday: idx === 1 ? 6 : 0,
          thursday: idx === 2 ? 8 : 1.5,
          friday: 4,
          saturday: 0,
          sunday: 0
        }));
        setRows(initialRows);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTimesheetData();
  }, []);

  // Timer counter loop
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const logTrackedHours = () => {
    if (secondsElapsed === 0) return;
    const hours = Math.round((secondsElapsed / 3600) * 100) / 100; // convert to float hours

    setRows(prev => prev.map(row => {
      if (row.taskId === selectedTrackerTaskId) {
        // Log into current day (e.g. default Wednesday/Today index)
        const dayName = new Date().toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
        return {
          ...row,
          [dayName]: Math.round((Number(row[dayName as keyof TimesheetRow] || 0) + hours) * 100) / 100
        };
      }
      return row;
    }));

    addToast(`Successfully logged ${hours} hours to selected task`, "success");
    setSecondsElapsed(0);
    setTimerActive(false);
  };

  const handleCellChange = (taskId: string, day: keyof TimesheetRow, value: string) => {
    const floatVal = parseFloat(value) || 0;
    setRows(prev => prev.map(row => 
      row.taskId === taskId ? { ...row, [day]: floatVal } : row
    ));
  };

  const submitTimesheet = () => {
    setSheetSubmitted(true);
    addToast("Timesheet submitted for manager approval.", "success");
    
    // Simulate auto-approval by manager after delay
    setTimeout(() => {
      setApprovedBy("Marcus Taylor (DEPT_HEAD)");
      addToast("Timesheet approved by Marcus Taylor (L3).", "success");
    }, 3000);
  };

  // Calculations
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const getRowTotal = (row: TimesheetRow) => {
    return row.monday + row.tuesday + row.wednesday + row.thursday + row.friday + row.saturday + row.sunday;
  };

  const getDayTotal = (day: keyof TimesheetRow) => {
    return rows.reduce((acc, row) => acc + (Number(row[day]) || 0), 0);
  };

  const grandTotal = rows.reduce((acc, row) => acc + getRowTotal(row), 0);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col min-w-0 bg-[#0b0f19] custom-scroll">
      
      {/* Toast popup */}
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

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Loading timesheets console...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Part A: Global Stopwatch Widget Panel */}
          <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Clock size={20} className={timerActive ? 'animate-spin' : ''} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Work stopwatch tracker</span>
                <span className="text-[9px] text-[#8c909f] mt-0.5">Track work hours dynamically and sync straight to timesheet grid.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
              {/* Select Task dropdown */}
              <select
                value={selectedTrackerTaskId}
                onChange={(e) => setSelectedTrackerTaskId(e.target.value)}
                className="bg-[#161a26] border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40 max-w-[200px] cursor-pointer"
              >
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>

              {/* Display Counter */}
              <div className="font-mono text-lg font-bold text-white px-3 py-1 bg-white/5 border border-white/5 rounded-lg">
                {formatTime(secondsElapsed)}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={toggleTimer}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    timerActive ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' : 'bg-green-500/20 border border-green-500/30 text-green-400'
                  }`}
                >
                  {timerActive ? <Pause size={13} /> : <Play size={13} />}
                  {timerActive ? 'Pause' : 'Start'}
                </button>

                <button
                  onClick={logTrackedHours}
                  disabled={secondsElapsed === 0}
                  className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-[#adc6ff] disabled:opacity-50 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} /> Log Time
                </button>
              </div>
            </div>
          </div>

          {/* Part B: Weekly hours table logging grid */}
          <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 flex flex-col gap-4">
            
            {/* Header controls */}
            <div className="flex justify-between items-center pb-3 border-b border-[#424754]/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CalendarRange size={14} className="text-[#06b6d4]" />
                Weekly Timesheet (May 25, 2026 – May 31, 2026)
              </span>

              {approvedBy ? (
                <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-green-500/20 border border-green-500/30 text-green-400 uppercase flex items-center gap-0.5">
                  <FileCheck size={10} /> Approved by Manager
                </span>
              ) : sheetSubmitted ? (
                <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 uppercase flex items-center gap-0.5 animate-pulse">
                  <AlertCircle size={10} /> Pending Manager Approval
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-white/5 border border-white/5 text-[#8c909f] uppercase">
                  Not Submitted
                </span>
              )}
            </div>

            {/* Matrix Grid */}
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#424754]/10 text-[9px] font-bold text-[#8c909f] uppercase tracking-wider">
                    <th className="py-3 pr-4 min-w-[200px]">Task Title</th>
                    <th className="py-3 px-2 text-center w-[60px]">Mon</th>
                    <th className="py-3 px-2 text-center w-[60px]">Tue</th>
                    <th className="py-3 px-2 text-center w-[60px]">Wed</th>
                    <th className="py-3 px-2 text-center w-[60px]">Thu</th>
                    <th className="py-3 px-2 text-center w-[60px]">Fri</th>
                    <th className="py-3 px-2 text-center w-[60px]">Sat</th>
                    <th className="py-3 px-2 text-center w-[60px]">Sun</th>
                    <th className="py-3 pl-4 text-right w-[80px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.taskId} className="border-b border-[#424754]/5 hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 pr-4 font-semibold text-white truncate max-w-[240px]">{row.taskTitle}</td>
                      
                      {/* Mon to Sun inputs */}
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <td key={day} className="py-3.5 px-1.5 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            disabled={sheetSubmitted}
                            value={row[day as keyof TimesheetRow] || ''}
                            onChange={(e) => handleCellChange(row.taskId, day as keyof TimesheetRow, e.target.value)}
                            className="bg-[#161a26]/40 hover:bg-[#161a26]/80 border border-[#424754]/10 disabled:opacity-50 disabled:hover:bg-[#161a26]/40 focus:border-blue-500/40 rounded px-1.5 py-1 text-center text-xs text-white outline-none w-[48px] font-mono"
                          />
                        </td>
                      ))}

                      <td className="py-3.5 pl-4 text-right font-mono font-bold text-[#adc6ff]">
                        {getRowTotal(row).toFixed(2)}h
                      </td>
                    </tr>
                  ))}

                  {/* Summary Totals Row */}
                  <tr className="font-bold text-[#adc6ff] border-t border-[#424754]/10 bg-white/[0.01]">
                    <td className="py-4 pr-4">Total Daily Hours</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('monday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('tuesday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('wednesday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('thursday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('friday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('saturday').toFixed(1)}</td>
                    <td className="py-4 px-2 text-center font-mono">{getDayTotal('sunday').toFixed(1)}</td>
                    <td className="py-4 pl-4 text-right font-mono text-green-400 text-sm">
                      {grandTotal.toFixed(2)}h
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Submission Actions */}
            {!sheetSubmitted && (
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#424754]/5">
                <button
                  onClick={submitTimesheet}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  <FileCheck size={14} /> Submit Timesheet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetPage;
