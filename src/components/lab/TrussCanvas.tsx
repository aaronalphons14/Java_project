import React, { useMemo } from "react";
import {
  MEMBER_ENDPOINTS,
  MEMBER_NAMES,
  NODE_NAMES,
  NODE_POSITIONS,
  LOAD_CASES,
  type LoadCaseId,
  type SolveResult,
  type Defect,
} from "@/lib/lab/solver";

interface TrussCanvasProps {
  mask: number;
  activeLoadCase: LoadCaseId;
  solveNominal: SolveResult | null;
  solveRealized: SolveResult | null;
  defects?: Defect[];
  showDeformed?: boolean;
  amplification?: number;
  onToggleMember?: (memberIndex: number) => void;
  onRestoreNominal?: () => void;
  interactive?: boolean;
  highlightDefects?: boolean;
  className?: string;
}

export const TrussCanvas: React.FC<TrussCanvasProps> = ({
  mask,
  activeLoadCase,
  solveNominal,
  solveRealized,
  defects = [],
  showDeformed = true,
  amplification = 40000,
  onToggleMember,
  onRestoreNominal,
  interactive = true,
  highlightDefects = true,
  className = "",
}) => {
  // SVG coordinate system:
  // Truss coordinates are [0,0] (J1 bottom-left) to [1,1] (J3 top-right).
  // In SVG, Y is down, so we map Y=0 to y_svg=320, and Y=1 to y_svg=80.
  // X=0 to x_svg=90, X=1 to x_svg=330.
  const width = 420;
  const height = 400;
  const paddingX = 100;
  const paddingY = 80;
  const spanX = width - 2 * paddingX; // 220
  const spanY = height - 2 * paddingY; // 240

  const toSvgX = (x: number) => paddingX + x * spanX;
  const toSvgY = (y: number) => height - paddingY - y * spanY;

  const currentLoadCase = useMemo(
    () => LOAD_CASES.find((lc) => lc.id === activeLoadCase) ?? LOAD_CASES[0]!,
    [activeLoadCase]
  );

  const isStable = Boolean(solveRealized?.stable ?? solveNominal?.stable ?? false);
  const activeMemberCount = useMemo(
    () => Array.from({ length: 6 }).filter((_, i) => Boolean(mask & (1 << i))).length,
    [mask]
  );

  // Compute deformed node positions if available (with strict visual bounds clamping)
  const deformedNodes = useMemo(() => {
    const disp = solveRealized?.displacement ?? solveNominal?.displacement;
    return NODE_POSITIONS.map(([x, y], i) => {
      if (!showDeformed || !disp || !isStable) return [toSvgX(x), toSvgY(y)] as [number, number];
      const maxVisualOffset = 0.15; // At most 15% of span offset
      const rawDx = (disp[2 * i] ?? 0) * amplification;
      const rawDy = (disp[2 * i + 1] ?? 0) * amplification;
      const dx = Math.max(-maxVisualOffset, Math.min(maxVisualOffset, rawDx));
      const dy = Math.max(-maxVisualOffset, Math.min(maxVisualOffset, rawDy));
      return [toSvgX(x + dx), toSvgY(y + dy)] as [number, number];
    });
  }, [solveRealized, solveNominal, showDeformed, amplification, isStable]);

  const undeformedNodes = useMemo(() => {
    return NODE_POSITIONS.map(([x, y]) => [toSvgX(x), toSvgY(y)] as [number, number]);
  }, []);

  return (
    <div className={`relative flex flex-col items-center select-none overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[380px] drop-shadow-md overflow-hidden"
        aria-label="Six-member planar truss visualization"
      >
        <defs>
          {/* Force vector arrow marker */}
          <marker
            id="force-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
          </marker>
          <filter id="glow-defect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid pattern background */}
        <g opacity="0.12" stroke="currentColor">
          <line x1={paddingX} y1={20} x2={paddingX} y2={height - 20} strokeDasharray="3 3" />
          <line x1={width - paddingX} y1={20} x2={width - paddingX} y2={height - 20} strokeDasharray="3 3" />
          <line x1={20} y1={paddingY} x2={width - 20} y2={paddingY} strokeDasharray="3 3" />
          <line x1={20} y1={height - paddingY} x2={width - 20} y2={height - 20} strokeDasharray="3 3" />
        </g>

        {/* Undeformed ghost structure */}
        {showDeformed && (
          <g opacity="0.25">
            {MEMBER_ENDPOINTS.map(([a, b], i) => {
              const nodeA = undeformedNodes[a]!;
              const nodeB = undeformedNodes[b]!;
              return (
                <line
                  key={`ghost-${i}`}
                  x1={nodeA[0]}
                  y1={nodeA[1]}
                  x2={nodeB[0]}
                  y2={nodeB[1]}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })}
          </g>
        )}

        {/* Members */}
        {MEMBER_ENDPOINTS.map(([a, b], i) => {
          const isActive = Boolean(mask & (1 << i));
          const nodeA = deformedNodes[a]!;
          const nodeB = deformedNodes[b]!;
          const midX = (nodeA[0] + nodeB[0]) / 2;
          const midY = (nodeA[1] + nodeB[1]) / 2;

          const load = solveRealized?.loads[i] ?? solveNominal?.loads[i] ?? 0;
          const fp = solveRealized?.fingerprint[i] ?? solveNominal?.fingerprint[i] ?? 0;
          const isTension = load > 0.1;
          const isCompression = load < -0.1;

          const defectOnMember = defects.find(
            (d) => d.enabled && d.member === i && d.loadCases.includes(activeLoadCase)
          );

          // Member stroke color
          let strokeColor = "#475569"; // default inactive/neutral
          let strokeWidth = isActive ? 5 : 2;
          let strokeDash = isActive ? "none" : "6 4";

          if (isActive) {
            if (isTension) strokeColor = "#38bdf8"; // bright cyan
            else if (isCompression) strokeColor = "#fb923c"; // warm orange
            else strokeColor = "#94a3b8";
          }

          if (defectOnMember && highlightDefects) {
            strokeColor = "#f59e0b"; // amber alert
          }

          return (
            <g
              key={`member-${i}`}
              className={interactive ? "cursor-pointer group" : ""}
              onClick={() => interactive && onToggleMember?.(i)}
            >
              {/* Hit area */}
              <line
                x1={nodeA[0]}
                y1={nodeA[1]}
                x2={nodeB[0]}
                y2={nodeB[1]}
                stroke="transparent"
                strokeWidth="22"
              />

              {/* Visible Member Line */}
              <line
                x1={nodeA[0]}
                y1={nodeA[1]}
                x2={nodeB[0]}
                y2={nodeB[1]}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                strokeLinecap="round"
                filter={defectOnMember ? "url(#glow-defect)" : undefined}
                className="transition-all duration-300"
              />

              {/* Member label tag */}
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x="-16"
                  y="-11"
                  width="32"
                  height="22"
                  rx="4"
                  fill="#0f172a"
                  stroke={isActive ? strokeColor : "#334155"}
                  strokeWidth="1.5"
                  className="transition-colors group-hover:stroke-sky-400"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={isActive ? "#f8fafc" : "#64748b"}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {MEMBER_NAMES[i]}
                </text>
              </g>

              {/* Force readout if active and loaded */}
              {isActive && Math.abs(load) > 0.05 && (
                <text
                  x={midX + (i === 4 ? -26 : i === 5 ? 26 : 0)}
                  y={midY + (i === 0 ? 22 : i === 2 ? -16 : 14)}
                  textAnchor="middle"
                  fill={isTension ? "#38bdf8" : "#fb923c"}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  className="pointer-events-none drop-shadow"
                >
                  {load > 0 ? "+" : ""}
                  {load.toFixed(1)} N ({(fp * 100).toFixed(0)}%)
                </text>
              )}
            </g>
          );
        })}

        {/* Boundary Support: J1 pinned (triangle) */}
        {(() => {
          const [j1x, j1y] = undeformedNodes[0]!;
          return (
            <g transform={`translate(${j1x}, ${j1y})`}>
              <polygon
                points="0,0 -12,18 12,18"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
              />
              <line x1="-16" y1="20" x2="16" y2="20" stroke="#475569" strokeWidth="2" />
              <line x1="-12" y1="24" x2="-8" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="-4" y1="24" x2="0" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="4" y1="24" x2="8" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="12" y1="24" x2="16" y2="20" stroke="#475569" strokeWidth="1.5" />
            </g>
          );
        })()}

        {/* Boundary Support: J2 roller */}
        {(() => {
          const [j2x, j2y] = undeformedNodes[1]!;
          return (
            <g transform={`translate(${j2x}, ${j2y})`}>
              <polygon
                points="0,0 -12,14 12,14"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
              />
              <circle cx="-6" cy="18" r="3" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <circle cx="6" cy="18" r="3" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1="-16" y1="23" x2="16" y2="23" stroke="#475569" strokeWidth="2" />
            </g>
          );
        })()}

        {/* Load Vector Arrow at J3 */}
        {(() => {
          const [j3x, j3y] = deformedNodes[2]!;
          const fx = currentLoadCase.force[0];
          const fy = currentLoadCase.force[1];
          const mag = Math.hypot(fx, fy);
          if (mag <= 0) return null;
          const arrowLength = 55;
          const dirX = (fx / mag) * arrowLength;
          // SVG Y is inverted
          const dirY = -(fy / mag) * arrowLength;
          const startX = j3x - dirX;
          const startY = j3y - dirY;

          return (
            <g className="animate-pulse">
              <line
                x1={startX}
                y1={startY}
                x2={j3x}
                y2={j3y}
                stroke="#ef4444"
                strokeWidth="3.5"
                markerEnd="url(#force-arrow)"
              />
              <text
                x={startX - (dirX > 0 ? 12 : -12)}
                y={startY + (dirY > 0 ? 14 : -10)}
                fill="#f87171"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor={dirX > 0 ? "end" : "start"}
              >
                {currentLoadCase.id}: {mag} N
              </text>
            </g>
          );
        })()}

        {/* Nodes */}
        {NODE_POSITIONS.map((_, i) => {
          const [nx, ny] = deformedNodes[i]!;
          const isLoaded = i === 2;
          return (
            <g key={`node-${i}`} transform={`translate(${nx}, ${ny})`}>
              <circle
                cx="0"
                cy="0"
                r={isLoaded ? "8" : "7"}
                fill="#0f172a"
                stroke={isLoaded ? "#ef4444" : "#e2e8f0"}
                strokeWidth="2.5"
                className="transition-all"
              />
              <text
                x={i === 0 || i === 3 ? -14 : 14}
                y={i === 0 || i === 1 ? 16 : -14}
                textAnchor={i === 0 || i === 3 ? "end" : "start"}
                fill="#94a3b8"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {NODE_NAMES[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Mechanism / Unconstrained Topology Warning Overlay */}
      {!isStable && (
        <div className="absolute top-1/3 inset-x-4 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-slate-950/95 border border-amber-600/80 p-3 rounded-xl text-center font-mono text-xs max-w-sm shadow-2xl pointer-events-auto backdrop-blur">
            <span className="text-amber-400 font-bold block mb-1">
              ⚠️ UNCONSTRAINED MECHANISM ({activeMemberCount}/6 Active)
            </span>
            <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
              {activeMemberCount === 0
                ? "All member locks released. The frame has 0 load capacity."
                : "Current member arrangement is statically unstable and cannot resist force."}
            </p>
            {onRestoreNominal && (
              <button
                onClick={onRestoreNominal}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Restore Nominal Topology (#55)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Legend / Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-300 mt-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 bg-sky-400 rounded-full" />
          <span>Tension (+)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 bg-amber-400 rounded-full" />
          <span>Compression (−)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 border-b border-dashed border-slate-400" />
          <span>Released / Inactive</span>
        </span>
        {interactive && (
          <span className="text-slate-400 italic">Click member tag to lock/release</span>
        )}
      </div>
    </div>
  );
};
