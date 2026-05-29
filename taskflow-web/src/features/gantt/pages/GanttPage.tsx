import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

interface GanttTask extends api.Task {
  startDate: string;
  durationDays: number;
  dependencies: string[]; // IDs of predecessor tasks
}

export const GanttPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStartDate, setViewStartDate] = useState<Date>(new Date(Date.now() - 3 * 86400000)); // Start viewing from 3 days ago

  const daysToShow = 18; // 18 columns in timeline view
  const rowHeight = 56;  // row height in px
  const colWidth = 60;   // day column width in px
  const taskListWidth = 240; // width of task list panel

  // Reference for sizing calculations
  const timelineContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGanttTasks = async () => {
      setLoading(true);
      try {
        let taskList: api.Task[] = [];
        try {
          taskList = await api.getTasks(projectId || '');
        } catch {
          taskList = [];
        }

        if (taskList.length === 0) {
          // Mock Gantt schedule tasks
          const mockGantt: GanttTask[] = [
            {
              id: 't-10',
              title: 'Design system tokens & variables',
              description: 'Create standard theme layout parameters',
              projectId: projectId || 'p-999',
              statusId: 's6',
              taskType: 'TASK',
              createdAt: new Date().toISOString(),
              startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
              durationDays: 3,
              dependencies: []
            },
            {
              id: 't-11',
              title: 'Database connection pools & schema init',
              description: 'Establish backend database setup',
              projectId: projectId || 'p-999',
              statusId: 's3',
              taskType: 'TASK',
              createdAt: new Date().toISOString(),
              startDate: new Date(Date.now()).toISOString(),
              durationDays: 4,
              dependencies: []
            },
            {
              id: 't-12',
              title: 'Implement Core JWT Middleware validation',
              description: 'Standardize authentication middleware',
              projectId: projectId || 'p-999',
              statusId: 's3',
              taskType: 'TASK',
              createdAt: new Date().toISOString(),
              startDate: new Date(Date.now() + 2 * 86400000).toISOString(),
              durationDays: 4,
              dependencies: ['t-10']
            },
            {
              id: 't-13',
              title: 'Deploy US-East ingress telemetry controllers',
              description: 'Expose cluster service mesh nodes',
              projectId: projectId || 'p-999',
              statusId: 's1',
              taskType: 'ISSUE',
              createdAt: new Date().toISOString(),
              startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
              durationDays: 5,
              dependencies: ['t-11', 't-12']
            },
            {
              id: 't-14',
              title: 'Conduct end-to-end integration latency validation',
              description: 'Verify system under 10k connections workload',
              projectId: projectId || 'p-999',
              statusId: 's1',
              taskType: 'TASK',
              createdAt: new Date().toISOString(),
              startDate: new Date(Date.now() + 10 * 86400000).toISOString(),
              durationDays: 3,
              dependencies: ['t-13']
            }
          ];
          setTasks(mockGantt);
        } else {
          // Adapt standard tasks to Gantt schedule format
          const adapted = taskList.map((t, idx) => ({
            ...t,
            startDate: new Date(Date.now() + (idx * 2 - 3) * 86400000).toISOString(),
            durationDays: Math.max(2, 3 + (idx % 3)),
            dependencies: idx > 0 ? [taskList[idx - 1].id] : []
          }));
          setTasks(adapted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGanttTasks();
  }, [projectId]);

  // Generate grid dates
  const gridDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(viewStartDate.getTime());
      d.setDate(viewStartDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [viewStartDate]);

  // Timeline helper positions
  const getTaskCoordinates = (task: GanttTask) => {
    const startDate = new Date(task.startDate);
    const duration = task.durationDays;

    // Find index of start date
    const startMs = startDate.setHours(0, 0, 0, 0);
    const timelineStartMs = new Date(viewStartDate).setHours(0, 0, 0, 0);

    const diffDays = (startMs - timelineStartMs) / 86400000;

    const x = diffDays * colWidth;
    const width = duration * colWidth;

    return { x, width };
  };

  // Adjust timeline scroll viewport
  const shiftTimeline = (days: number) => {
    const newStart = new Date(viewStartDate.getTime());
    newStart.setDate(viewStartDate.getDate() + days);
    setViewStartDate(newStart);
  };

  // Pre-calculate coordinates for svg connection path lines drawing
  const taskCoordinatesMap = useMemo(() => {
    const coords: Record<string, { x: number; y: number; width: number }> = {};
    tasks.forEach((t, index) => {
      const { x, width } = getTaskCoordinates(t);
      const y = index * rowHeight + rowHeight / 2; // vertical center line of row
      coords[t.id] = { x, y, width };
    });
    return coords;
  }, [tasks, viewStartDate]);

  // Create SVG path lines connecting predecessors to successors
  const dependencyLines = useMemo(() => {
    const paths: Array<{ d: string; id: string }> = [];
    tasks.forEach((t) => {
      t.dependencies.forEach((depId) => {
        const fromCoord = taskCoordinatesMap[depId];
        const toCoord = taskCoordinatesMap[t.id];

        if (fromCoord && toCoord) {
          // Draw standard step line paths:
          // Start from end of predecessor: (fromCoord.x + fromCoord.width, fromCoord.y)
          // End at start of successor: (toCoord.x, toCoord.y)
          const startX = fromCoord.x + fromCoord.width;
          const startY = fromCoord.y;
          const endX = toCoord.x;
          const endY = toCoord.y;

          // Orthogonal connector steps:
          // Move to start, line horizontally halfway, line vertically to target row, line horizontally to target start.
          const midX = startX + (endX - startX) / 2;
          const pathString = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

          paths.push({
            d: pathString,
            id: `${depId}-to-${t.id}`
          });
        }
      });
    });
    return paths;
  }, [tasks, taskCoordinatesMap]);

  return (
    <div className="p-6 h-full flex flex-col min-w-0 bg-[#0b0f19]">

      {/* Top action controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-[#3b82f6]" />
          <span className="text-xs font-semibold text-[#adc6ff]">Timeline range switcher</span>
        </div>

        <div className="flex items-center gap-2 bg-[#161a26]/40 border border-[#424754]/20 rounded-lg p-1">
          <button
            onClick={() => shiftTimeline(-3)}
            className="p-1 hover:bg-white/5 rounded text-[#c2c6d6] transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-bold text-white px-2 uppercase tracking-wide">
            {gridDates[0]?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {gridDates[gridDates.length - 1]?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => shiftTimeline(3)}
            className="p-1 hover:bg-white/5 rounded text-[#c2c6d6] transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Plotting timelines grid...
        </div>
      ) : (
        <div className="flex-1 border border-[#424754]/10 rounded-xl bg-[#0f131d]/20 overflow-hidden flex flex-row">

          {/* Column A: Left side list panel */}
          <div
            className="border-r border-[#424754]/10 bg-[#0f131d]/60 flex flex-col shrink-0"
            style={{ width: taskListWidth }}
          >
            {/* Headers row */}
            <div className="h-12 border-b border-[#424754]/10 flex items-center px-4 text-[10px] font-bold text-[#8c909f] uppercase tracking-wider">
              Project Schedule Task Titles
            </div>

            {/* List entries */}
            <div className="flex-1 flex flex-col">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="px-4 border-b border-[#424754]/5 flex items-center text-xs font-semibold text-white truncate hover:bg-white/[0.01]"
                  style={{ height: rowHeight }}
                >
                  <span className="truncate flex flex-col">
                    <span className="truncate">{task.title}</span>
                    <span className="text-[9px] text-[#8c909f] font-mono mt-0.5">#{task.id}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Right side scrolling timelines */}
          <div className="flex-1 overflow-x-auto custom-scroll flex flex-col relative">

            {/* Dates Grid Header */}
            <div className="h-12 border-b border-[#424754]/10 flex select-none bg-[#0f131d]/40 flex-row relative shrink-0" style={{ width: daysToShow * colWidth }}>
              {gridDates.map((date, idx) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center border-r border-[#424754]/5 shrink-0 ${isToday ? 'bg-blue-500/10' : ''
                      }`}
                    style={{ width: colWidth }}
                  >
                    <span className={`text-[8px] font-bold ${isToday ? 'text-[#3b82f6]' : 'text-[#8c909f]'}`}>
                      {date.toLocaleDateString(undefined, { weekday: 'short' }).charAt(0)}
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${isToday ? 'text-[#3b82f6]' : 'text-white'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Content Rows & Connections Overlay */}
            <div
              ref={timelineContentRef}
              className="flex-1 relative shrink-0"
              style={{ width: daysToShow * colWidth, height: tasks.length * rowHeight }}
            >
              {/* Vertical dotted grid lines background helper */}
              <div className="absolute inset-0 pointer-events-none flex flex-row">
                {gridDates.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-full border-r border-[#424754]/5 shrink-0"
                    style={{ width: colWidth }}
                  />
                ))}
              </div>

              {/* Dotted horizontal row boundary lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {tasks.map((_, idx) => (
                  <div
                    key={idx}
                    className="border-b border-[#424754]/5 w-full shrink-0"
                    style={{ height: rowHeight }}
                  />
                ))}
              </div>

              {/* SVG Overlay representing connections dependency arrows */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill="#3b82f6" opacity="0.6" />
                  </marker>
                </defs>

                {dependencyLines.map((line) => (
                  <path
                    key={line.id}
                    d={line.d}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                    markerEnd="url(#arrow)"
                    className="transition-all duration-300"
                  />
                ))}
              </svg>

              {/* Task duration rectangular bars */}
              {tasks.map((t, index) => {
                const { x, width } = getTaskCoordinates(t);
                const isBlocked = t.statusId === 's5'; // Blocked status
                const isDone = t.statusId === 's6';    // Completed status

                // Hide if bar is fully out of viewport dimensions
                if (x + width < 0 || x > daysToShow * colWidth) return null;

                return (
                  <div
                    key={t.id}
                    className={`absolute flex items-center justify-between px-3 rounded-lg border text-[10px] font-bold text-white shadow-lg overflow-hidden transition-all select-none hover:brightness-110 cursor-pointer ${isBlocked ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                        isDone ? 'bg-green-500/20 border-green-500/40 text-green-300' :
                          'bg-blue-500/20 border-blue-500/40 text-[#adc6ff]'
                      }`}
                    style={{
                      left: Math.max(0, x),
                      width: Math.min(daysToShow * colWidth - x, width),
                      height: 32,
                      top: index * rowHeight + (rowHeight - 32) / 2
                    }}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="font-mono text-[9px] shrink-0 opacity-75">{t.durationDays}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttPage;
