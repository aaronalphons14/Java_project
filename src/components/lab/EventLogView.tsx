import React, { useState, useEffect, useMemo } from "react";
import {
  ScrollText,
  Download,
  Trash2,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  createLogExport,
  downloadFile,
  sha256,
  type LabEvent,
} from "@/lib/lab/storage";

interface EventLogViewProps {
  events: LabEvent[];
  onClearEvents: () => void;
  onAddEvent: (event: Omit<LabEvent, "id" | "timestamp">) => void;
}

export const EventLogView: React.FC<EventLogViewProps> = ({
  events,
  onClearEvents,
  onAddEvent,
}) => {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [provenanceHash, setProvenanceHash] = useState<string>("computing...");
  const [copiedHash, setCopiedHash] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute live SHA-256 audit seal
  useEffect(() => {
    let isCurrent = true;
    sha256(JSON.stringify(events)).then((hash) => {
      if (isCurrent) setProvenanceHash(hash);
    });
    return () => {
      isCurrent = false;
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filterSource !== "all" && evt.source !== filterSource) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          evt.type.toLowerCase().includes(q) ||
          evt.message.toLowerCase().includes(q) ||
          evt.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, filterSource, searchQuery]);

  const handleExport = async () => {
    const logExport = await createLogExport(events);
    const json = JSON.stringify(logExport, null, 2);
    downloadFile(
      `load-topology-event-log-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json"
    );
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(provenanceHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Cryptographic Seal Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sky-400" />
            TAMPER-EVIDENT AUDIT TRAIL & EVENT LOG
          </h2>
          <p className="text-xs text-slate-400">
            Chronological cryptographic ledger tracking all topology state shifts, sensor readings, and rule inductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="eventlog-export-btn"
            onClick={handleExport}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Verifiable Log</span>
          </button>

          <button
            onClick={onClearEvents}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 font-mono text-xs cursor-pointer border border-slate-700"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SHA-256 Provenance Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">SHA-256 AUDIT SEAL:</span>
            <code className="text-sky-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-all">
              {provenanceHash}
            </code>
          </div>
        </div>

        <button
          onClick={handleCopyHash}
          className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer text-[11px]"
        >
          {copiedHash ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Hash</span>
            </>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Source Filter:</span>
            {["all", "sim", "hardware", "system"].map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer uppercase ${
                  filterSource === src
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search event messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 px-2">Timestamp</th>
                <th className="py-2 px-2">Source</th>
                <th className="py-2 px-2">Event Type</th>
                <th className="py-2 px-2">Message</th>
                <th className="py-2 px-2 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.map((evt) => {
                const isExpanded = expandedId === evt.id;
                return (
                  <React.Fragment key={evt.id}>
                    <tr
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isExpanded ? "bg-slate-800/50" : ""
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                    >
                      <td className="py-2 px-2 text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            evt.source === "hardware"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : evt.source === "sim"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {evt.source}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-200">{evt.type}</td>
                      <td className="py-2 px-2 text-slate-300 max-w-md truncate">
                        {evt.message}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {evt.data ? (
                          <span className="text-[10px] text-sky-400 font-semibold underline">
                            {isExpanded ? "Hide JSON" : "View JSON"}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && Boolean(evt.data) && (
                      <tr className="bg-slate-950">
                        <td colSpan={5} className="p-3">
                          <pre className="text-[11px] font-mono text-sky-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-48">
                            {JSON.stringify(evt.data, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-500 italic">
                    No matching events found in audit log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
