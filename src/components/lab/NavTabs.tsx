import React from "react";
import {
  LayoutDashboard,
  Compass,
  BrainCircuit,
  Layers,
  GitFork,
  ScrollText,
  Cpu,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import type { LabViewId } from "./types";

interface NavTabsProps {
  currentView: LabViewId;
  onSelectView: (view: LabViewId) => void;
  prunedCount: number;
  patternsCount: number;
  eventsCount: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({
  currentView,
  onSelectView,
  prunedCount,
  patternsCount,
  eventsCount,
}) => {
  const tabs: {
    id: LabViewId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "probelab", label: "Probe Lab", icon: Compass },
    {
      id: "memory",
      label: "Structural Memory",
      icon: BrainCircuit,
      badge: patternsCount,
    },
    {
      id: "searchspace",
      label: "Search Space",
      icon: Layers,
      badge: `${prunedCount}/64`,
    },
    { id: "process", label: "Process", icon: GitFork },
    { id: "eventlog", label: "Event Log", icon: ScrollText, badge: eventsCount },
    { id: "hardware", label: "Hardware & Serial", icon: Cpu },
    { id: "benchmark", label: "Benchmark", icon: BarChart3 },
    { id: "evidence", label: "Evidence Dossier", icon: ShieldCheck },
  ];

  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectView(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium font-mono whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-400" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
