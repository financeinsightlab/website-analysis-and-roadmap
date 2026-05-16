import { useState, useEffect } from "react";
import { initiatives as rawData } from "./data/roadmap";

type TaskStatus = "not-started" | "started" | "in-progress" | "completed" | "paused";

const STORAGE_KEY = "geoseolab-roadmap-v3";

function load(): typeof rawData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return rawData;
}
function save(d: typeof rawData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

const ownerColor: Record<string, string> = {
  Sumit: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30 border-indigo-500/20",
  Anubhav: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30 border-emerald-500/20",
  Ditya: "bg-pink-500/15 text-pink-300 ring-pink-400/30 border-pink-500/20",
};

const statusStyle: Record<string, string> = {
  Planned: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  "In Progress": "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  Blocked: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  Done: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
};

const TASK_STATUSES: { value: TaskStatus; label: string; style: string; dot: string }[] = [
  { value: "not-started", label: "Not Started", style: "bg-slate-500/20 text-slate-400 ring-slate-500/30 hover:bg-slate-500/30", dot: "bg-slate-500" },
  { value: "started",     label: "Started",     style: "bg-blue-500/20 text-blue-300 ring-blue-500/30 hover:bg-blue-500/30",   dot: "bg-blue-400" },
  { value: "in-progress", label: "In Progress", style: "bg-amber-500/20 text-amber-300 ring-amber-500/30 hover:bg-amber-500/30", dot: "bg-amber-400" },
  { value: "completed",   label: "Completed",   style: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/30", dot: "bg-emerald-400" },
  { value: "paused",      label: "Paused",      style: "bg-rose-500/20 text-rose-300 ring-rose-500/30 hover:bg-rose-500/30",   dot: "bg-rose-400" },
];

export default function App() {
  const [data, setData] = useState(load());
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ i: string; p: number; d: number } | null>(null);
  const [editing, setEditing] = useState<{ i: string; p: number; d: number; t: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [adding, setAdding] = useState<{ i: string; p: number; d: number } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => save(data), [data]);

  const filtered = data.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.phases.some(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.days.some(
            (d) =>
              d.label.toLowerCase().includes(search.toLowerCase()) ||
              d.tasks.some((t) => t.title.toLowerCase().includes(search.toLowerCase()))
          )
      )
  );

  const allTasks = data.flatMap((i) => i.phases.flatMap((p) => p.days.flatMap((d) => d.tasks)));
  const doneCount = allTasks.filter((t) => t.status === "completed").length;
  const pct = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;

  const togglePhase = (k: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const toggleDay = (i: string, p: number, d: number) =>
    setSelectedDay((prev) => (prev?.i === i && prev.p === p && prev.d === d) ? null : { i, p, d });

  const setTaskStatus = (i: string, pi: number, di: number, ti: number, newStatus: TaskStatus) =>
    setData((prev) => prev.map((init) => {
      if (init.id !== i) return init;
      const phases = init.phases.map((ph, idx) => {
        if (idx !== pi) return ph;
        const days = ph.days.map((dy, idx2) => {
          if (idx2 !== di) return dy;
          const tasks = dy.tasks.map((tk, idx3) =>
            idx3 !== ti ? tk : { ...tk, status: newStatus }
          );
          return { ...dy, tasks };
        });
        return { ...ph, days };
      });
      return { ...init, phases };
    }));

  const updateNotes = (i: string, pi: number, di: number, ti: number, notes: string) =>
    setData((prev) => prev.map((init) => {
      if (init.id !== i) return init;
      const phases = init.phases.map((ph, idx) => {
        if (idx !== pi) return ph;
        const days = ph.days.map((dy, idx2) => {
          if (idx2 !== di) return dy;
          const tasks = dy.tasks.map((tk, idx3) =>
            idx3 !== ti ? tk : { ...tk, notes }
          );
          return { ...dy, tasks };
        });
        return { ...ph, days };
      });
      return { ...init, phases };
    }));

  const toggleNotes = (key: string) =>
    setExpandedNotes((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const startEdit = (i: string, p: number, d: number, t: number) => {
    const tk = data.find((x) => x.id === i)?.phases[p].days[d].tasks[t];
    if (tk) { setEditing({ i, p, d, t }); setEditText(tk.title); }
  };

  const saveEdit = () => {
    if (!editing) return;
    const { i, p, d, t } = editing;
    setData((prev) => prev.map((init) => {
      if (init.id !== i) return init;
      const phases = init.phases.map((ph, pi) => {
        if (pi !== p) return ph;
        const days = ph.days.map((dy, di) => {
          if (di !== d) return dy;
          const tasks = dy.tasks.map((tk, ti) => ti === t ? { ...tk, title: editText } : tk);
          return { ...dy, tasks };
        });
        return { ...ph, days };
      });
      return { ...init, phases };
    }));
    setEditing(null);
  };

  const deleteTask = (i: string, p: number, d: number, t: number) =>
    setData((prev) => prev.map((init) => {
      if (init.id !== i) return init;
      const phases = init.phases.map((ph, pi) => {
        if (pi !== p) return ph;
        const days = ph.days.map((dy, di) => {
          if (di !== d) return dy;
          return { ...dy, tasks: dy.tasks.filter((_, ti) => ti !== t) };
        });
        return { ...ph, days };
      });
      return { ...init, phases };
    }));

  const addTask = () => {
    if (!adding || !newTaskTitle.trim()) return;
    const { i, p, d } = adding;
    setData((prev) => prev.map((init) => {
      if (init.id !== i) return init;
      const phases = init.phases.map((ph, pi) => {
        if (pi !== p) return ph;
        const days = ph.days.map((dy, di) => {
          if (di !== d) return dy;
          return {
            ...dy,
            tasks: [...dy.tasks, {
              id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title: newTaskTitle.trim(),
              description: "",
              where: "",
              example: "",
              status: "not-started" as TaskStatus,
              notes: "",
            }],
          };
        });
        return { ...ph, days };
      });
      return { ...init, phases };
    }));
    setAdding(null);
    setNewTaskTitle("");
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-500/30">
      {/* ─── TOP BAR ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#070b14]/80 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400 hover:text-white text-xl leading-none">☰</button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/20">G</div>
            <div className="hidden sm:block">
              <div className="text-white font-semibold text-sm leading-none">GeoSeoLab Blueprint</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Operational Playbook</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <input
              type="text"
              placeholder="Search tasks, phases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 sm:w-56 lg:w-72 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
            <div className="hidden md:flex items-center gap-2 text-xs shrink-0">
              <span className="text-slate-500">{doneCount}/{allTasks.length}</span>
              <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-cyan-300 font-medium">{pct}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex">
        {/* ─── SIDEBAR ── */}
        <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-[53px] left-0 z-40 w-72 h-[calc(100vh-53px)] bg-[#0a0f1e] border-r border-white/5 overflow-y-auto transition-transform duration-300`}>
          <nav className="p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-3">5 Pillars from your sheet</div>
            {data.map((i) => {
              const tasks = i.phases.flatMap((p) => p.days.flatMap((d) => d.tasks));
              const done = tasks.filter((t) => t.status === "completed").length;
              return (
                <button
                  key={i.id}
                  onClick={() => { setActiveId(activeId === i.id ? null : i.id); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 ${activeId === i.id ? "bg-white/10 border border-white/10" : "hover:bg-white/5 border border-transparent"}`}
                >
                  <span className="text-lg">{i.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{i.shortTitle}</div>
                    <div className="text-[10px] text-slate-500">{done}/{tasks.length} tasks · {i.lead}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ring-1 shrink-0 ${ownerColor[i.lead]}`}>{i.lead}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-3">Quick Reference</div>
              {["Directories & Listings", "Review Platforms", "Google My Business", "AI/LLM Platforms", "Social Channels"].map((l) => (
                <div key={l} className="w-full text-left px-3 py-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition">{l}</div>
              ))}
            </div>
          </nav>
        </aside>

        {sidebarOpen && <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />}

        {/* ─── MAIN ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
              { l: "Initiatives", v: "5", s: "Strategic pillars" },
              { l: "Scope", v: "-", s: "Execution window" },
              { l: "Total Tasks", v: `${allTasks.length}`, s: `${doneCount} completed` },
              { l: "Team", v: "3", s: "Sumit · Anubhav · Ditya" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">{s.l}</div>
                <div className="text-2xl font-bold text-white mt-1">{s.v}</div>
                <div className="text-[11px] text-slate-500">{s.s}</div>
              </div>
            ))}
          </div>

          {/* ─── INITIATIVE CARDS ─── */}
          {filtered.map((i) => (
            <article key={i.id} id={i.id} className="mb-10 scroll-mt-20">
              <div className={`rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden ring-1 ${i.ring}`}>
                {/* Color stripe */}
                <div className={`h-1.5 bg-gradient-to-r ${i.color}`} />
                <div className="p-5 sm:p-7">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${i.color} flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-black/30 shrink-0`}>{i.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
                          <span>ROW {i.row}</span>
                        </div>
                        <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mt-1 leading-tight">{i.title}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-lg ring-1 ${statusStyle[i.status]}`}>{i.status}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-lg ring-1 ${ownerColor[i.lead]}`}>Lead: {i.lead}</span>
                      {i.collaborators.map((c) => (
                        <span key={c} className={`text-[11px] px-2 py-0.5 rounded-lg ring-1 ${ownerColor[c]}`}>+ {c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Why + Objective */}
                  <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mt-5">
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 sm:p-4">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Why This Matters</div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{i.why}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 sm:p-4">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Objective</div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{i.objective}</p>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="mt-4 sm:mt-5">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Target KPIs</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                      {i.kpis.map((k) => (
                        <div key={k.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 sm:p-3">
                          <div className="text-[11px] text-slate-400">{k.label}</div>
                          <div className={`mt-1 text-base sm:text-lg font-bold bg-gradient-to-r ${i.color} bg-clip-text text-transparent`}>{k.target}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="mt-3 sm:mt-4">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Tools & Resources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {i.tools.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Dependencies & Risks */}
                  {(i.dependencies.length > 0 || i.risks.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      {i.dependencies.length > 0 && (
                        <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Dependencies</div>
                          <ul className="space-y-0.5">{i.dependencies.map((d) => <li key={d} className="text-xs text-slate-300 flex gap-1.5"><span className="text-slate-500">→</span>{d}</li>)}</ul>
                        </div>
                      )}
                      {i.risks.length > 0 && (
                        <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-rose-400 mb-1">Risks</div>
                          <ul className="space-y-0.5">{i.risks.map((r) => <li key={r} className="text-xs text-slate-300 flex gap-1.5"><span className="text-rose-500">⚠</span>{r}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── PHASES ─── */}
                  <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                    {i.phases.map((phase, pIdx) => {
                      const key = `${i.id}-p${pIdx}`;
                      const isOpen = expanded.has(key);
                      const phaseTasks = phase.days.flatMap((d) => d.tasks);
                      const phaseDone = phaseTasks.filter((t) => t.status === "completed").length;
                      const phasePct = phaseTasks.length ? Math.round((phaseDone / phaseTasks.length) * 100) : 0;

                      return (
                        <div key={key} className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                          {/* Phase header */}
                          <button onClick={() => togglePhase(key)} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.03] transition">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${i.color} flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0`}>{pIdx + 1}</div>
                              <div className="text-left min-w-0">
                                <div className="text-sm sm:text-base text-white font-semibold truncate">{phase.name}</div>
                                <div className="text-[11px] text-slate-500">{phase.weeks ? `${phase.weeks} · ` : ''}{phaseTasks.length} tasks</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-16 sm:w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r ${i.color} rounded-full transition-all`} style={{ width: `${phasePct}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{phasePct}%</span>
                              </div>
                              <span className="text-slate-500 text-sm">{isOpen ? "▾" : "▸"}</span>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-white/5">
                              {phase.days.map((day, dIdx) => {
                                const dayDone = day.tasks.filter((t) => t.status === "completed").length;
                                const isSel = selectedDay?.i === i.id && selectedDay.p === pIdx && selectedDay.d === dIdx;

                                return (
                                  <div key={dIdx} className="border-t border-white/5 first:border-t-0">
                                    <button onClick={() => toggleDay(i.id, pIdx, dIdx)} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.02] transition">
                                      <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white/5 flex items-center justify-center text-[10px] sm:text-xs font-mono text-slate-400 shrink-0">•</div>
                                        <div className="text-left min-w-0">
                                          <div className="text-xs sm:text-sm text-slate-200 truncate">{day.label}</div>
                                          <div className="text-[10px] text-slate-500">{day.tasks.length} tasks · {dayDone} done</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {dayDone > 0 && <span className="text-[11px] text-emerald-400 hidden sm:inline">✓ {dayDone}/{day.tasks.length}</span>}
                                        <span className="text-slate-500 text-sm">{isSel ? "▾" : "▸"}</span>
                                      </div>
                                    </button>

                                    {isSel && (
                                      <div className="px-3 sm:px-4 pb-4 space-y-2">
                                        {day.tasks.map((task, tIdx) => {
                                          const isEd = editing?.i === i.id && editing.p === pIdx && editing.d === dIdx && editing.t === tIdx;
                                          const noteKey = `${i.id}-${pIdx}-${dIdx}-${tIdx}`;
                                          const noteOpen = expandedNotes.has(noteKey);
                                          const activeStatus = TASK_STATUSES.find(s => s.value === task.status)!;
                                          return (
                                            <div key={task.id} className="rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition overflow-hidden">
                                              {/* Task header */}
                                              <div className="flex items-start gap-2 sm:gap-3 p-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${activeStatus.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                  {isEd ? (
                                                    <div className="flex gap-2">
                                                      <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500" onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus />
                                                      <button onClick={saveEdit} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 shrink-0">Save</button>
                                                      <button onClick={() => setEditing(null)} className="text-xs px-2 py-1 bg-white/10 text-slate-300 rounded hover:bg-white/20 shrink-0">✕</button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-start justify-between gap-2">
                                                      <span className={`text-xs sm:text-sm leading-snug ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</span>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => startEdit(i.id, pIdx, dIdx, tIdx)} className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400 hover:text-white" title="Edit">✎</button>
                                                        <button onClick={() => deleteTask(i.id, pIdx, dIdx, tIdx)} className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400 hover:text-rose-300" title="Delete">✕</button>
                                                      </div>
                                                    </div>
                                                  )}
                                                  {task.description && <div className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-line">{task.description}</div>}
                                                  {task.where && (
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">Where:</span>
                                                      <span className="text-xs text-slate-300">{task.where}</span>
                                                    </div>
                                                  )}
                                                  {task.example && (
                                                    <div className="mt-2 rounded-lg bg-white/[0.03] border border-white/5 p-2 sm:p-3">
                                                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-medium">Example / Template:</span>
                                                      <pre className="text-[11px] sm:text-xs text-slate-300 mt-1 whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">{task.example}</pre>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Status pills */}
                                              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                                                {TASK_STATUSES.map(s => (
                                                  <button
                                                    key={s.value}
                                                    onClick={() => setTaskStatus(i.id, pIdx, dIdx, tIdx, s.value)}
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 transition-all ${
                                                      task.status === s.value
                                                        ? s.style + " scale-105 shadow-sm"
                                                        : "bg-white/[0.03] text-slate-500 ring-white/10 hover:bg-white/10 hover:text-slate-300"
                                                    }`}
                                                  >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${task.status === s.value ? s.dot : "bg-slate-600"}`} />
                                                    {s.label}
                                                  </button>
                                                ))}
                                              </div>

                                              {/* Notes section */}
                                              <div className="px-3 pb-3">
                                                <button
                                                  onClick={() => toggleNotes(noteKey)}
                                                  className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition mb-1"
                                                >
                                                  <span>{noteOpen ? "▾" : "▸"}</span>
                                                  <span>{noteOpen ? "Hide Notes" : task.notes ? "📝 View Notes" : "+ Add Notes"}</span>
                                                </button>
                                                {noteOpen && (
                                                  <textarea
                                                    value={task.notes ?? ""}
                                                    onChange={(e) => updateNotes(i.id, pIdx, dIdx, tIdx, e.target.value)}
                                                    placeholder="Write your notes, links, observations, or anything relevant here..."
                                                    rows={4}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 resize-y leading-relaxed"
                                                  />
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Add task */}
                                        {adding?.i === i.id && adding.p === pIdx && adding.d === dIdx ? (
                                          <div className="flex gap-2 p-2 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5">
                                            <input
                                              value={newTaskTitle}
                                              onChange={(e) => setNewTaskTitle(e.target.value)}
                                              placeholder="Task title..."
                                              className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                              onKeyDown={(e) => e.key === "Enter" && addTask()}
                                              autoFocus
                                            />
                                            <button onClick={addTask} className="text-xs px-3 py-1 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 shrink-0">Add</button>
                                            <button onClick={() => { setAdding(null); setNewTaskTitle(""); }} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-slate-300 shrink-0">Cancel</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setAdding({ i: i.id, p: pIdx, d: dIdx })} className="w-full py-2 rounded-lg border border-dashed border-white/10 text-xs text-slate-500 hover:text-slate-300 hover:border-white/20 transition">
                                            + Add Custom Task
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <div className="text-3xl mb-3">🔍</div>
              <div className="text-lg">No matching tasks found</div>
              <div className="text-sm mt-1">Try a different search term</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
