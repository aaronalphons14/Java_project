# Load Topology Lab

## Product scope
Build the requested browser-only engineering simulator and evidence tool at `/`, keeping simulation state in the browser and clearly distinguishing simulated measurements from live hardware data.

## Work
- Replace the starter screen with a compact engineering workbench, navigation for Dashboard, Probe Lab, Structural Memory, Search Space, Process, Event Log, Hardware, Benchmark, and Evidence Dossier; use the brief's neutral palette, muted blue accent, dark mode, and persistent simulation/live/stale status.
- Implement tested, separate browser-safe modules for the truss stiffness solver and fingerprints, context-aware relationship patterns and pruning verification, benchmark comparisons, serial line parsing/commands/acknowledgements, Virtual ESP32 behavior, and tamper-evident event export.
- Wire the six-member canvas visualization, load cases, tunable defects, probing, learning/pruning, safety controls, and useful views for hardware calibration/replay, benchmarks, references/claim drafts, embodiment ledger, and disclosure checklist.
- Deliver ESP32 firmware and wiring/protocol README under `firmware/`, add focused unit tests, route-specific metadata, and a lean task roadmap.

## Technical approach
- Keep app state client-side in local storage; create no cloud/database dependency.
- Keep solver, inference/pruning, benchmark, and serial/protocol logic in independent tested modules; use a single app shell with section navigation and keep the requested working experience at `/`.
- Use Web Serial only when available, with Virtual ESP32 and simulation clearly labelled as non-hardware evidence.
