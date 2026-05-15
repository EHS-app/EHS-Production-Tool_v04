/** LED System Designer.
 *
 *  v1 of the node-based system architecture editor lives under the LED
 *  Screen Report tab. Producers drag screens, processors, fiber boxes
 *  (CVT10 Pro-S) and power supplies onto a canvas and connect them with
 *  cables. Each cable carries a real-world distance (m) so the engine
 *  can flag "CAT-6 over 90 m → fiber required" or "fiber over 300 m →
 *  exceeds limit", count ports against a processor's capacity, and roll
 *  up a flat equipment / cable bill of materials.
 *
 *  All units are SI (metres, watts). React Flow is rendered with these
 *  same node ids / coordinates so persistence is a one-way write of
 *  exactly this shape — no separate "graph state".
 */

import {
  NOVASTAR_PROCESSOR_CATALOG,
  type NovastarProcessorModel,
} from "./led";

// ─── Defaults ─────────────────────────────────────────────────────────

/** Hard limits used by the warning engine. Producers can override per
 *  system in case they're running a non-standard cable spec. */
export type LedSystemCableLimits = {
  /** Max copper distance for signal cabling (CAT-6e/A) before the
   *  engine recommends a fiber converter. 90 m is the IEEE-spec safe
   *  ceiling for PoE-capable runs at gigabit. */
  catMaxM: number;
  /** Max single-mode fiber distance the engine considers normal for
   *  this product. Beyond this we flag a warning even if a fiber link
   *  is in use. */
  fiberMaxM: number;
  /** Output ports on a CVT10 Pro-S fiber converter (the "10" in the
   *  product name). Used to detect over-fanout from a single box. */
  cvtPorts: number;
};

export const DEFAULT_CABLE_LIMITS: LedSystemCableLimits = {
  catMaxM: 90,
  fiberMaxM: 300,
  cvtPorts: 10,
};

// ─── Node + Edge model ────────────────────────────────────────────────

export type LedSystemNodeKind =
  | "screen"
  | "processor"
  | "fiberbox"
  | "psu"
  // ── Phase 4 — touring topology nodes ─────────────────────────
  // Each new kind is independently optional in persistence; the
  // sanitizer adds them to NODE_KINDS so legacy v1 blobs continue
  // to load without these. Renderers default to the existing card
  // chrome when no kind-specific UI ships yet.
  | "media-server"
  | "network-switch"
  | "ups"
  | "powerdistro"
  | "genlock";

/** Base shape every node carries. Each `kind` extends this with its
 *  own optional fields — kept on a single shape (not a discriminated
 *  union) so v2 fields can be added without breaking persisted v1
 *  blobs. The sanitizer below is whitelist-based, so anything not
 *  named here is dropped on load (intentional — invalid cable kinds
 *  or bogus pixel counts cannot survive a round-trip). */
export type LedSystemNode = {
  id: string;
  kind: LedSystemNodeKind;
  x: number;
  y: number;
  /** Display label. Defaults to the node kind + ordinal at create time. */
  label: string;

  // ── Processor-specific ───────────────────────────────────────────
  /** Novastar model id when the producer picks a known box. `null`
   *  / undefined means "generic / other" — capacity checks are
   *  skipped in that case. */
  processorModel?: NovastarProcessorModel | null;
  /** Marks a processor as a hot-spare. Only affects metric grouping
   *  ("with backup" vs "without backup") in v1. */
  isBackup?: boolean;

  // ── Screen-specific ──────────────────────────────────────────────
  /** Optional id of an `LedScreen` from the parent state. When set,
   *  the engine pulls live pixel counts from that screen so the system
   *  view stays in sync as panels change. */
  screenRefId?: string | null;
  /** Manual override pixel count when no `screenRefId` is set. */
  pixelsW?: number;
  pixelsH?: number;

  // ── PSU-specific ─────────────────────────────────────────────────
  /** PSU phase count (single- or three-phase feed). */
  psuPhases?: 1 | 3;
  /** Per-phase amperage of the PSU breaker / supply. */
  psuAmps?: number;

  /** Free-form note shown in the inspector panel. */
  notes?: string;
};

export type LedSystemEdgeKind = "signal" | "fiber" | "power";

export type LedSystemEdge = {
  id: string;
  source: string;
  target: string;
  /** What kind of cable this represents — drives colour + which limit
   *  the engine checks against. */
  kind: LedSystemEdgeKind;
  /** Real-world cable run length in metres. 0 = "not yet measured". */
  distanceM: number;
  /** Optional human label (e.g. "PSU-A → Pole 4"). */
  label?: string;
  // ── Phase 3-4 — edge metadata. All optional + back-compat. ────
  /** Mark this cable as redundant backup (A/B feed). Drives a
   *  dashed/secondary render in the canvas overlay. */
  isBackup?: boolean;
  /** Optional bandwidth label (e.g. "10G", "25G") surfaced in
   *  tooltips on fiber edges. */
  bandwidth?: string;
};

export type LedSystem = {
  /** Indoor installations have looser power-derating; outdoor sites
   *  often need extra weatherproofing. v1 just stores the flag — the
   *  engine surfaces it on the metrics card so the producer remembers. */
  indoor: boolean;
  nodes: LedSystemNode[];
  edges: LedSystemEdge[];
  /** React Flow viewport (pan / zoom). Persisted so a reload keeps
   *  the producer where they left off. */
  viewport?: { x: number; y: number; zoom: number };
  cableLimits?: LedSystemCableLimits;
};

export const EMPTY_LED_SYSTEM: LedSystem = {
  indoor: true,
  nodes: [],
  edges: [],
};

// ─── Persistence sanitization ─────────────────────────────────────────

const NODE_KINDS: ReadonlySet<LedSystemNodeKind> = new Set([
  "screen",
  "processor",
  "fiberbox",
  "psu",
  "media-server",
  "network-switch",
  "ups",
  "powerdistro",
  "genlock",
]);
const EDGE_KINDS: ReadonlySet<LedSystemEdgeKind> = new Set([
  "signal",
  "fiber",
  "power",
]);

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const optStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

function sanitizeNode(raw: unknown): LedSystemNode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return null;
  const kind = o.kind;
  if (typeof kind !== "string" || !NODE_KINDS.has(kind as LedSystemNodeKind)) {
    return null;
  }
  const node: LedSystemNode = {
    id: o.id,
    kind: kind as LedSystemNodeKind,
    x: num(o.x),
    y: num(o.y),
    label: typeof o.label === "string" ? o.label : kind,
  };
  if (typeof o.processorModel === "string") {
    node.processorModel = o.processorModel as NovastarProcessorModel;
  } else if (o.processorModel === null) {
    node.processorModel = null;
  }
  if (typeof o.isBackup === "boolean") node.isBackup = o.isBackup;
  if (typeof o.screenRefId === "string") node.screenRefId = o.screenRefId;
  else if (o.screenRefId === null) node.screenRefId = null;
  if (typeof o.pixelsW === "number") node.pixelsW = num(o.pixelsW);
  if (typeof o.pixelsH === "number") node.pixelsH = num(o.pixelsH);
  if (o.psuPhases === 1 || o.psuPhases === 3) node.psuPhases = o.psuPhases;
  if (typeof o.psuAmps === "number") node.psuAmps = num(o.psuAmps);
  const notes = optStr(o.notes);
  if (notes) node.notes = notes;
  return node;
}

function sanitizeEdge(
  raw: unknown,
  knownIds: Set<string>,
): LedSystemEdge | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return null;
  if (typeof o.source !== "string" || !knownIds.has(o.source)) return null;
  if (typeof o.target !== "string" || !knownIds.has(o.target)) return null;
  const kind = o.kind;
  if (typeof kind !== "string" || !EDGE_KINDS.has(kind as LedSystemEdgeKind)) {
    return null;
  }
  const edge: LedSystemEdge = {
    id: o.id,
    source: o.source,
    target: o.target,
    kind: kind as LedSystemEdgeKind,
    distanceM: Math.max(0, num(o.distanceM)),
  };
  const label = optStr(o.label);
  if (label) edge.label = label;
  if (typeof o.isBackup === "boolean") edge.isBackup = o.isBackup;
  const bandwidth = optStr(o.bandwidth);
  if (bandwidth) edge.bandwidth = bandwidth;
  return edge;
}

export function normalizeLedSystem(raw: unknown): LedSystem {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LED_SYSTEM };
  const o = raw as Record<string, unknown>;
  const nodes = Array.isArray(o.nodes)
    ? o.nodes.map(sanitizeNode).filter((n): n is LedSystemNode => n !== null)
    : [];
  const knownIds = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(o.edges)
    ? o.edges
        .map((e) => sanitizeEdge(e, knownIds))
        .filter((e): e is LedSystemEdge => e !== null)
    : [];
  let viewport: LedSystem["viewport"];
  if (o.viewport && typeof o.viewport === "object") {
    const v = o.viewport as Record<string, unknown>;
    viewport = { x: num(v.x), y: num(v.y), zoom: num(v.zoom, 1) || 1 };
  }
  let cableLimits: LedSystemCableLimits | undefined;
  if (o.cableLimits && typeof o.cableLimits === "object") {
    const c = o.cableLimits as Record<string, unknown>;
    cableLimits = {
      catMaxM: num(c.catMaxM, DEFAULT_CABLE_LIMITS.catMaxM),
      fiberMaxM: num(c.fiberMaxM, DEFAULT_CABLE_LIMITS.fiberMaxM),
      cvtPorts: num(c.cvtPorts, DEFAULT_CABLE_LIMITS.cvtPorts),
    };
  }
  return {
    indoor: typeof o.indoor === "boolean" ? o.indoor : true,
    nodes,
    edges,
    viewport,
    cableLimits,
  };
}

export function newNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `lsn-${crypto.randomUUID()}`;
  }
  return `lsn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newEdgeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `lse-${crypto.randomUUID()}`;
  }
  return `lse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Metrics engine ───────────────────────────────────────────────────

export type LedSystemWarningLevel = "warn" | "danger";

export type LedSystemWarning = {
  id: string;
  level: LedSystemWarningLevel;
  /** Optional node id this warning attaches to (for highlight). */
  nodeId?: string;
  /** Optional edge id this warning attaches to (for highlight). */
  edgeId?: string;
  message: string;
};

export type LedSystemProcessorMetric = {
  nodeId: string;
  label: string;
  model: NovastarProcessorModel | null;
  isBackup: boolean;
  /** Catalog-stated number of output ports. `null` for "other". */
  portCapacity: number | null;
  /** Outgoing signal + fiber edges from this processor. */
  portsUsed: number;
  /** Catalog-stated max pixels driven by this processor. `null` for "other". */
  pixelCapacity: number | null;
  /** Sum of pixels of every screen reachable from this processor in
   *  the connection graph (signal + fiber + chained CVT10 hops). */
  pixelsUsed: number;
  /** Count of distinct screens this processor feeds. */
  screensFed: number;
};

export type LedSystemMetrics = {
  counts: {
    screens: number;
    processors: number;
    backupProcessors: number;
    fiberBoxes: number;
    psus: number;
  };
  cables: {
    signalM: number;
    fiberM: number;
    powerM: number;
    signalCount: number;
    fiberCount: number;
    powerCount: number;
    /** Sum of every edge's distance regardless of kind. */
    totalM: number;
  };
  /** Total pixel demand across every screen on the canvas (no de-dup). */
  pixelsTotal: number;
  /** Total power demand in kilowatts (rough — based on PSU sizing). */
  psuKw: number;
  processors: LedSystemProcessorMetric[];
  warnings: LedSystemWarning[];
};

/** Resolve the pixel count of a screen-kind node. Refs to a real
 *  `LedScreen` win over manual overrides so the system view stays
 *  honest about what's actually connected — the caller passes a
 *  precomputed `screenPixelsById` map (built via `computeScreenMetrics`
 *  + panel resolution) so this lib stays free of panel logic. */
function pixelsForScreenNode(
  node: LedSystemNode,
  screenPixelsById: Map<string, number>,
): number {
  if (node.screenRefId) {
    const ref = screenPixelsById.get(node.screenRefId);
    if (typeof ref === "number" && ref > 0) return ref;
  }
  const w = num(node.pixelsW);
  const h = num(node.pixelsH);
  return w * h;
}

/** Adjacency map for the connection graph. Treats every cable as
 *  bidirectional for the purpose of "what does this processor reach"
 *  — we only care that there's a wired path. Power edges are excluded
 *  so PSU loops don't contaminate signal-graph traversals. */
function buildSignalAdjacency(
  edges: LedSystemEdge[],
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (e.kind !== "signal" && e.kind !== "fiber") continue;
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  return adj;
}

export function computeLedSystemMetrics(
  system: LedSystem,
  /** Map of LedScreen.id → total pixel count (panel grid × panel
   *  pitch). Built by the caller via `computeScreenMetrics`. */
  screenPixelsById: Map<string, number>,
): LedSystemMetrics {
  const limits = system.cableLimits ?? DEFAULT_CABLE_LIMITS;
  const nodesById = new Map(system.nodes.map((n) => [n.id, n]));

  // Counts
  const counts = {
    screens: 0,
    processors: 0,
    backupProcessors: 0,
    fiberBoxes: 0,
    psus: 0,
  };
  for (const n of system.nodes) {
    if (n.kind === "screen") counts.screens += 1;
    else if (n.kind === "processor") {
      if (n.isBackup) counts.backupProcessors += 1;
      else counts.processors += 1;
    } else if (n.kind === "fiberbox") counts.fiberBoxes += 1;
    else if (n.kind === "psu") counts.psus += 1;
  }

  // Cable totals + warnings
  const cables = {
    signalM: 0,
    fiberM: 0,
    powerM: 0,
    signalCount: 0,
    fiberCount: 0,
    powerCount: 0,
    totalM: 0,
  };
  const warnings: LedSystemWarning[] = [];
  for (const e of system.edges) {
    cables.totalM += e.distanceM;
    if (e.kind === "signal") {
      cables.signalM += e.distanceM;
      cables.signalCount += 1;
      if (e.distanceM > limits.catMaxM) {
        warnings.push({
          id: `w-${e.id}-cat`,
          level: "danger",
          edgeId: e.id,
          message: `Signal cable ${e.distanceM} m exceeds the ${limits.catMaxM} m copper limit — switch to fiber + CVT10 Pro-S.`,
        });
      }
    } else if (e.kind === "fiber") {
      cables.fiberM += e.distanceM;
      cables.fiberCount += 1;
      if (e.distanceM > limits.fiberMaxM) {
        warnings.push({
          id: `w-${e.id}-fiber`,
          level: "warn",
          edgeId: e.id,
          message: `Fiber run ${e.distanceM} m exceeds the recommended ${limits.fiberMaxM} m budget — verify SFP optical reach.`,
        });
      }
    } else if (e.kind === "power") {
      cables.powerM += e.distanceM;
      cables.powerCount += 1;
    }
  }

  // PSU totals (rough W = V × A × phases; assume 230 V Norway feed)
  const NOMINAL_V = 230;
  let psuW = 0;
  for (const n of system.nodes) {
    if (n.kind !== "psu") continue;
    const amps = num(n.psuAmps);
    const phases = n.psuPhases === 3 ? 3 : 1;
    psuW += NOMINAL_V * amps * phases;
  }

  // Pixel total + per-processor metrics
  const adj = buildSignalAdjacency(system.edges);
  let pixelsTotal = 0;
  for (const n of system.nodes) {
    if (n.kind !== "screen") continue;
    pixelsTotal += pixelsForScreenNode(n, screenPixelsById);
  }

  // Detect CVT10 fan-out. Edge directionality on the canvas is up to
  // the producer (React Flow lets them drag either way), so we count
  // signal edges touching a fiberbox whose OTHER endpoint is a screen
  // — same direction-agnostic rule the BFS below uses for pixel
  // reachability, so the metrics never contradict each other.
  for (const fb of system.nodes.filter((n) => n.kind === "fiberbox")) {
    const fanout = system.edges.filter((e) => {
      if (e.kind !== "signal") return false;
      if (e.source !== fb.id && e.target !== fb.id) return false;
      const otherId = e.source === fb.id ? e.target : e.source;
      const other = nodesById.get(otherId);
      return other?.kind === "screen";
    }).length;
    if (fanout > limits.cvtPorts) {
      warnings.push({
        id: `w-${fb.id}-fanout`,
        level: "danger",
        nodeId: fb.id,
        message: `${fb.label} drives ${fanout} screens — exceeds CVT10 Pro-S ${limits.cvtPorts}-port capacity.`,
      });
    }
  }

  const processors: LedSystemProcessorMetric[] = [];
  for (const proc of system.nodes.filter((n) => n.kind === "processor")) {
    const cat = proc.processorModel
      ? NOVASTAR_PROCESSOR_CATALOG[proc.processorModel]
      : null;
    const portCapacity = cat?.outputs ?? null;
    const pixelCapacity = cat?.maxPixels ?? null;

    // Signal + fiber edges touching this processor on either end.
    // Direction-agnostic so the producer can drag connections either
    // way and still get a consistent ports vs. pixels read-out.
    const portsUsed = system.edges.filter(
      (e) =>
        (e.source === proc.id || e.target === proc.id) &&
        (e.kind === "signal" || e.kind === "fiber"),
    ).length;

    // BFS over the signal/fiber adjacency from this processor; sum
    // pixels of every screen reached. Ignores PSU edges. Caps at the
    // node count so a stray cycle can't loop forever (we're using a
    // visited set anyway).
    let pixelsUsed = 0;
    let screensFed = 0;
    const visited = new Set<string>([proc.id]);
    const queue: string[] = [proc.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const next of adj.get(cur) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        const nNode = nodesById.get(next);
        if (!nNode) continue;
        // Stop traversal at other processors so we don't double-count
        // shared backbones across redundant paths.
        if (nNode.kind === "processor") continue;
        if (nNode.kind === "screen") {
          pixelsUsed += pixelsForScreenNode(nNode, screenPixelsById);
          screensFed += 1;
        }
        queue.push(next);
      }
    }

    if (portCapacity !== null && portsUsed > portCapacity) {
      warnings.push({
        id: `w-${proc.id}-ports`,
        level: "danger",
        nodeId: proc.id,
        message: `${proc.label} has ${portsUsed} cables on ${portCapacity} ports — over-subscribed.`,
      });
    }
    if (pixelCapacity !== null && pixelsUsed > pixelCapacity) {
      warnings.push({
        id: `w-${proc.id}-px`,
        level: "danger",
        nodeId: proc.id,
        message: `${proc.label} drives ${pixelsUsed.toLocaleString()} px — exceeds catalog max ${pixelCapacity.toLocaleString()} px.`,
      });
    } else if (
      pixelCapacity !== null &&
      pixelsUsed > pixelCapacity * 0.9 &&
      pixelsUsed > 0
    ) {
      warnings.push({
        id: `w-${proc.id}-px-near`,
        level: "warn",
        nodeId: proc.id,
        message: `${proc.label} at ${Math.round((pixelsUsed / pixelCapacity) * 100)} % of pixel capacity.`,
      });
    }

    processors.push({
      nodeId: proc.id,
      label: proc.label,
      model: proc.processorModel ?? null,
      isBackup: !!proc.isBackup,
      portCapacity,
      portsUsed,
      pixelCapacity,
      pixelsUsed,
      screensFed,
    });
  }

  // Orphaned-screen warning: a screen-kind node with zero signal/fiber
  // edges is almost certainly an unfinished diagram, so surface it.
  for (const n of system.nodes) {
    if (n.kind !== "screen") continue;
    const hasFeed = system.edges.some(
      (e) =>
        (e.source === n.id || e.target === n.id) &&
        (e.kind === "signal" || e.kind === "fiber"),
    );
    if (!hasFeed) {
      warnings.push({
        id: `w-${n.id}-orphan`,
        level: "warn",
        nodeId: n.id,
        message: `${n.label} has no signal feed.`,
      });
    }
  }

  return {
    counts,
    cables,
    pixelsTotal,
    psuKw: psuW / 1000,
    processors,
    warnings,
  };
}
