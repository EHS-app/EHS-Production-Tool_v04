import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  computeLedSystemMetrics,
  newEdgeId,
  newNodeId,
  type LedSystem,
  type LedSystemEdge,
  type LedSystemEdgeKind,
  type LedSystemNode,
  type LedSystemNodeKind,
} from "../lib/ledSystem";
import {
  NOVASTAR_PROCESSOR_OPTIONS,
  type LedScreen,
  type NovastarProcessorModel,
} from "../lib/led";

// ─── Styling tokens ───────────────────────────────────────────────────
//
// The designer uses inline style objects so it doesn't have to ship
// extra CSS through index.css for v1. Colours match the EHS dark
// palette referenced in replit.md (#1C1C24 base, #25252F surface,
// #f88000 accent) and align with the React Flow viewport background.

const NODE_KIND_THEME: Record<
  LedSystemNodeKind,
  { label: string; emoji: string; accent: string }
> = {
  screen: { label: "Screen", emoji: "▦", accent: "#3B82F6" },
  processor: { label: "Processor", emoji: "⚙︎", accent: "#F88000" },
  fiberbox: { label: "CVT10 Pro-S", emoji: "✶", accent: "#A855F7" },
  psu: { label: "Power Supply", emoji: "⚡", accent: "#EF4444" },
  // Phase 4 — touring topology nodes. Same chrome, new accents.
  "media-server": { label: "Media Server", emoji: "▶", accent: "#10B981" },
  "network-switch": { label: "Network Switch", emoji: "⇄", accent: "#0EA5E9" },
  ups: { label: "UPS", emoji: "🔋", accent: "#EAB308" },
  powerdistro: { label: "Power Distro", emoji: "⌁", accent: "#DC2626" },
  genlock: { label: "Genlock", emoji: "⊙", accent: "#8B5CF6" },
};

const EDGE_KIND_THEME: Record<
  LedSystemEdgeKind,
  { label: string; color: string; dash?: string }
> = {
  signal: { label: "Signal (CAT-6)", color: "#F88000" },
  fiber: { label: "Fiber", color: "#3B82F6", dash: "6 4" },
  power: { label: "Power", color: "#EF4444", dash: "2 4" },
};

// ─── Custom node component ────────────────────────────────────────────

type NodeData = {
  node: LedSystemNode;
  pixels: number;
  selected?: boolean;
  hasWarning?: boolean;
};

function SystemNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const { node, pixels, hasWarning } = data;
  const theme = NODE_KIND_THEME[node.kind];
  const subtitle = (() => {
    if (node.kind === "screen") {
      if (pixels > 0) return `${pixels.toLocaleString()} px`;
      return "no pixel data";
    }
    if (node.kind === "processor") {
      const modelName = node.processorModel
        ? (NOVASTAR_PROCESSOR_OPTIONS.find(
            (o) => o.model === node.processorModel,
          )?.name ?? "Other")
        : "Other";
      return node.isBackup ? `${modelName} · Backup` : modelName;
    }
    if (node.kind === "fiberbox") return "Fiber converter";
    if (node.kind === "psu") {
      const a = node.psuAmps ?? 0;
      const ph = node.psuPhases ?? 1;
      return a > 0 ? `${a} A · ${ph}-phase` : "Sized in inspector";
    }
    return "";
  })();

  const ringColor = hasWarning
    ? "#EF4444"
    : selected
      ? "#F88000"
      : theme.accent;

  return (
    <div
      style={{
        background: "#25252F",
        color: "#F4F4F5",
        border: `1.5px solid ${ringColor}`,
        boxShadow: selected
          ? `0 0 0 3px rgba(248,128,0,0.25), 0 6px 16px rgba(0,0,0,0.45)`
          : "0 4px 12px rgba(0,0,0,0.4)",
        borderRadius: 10,
        minWidth: 160,
        padding: "10px 12px",
        fontSize: 12,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: theme.accent,
          width: 10,
          height: 10,
          border: "2px solid #1C1C24",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            background: theme.accent,
            color: "#0F0F14",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {theme.emoji}
        </span>
        <span style={{ fontWeight: 600, flex: 1, lineHeight: 1.2 }}>
          {node.label}
        </span>
        {hasWarning && (
          <span
            title="See warnings"
            style={{
              color: "#EF4444",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ⚠
          </span>
        )}
      </div>
      <div
        style={{
          color: "#A1A1AA",
          fontSize: 11,
          lineHeight: 1.3,
        }}
      >
        {subtitle}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: theme.accent,
          width: 10,
          height: 10,
          border: "2px solid #1C1C24",
        }}
      />
    </div>
  );
}

// ─── Custom edge component ────────────────────────────────────────────
//
// Coloured + dashed per cable kind, with the distance shown inline so
// the producer can read the cable plan at a glance without opening
// the inspector.

function SystemEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps & { data?: { edge: LedSystemEdge; hasWarning?: boolean } }) {
  const edge = data?.edge;
  if (!edge) return null;
  const theme = EDGE_KIND_THEME[edge.kind];
  const stroke = data?.hasWarning ? "#EF4444" : theme.color;
  const dash = theme.dash;
  // Bezier curve to keep things readable when nodes overlap. Same maths
  // React Flow uses internally for the default smoothstep edge.
  const midX = (sourceX + targetX) / 2;
  const path = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  const labelX = midX;
  const labelY = (sourceY + targetY) / 2;
  return (
    <g>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={selected ? 3 : 2}
        strokeDasharray={dash}
      />
      <foreignObject
        x={labelX - 32}
        y={labelY - 12}
        width={64}
        height={24}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            background: "#1C1C24",
            color: "#F4F4F5",
            border: `1px solid ${stroke}`,
            borderRadius: 999,
            fontSize: 10,
            fontFamily: "system-ui",
            padding: "1px 8px",
            textAlign: "center",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          {edge.distanceM > 0 ? `${edge.distanceM} m` : "—"}
        </div>
      </foreignObject>
    </g>
  );
}

// ─── Top-level component ──────────────────────────────────────────────

const NODE_TYPES = { system: SystemNode };
const EDGE_TYPES = { system: SystemEdge };

type Props = {
  system: LedSystem;
  onChange: (next: LedSystem) => void;
  /** Existing screens from the LED report. Used to pixel-resolve
   *  screen-kind nodes that are linked by `screenRefId`, and to power
   *  the screen-link dropdown in the inspector. */
  screens: LedScreen[];
  /** Map of LedScreen.id → total pixels. Built by App.tsx via
   *  `computeScreenMetrics`. */
  screenPixelsById: Map<string, number>;
};

export function LedSystemDesigner(props: Props) {
  return (
    <ReactFlowProvider>
      <DesignerInner {...props} />
    </ReactFlowProvider>
  );
}

function DesignerInner({ system, onChange, screens, screenPixelsById }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pendingEdgeKind, setPendingEdgeKind] =
    useState<LedSystemEdgeKind>("signal");
  const flowRef = useRef<ReactFlowInstance | null>(null);

  // Live metrics derived from the persisted system + the up-to-date
  // pixel map. Recomputed every render — cheap (single pass over
  // edges + BFS per processor) and avoids stale-closure bugs.
  const metrics = useMemo(
    () => computeLedSystemMetrics(system, screenPixelsById),
    [system, screenPixelsById],
  );

  const warningNodeIds = useMemo(() => {
    const s = new Set<string>();
    for (const w of metrics.warnings) if (w.nodeId) s.add(w.nodeId);
    return s;
  }, [metrics.warnings]);
  const warningEdgeIds = useMemo(() => {
    const s = new Set<string>();
    for (const w of metrics.warnings) if (w.edgeId) s.add(w.edgeId);
    return s;
  }, [metrics.warnings]);

  // ── Persisted-shape ↔ React-Flow translation ───────────────────────
  //
  // React Flow needs to OWN the live `nodes` / `edges` arrays it
  // renders so it can stamp internal fields onto them — most
  // importantly `measured: {width, height}`, which gets written after
  // the first layout pass and is what tells RF the node is "ready to
  // drag". If we recomputed the arrays from props each render via
  // `useMemo`, those internal fields got thrown away on every re-
  // render and the second drag attempt threw "node is not initialized"
  // → uncaught runtime error in production. So we keep a local state
  // mirror, apply ALL React Flow changes to it (positions + dimensions
  // + selection), and reconcile from the persisted system in an effect
  // that preserves any RF-stamped fields on nodes whose id we've seen
  // before. Position commits flow back to the persisted system on
  // drag-stop only — not on every drag tick — so autosave and undo
  // stay sane.

  const buildNodeData = useCallback(
    (n: LedSystemNode): NodeData => ({
      node: n,
      pixels:
        n.kind === "screen"
          ? n.screenRefId
            ? (screenPixelsById.get(n.screenRefId) ?? 0)
            : (n.pixelsW ?? 0) * (n.pixelsH ?? 0)
          : 0,
      selected: n.id === selectedNodeId,
      hasWarning: warningNodeIds.has(n.id),
    }),
    [screenPixelsById, selectedNodeId, warningNodeIds],
  );

  const [rfNodes, setRfNodes] = useState<Node<NodeData>[]>(() =>
    system.nodes.map((n) => ({
      id: n.id,
      type: "system",
      position: { x: n.x, y: n.y },
      data: buildNodeData(n),
    })),
  );
  const [rfEdges, setRfEdges] = useState<Edge[]>(() =>
    system.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "system",
      selected: e.id === selectedEdgeId,
      data: { edge: e, hasWarning: warningEdgeIds.has(e.id) },
    })),
  );

  // ── Reconciliation: split into two effects on purpose ──────────────
  //
  // Effect A (structural) runs only when persisted node identity or
  // coordinates change. It adds new ids, drops missing ids, and pulls
  // in fresh persisted positions — but it skips position writes for
  // any node RF currently flags as `dragging`, so a mid-drag
  // unrelated re-render (selection, screen-pixel recompute, autosave
  // round-trip) cannot snap a node back to its old persisted position
  // before the user has dropped it. Existing RF internals
  // (`measured`, `width`, `height`) are preserved by spreading the
  // previous node first.
  //
  // Effect B (data-only) runs on selection / warning / pixel changes
  // and refreshes only `data`. It never touches `position`,
  // `measured`, or `dragging`, so it cannot race with an in-progress
  // drag. This separation is what fixes the snap-back race a code
  // review caught after the first drag-bug repair.
  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return system.nodes.map((n) => {
        const existing = prevById.get(n.id);
        if (existing) {
          return {
            ...existing,
            position: existing.dragging
              ? existing.position
              : { x: n.x, y: n.y },
          };
        }
        return {
          id: n.id,
          type: "system",
          position: { x: n.x, y: n.y },
          data: buildNodeData(n),
        } satisfies Node<NodeData>;
      });
    });
    // Intentionally only depends on `system.nodes` — `buildNodeData`
    // is read for first-mount node creation, but pulling it into the
    // dep array would re-run this effect (and overwrite drag
    // positions) on every selection change. New-node hydration of
    // `data` is best-effort here; effect B will refresh it on the
    // very next pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.nodes]);

  useEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) => ({ ...n, data: buildNodeData(n.data.node) })),
    );
  }, [buildNodeData]);

  useEffect(() => {
    setRfEdges((prev) => {
      const prevById = new Map(prev.map((e) => [e.id, e]));
      return system.edges.map((e) => {
        const existing = prevById.get(e.id);
        const base: Edge = existing
          ? { ...existing, source: e.source, target: e.target }
          : { id: e.id, source: e.source, target: e.target, type: "system" };
        return {
          ...base,
          selected: e.id === selectedEdgeId,
          data: { edge: e, hasWarning: warningEdgeIds.has(e.id) },
        };
      });
    });
  }, [system.edges, selectedEdgeId, warningEdgeIds]);

  // ── Mutations ──────────────────────────────────────────────────────

  const updateNodes = useCallback(
    (mutator: (nodes: LedSystemNode[]) => LedSystemNode[]) => {
      onChange({ ...system, nodes: mutator(system.nodes) });
    },
    [system, onChange],
  );
  const updateEdges = useCallback(
    (mutator: (edges: LedSystemEdge[]) => LedSystemEdge[]) => {
      onChange({ ...system, edges: mutator(system.edges) });
    },
    [system, onChange],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<NodeData>>[]) => {
      // Apply EVERY change to the local mirror so RF's internal
      // bookkeeping (dimensions, selection) survives across renders.
      setRfNodes((prev) => applyNodeChanges(changes, prev));
      // Commit position to the persisted system only when a drag has
      // ended (`dragging: false`). Mid-drag updates would thrash
      // autosave and the project-list cache for no benefit.
      const drops = changes.filter(
        (c): c is Extract<NodeChange<Node<NodeData>>, { type: "position" }> =>
          c.type === "position" &&
          c.dragging === false &&
          c.position !== undefined,
      );
      if (drops.length === 0) return;
      const dropsById = new Map(drops.map((d) => [d.id, d.position!]));
      let dirty = false;
      const nextNodes = system.nodes.map((n) => {
        const p = dropsById.get(n.id);
        if (!p) return n;
        if (p.x === n.x && p.y === n.y) return n;
        dirty = true;
        return { ...n, x: p.x, y: p.y };
      });
      if (dirty) onChange({ ...system, nodes: nextNodes });
    },
    [system, onChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Apply locally first so RF's internal selection / animation
      // state stays consistent.
      setRfEdges((prev) => applyEdgeChanges(changes, prev));
      const removeIds = new Set(
        changes
          .filter((c): c is { id: string; type: "remove" } => c.type === "remove")
          .map((c) => c.id),
      );
      if (removeIds.size === 0) return;
      updateEdges((edges) => edges.filter((e) => !removeIds.has(e.id)));
      if (selectedEdgeId && removeIds.has(selectedEdgeId)) {
        setSelectedEdgeId(null);
      }
    },
    [updateEdges, selectedEdgeId],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const newEdge: LedSystemEdge = {
        id: newEdgeId(),
        source: conn.source,
        target: conn.target,
        kind: pendingEdgeKind,
        distanceM: 0,
      };
      updateEdges((edges) => [...edges, newEdge]);
      setSelectedEdgeId(newEdge.id);
      // Mirror into local RF state so the new edge appears immediately
      // even before the reconcile effect fires on the next render.
      setRfEdges((prev) =>
        addEdge(
          { ...conn, id: newEdge.id, type: "system" } as Connection,
          prev,
        ),
      );
    },
    [pendingEdgeKind, updateEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, conn: Connection) => {
      if (!conn.source || !conn.target) return;
      updateEdges((edges) =>
        edges.map((e) =>
          e.id === oldEdge.id
            ? { ...e, source: conn.source!, target: conn.target! }
            : e,
        ),
      );
      setRfEdges((prev) => reconnectEdge(oldEdge, conn, prev));
    },
    [updateEdges],
  );

  const onMoveEnd = useCallback(
    (_evt: unknown, vp: Viewport) => {
      // Persist the viewport so the producer comes back to the same
      // pan / zoom on reload. Compared cheaply to skip no-op writes.
      const cur = system.viewport;
      if (cur && cur.x === vp.x && cur.y === vp.y && cur.zoom === vp.zoom) {
        return;
      }
      onChange({ ...system, viewport: vp });
    },
    [system, onChange],
  );

  // ── Toolbar actions ────────────────────────────────────────────────

  const addNode = useCallback(
    (kind: LedSystemNodeKind, extra?: Partial<LedSystemNode>) => {
      const inst = flowRef.current;
      // Drop near the centre of the current viewport so it lands in
      // the producer's view regardless of pan / zoom. Falls back to
      // the canvas origin if React Flow hasn't initialised yet.
      const center = inst
        ? inst.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          })
        : { x: 80, y: 80 };
      // Ordinal label: "Screen 3" etc.
      const ordinal =
        system.nodes.filter((n) => n.kind === kind).length + 1;
      const label = extra?.label ?? `${NODE_KIND_THEME[kind].label} ${ordinal}`;
      const node: LedSystemNode = {
        id: newNodeId(),
        kind,
        x: center.x - 80,
        y: center.y - 30,
        label,
        ...extra,
      };
      updateNodes((nodes) => [...nodes, node]);
      setSelectedNodeId(node.id);
    },
    [system.nodes, updateNodes],
  );

  const removeNode = useCallback(
    (id: string) => {
      onChange({
        ...system,
        nodes: system.nodes.filter((n) => n.id !== id),
        edges: system.edges.filter((e) => e.source !== id && e.target !== id),
      });
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [system, onChange, selectedNodeId],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<LedSystemNode>) => {
      updateNodes((nodes) =>
        nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      );
    },
    [updateNodes],
  );

  const updateEdge = useCallback(
    (id: string, patch: Partial<LedSystemEdge>) => {
      updateEdges((edges) =>
        edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [updateEdges],
  );

  const removeEdge = useCallback(
    (id: string) => {
      updateEdges((edges) => edges.filter((e) => e.id !== id));
      if (selectedEdgeId === id) setSelectedEdgeId(null);
    },
    [updateEdges, selectedEdgeId],
  );

  // Sync the React-Flow viewport when it changes from upstream — e.g.
  // a project load / switch swaps in a different LedSystem while the
  // LED tab is still mounted, and we want to land on that project's
  // saved pan/zoom. Local pans flow through `onMoveEnd` → `onChange`,
  // which keeps `system.viewport` byte-equal to the live RF viewport,
  // so this effect is a no-op on user drags (no fight, no flicker).
  const persistedVp = system.viewport;
  const lastSyncedVp = useRef<Viewport | null>(null);
  useEffect(() => {
    if (!persistedVp || !flowRef.current) return;
    const last = lastSyncedVp.current;
    if (
      last &&
      last.x === persistedVp.x &&
      last.y === persistedVp.y &&
      last.zoom === persistedVp.zoom
    ) {
      return;
    }
    flowRef.current.setViewport(persistedVp);
    lastSyncedVp.current = persistedVp;
  }, [persistedVp]);

  const selectedNode =
    selectedNodeId !== null
      ? (system.nodes.find((n) => n.id === selectedNodeId) ?? null)
      : null;
  const selectedEdge =
    selectedEdgeId !== null
      ? (system.edges.find((e) => e.id === selectedEdgeId) ?? null)
      : null;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="led-system-designer-grid"
      style={{
        background: "#1C1C24",
        border: "1px solid #2F2F3A",
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
      }}
    >
      {/* Canvas + toolbar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 540,
        }}
      >
        <Toolbar
          indoor={system.indoor}
          onToggleIndoor={(v) => onChange({ ...system, indoor: v })}
          onAdd={addNode}
          pendingEdgeKind={pendingEdgeKind}
          onPendingEdgeKindChange={setPendingEdgeKind}
        />
        <div
          style={{
            position: "relative",
            background: "#0F0F14",
            border: "1px solid #2F2F3A",
            borderRadius: 8,
            height: 600,
            overflow: "hidden",
          }}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onMoveEnd={onMoveEnd}
            onInit={(inst) => {
              flowRef.current = inst;
              if (system.viewport) inst.setViewport(system.viewport);
            }}
            onNodeClick={(_e, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_e, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            snapToGrid
            snapGrid={[16, 16]}
            fitView={!system.viewport}
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#2F2F3A"
            />
            <Controls
              style={{
                background: "#25252F",
                border: "1px solid #2F2F3A",
                borderRadius: 6,
              }}
            />
            <MiniMap
              pannable
              zoomable
              style={{ background: "#25252F" }}
              nodeColor={(n) => {
                const kind = (n.data as NodeData | undefined)?.node.kind;
                return kind ? NODE_KIND_THEME[kind].accent : "#52525B";
              }}
              maskColor="rgba(0,0,0,0.55)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right column: inspector + metrics */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
        }}
      >
        {selectedNode ? (
          <NodeInspector
            node={selectedNode}
            screens={screens}
            onChange={(patch) => updateNode(selectedNode.id, patch)}
            onRemove={() => removeNode(selectedNode.id)}
          />
        ) : selectedEdge ? (
          <EdgeInspector
            edge={selectedEdge}
            onChange={(patch) => updateEdge(selectedEdge.id, patch)}
            onRemove={() => removeEdge(selectedEdge.id)}
          />
        ) : (
          <div style={panelStyle}>
            <div style={panelTitleStyle}>Inspector</div>
            <div style={{ color: "#A1A1AA", fontSize: 12 }}>
              Click a node or cable on the canvas to edit its properties.
              Drag from a node's right edge to its left edge to add a
              cable; pick the cable type with the toolbar buttons before
              connecting.
            </div>
          </div>
        )}
        <MetricsPanel metrics={metrics} />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

const panelStyle: CSSProperties = {
  background: "#25252F",
  border: "1px solid #2F2F3A",
  borderRadius: 8,
  padding: 12,
  color: "#F4F4F5",
  fontSize: 12,
  fontFamily: "system-ui, sans-serif",
};
const panelTitleStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#A1A1AA",
  marginBottom: 8,
  fontWeight: 600,
};
const buttonStyle: CSSProperties = {
  background: "#1C1C24",
  color: "#F4F4F5",
  border: "1px solid #3F3F4A",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};
const buttonPrimary: CSSProperties = {
  ...buttonStyle,
  background: "#F88000",
  borderColor: "#F88000",
  color: "#0F0F14",
  fontWeight: 600,
};
const inputStyle: CSSProperties = {
  background: "#1C1C24",
  color: "#F4F4F5",
  border: "1px solid #3F3F4A",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  width: "100%",
  boxSizing: "border-box",
};

function Toolbar({
  indoor,
  onToggleIndoor,
  onAdd,
  pendingEdgeKind,
  onPendingEdgeKindChange,
}: {
  indoor: boolean;
  onToggleIndoor: (v: boolean) => void;
  onAdd: (kind: LedSystemNodeKind) => void;
  pendingEdgeKind: LedSystemEdgeKind;
  onPendingEdgeKindChange: (k: LedSystemEdgeKind) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        background: "#25252F",
        border: "1px solid #2F2F3A",
        borderRadius: 8,
        padding: 8,
        alignItems: "center",
      }}
    >
      <span style={{ color: "#A1A1AA", fontSize: 11, marginRight: 4 }}>
        Add:
      </span>
      {(Object.keys(NODE_KIND_THEME) as LedSystemNodeKind[]).map((k) => (
        <button
          key={k}
          style={buttonStyle}
          onClick={() => onAdd(k)}
          title={`Add a new ${NODE_KIND_THEME[k].label}`}
        >
          <span style={{ color: NODE_KIND_THEME[k].accent, marginRight: 4 }}>
            {NODE_KIND_THEME[k].emoji}
          </span>
          {NODE_KIND_THEME[k].label}
        </button>
      ))}
      <span
        style={{
          width: 1,
          height: 20,
          background: "#3F3F4A",
          margin: "0 4px",
        }}
      />
      <span style={{ color: "#A1A1AA", fontSize: 11, marginRight: 4 }}>
        New cable:
      </span>
      {(Object.keys(EDGE_KIND_THEME) as LedSystemEdgeKind[]).map((k) => (
        <button
          key={k}
          style={{
            ...buttonStyle,
            borderColor:
              pendingEdgeKind === k ? EDGE_KIND_THEME[k].color : "#3F3F4A",
            color:
              pendingEdgeKind === k ? EDGE_KIND_THEME[k].color : "#F4F4F5",
          }}
          onClick={() => onPendingEdgeKindChange(k)}
        >
          {EDGE_KIND_THEME[k].label}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#F4F4F5",
          fontSize: 12,
        }}
      >
        <input
          type="checkbox"
          checked={indoor}
          onChange={(e) => onToggleIndoor(e.target.checked)}
        />
        Indoor install
      </label>
    </div>
  );
}

function NodeInspector({
  node,
  screens,
  onChange,
  onRemove,
}: {
  node: LedSystemNode;
  screens: LedScreen[];
  onChange: (patch: Partial<LedSystemNode>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ ...panelTitleStyle, marginBottom: 0, flex: 1 }}>
          {NODE_KIND_THEME[node.kind].label}
        </div>
        <button
          style={{ ...buttonStyle, color: "#EF4444", borderColor: "#7F1D1D" }}
          onClick={onRemove}
        >
          Delete
        </button>
      </div>
      <Field label="Label">
        <input
          style={inputStyle}
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </Field>
      {node.kind === "screen" && (
        <>
          <Field label="Link to LED screen (optional)">
            <select
              style={inputStyle}
              value={node.screenRefId ?? ""}
              onChange={(e) =>
                onChange({ screenRefId: e.target.value || null })
              }
            >
              <option value="">— Standalone (manual pixels) —</option>
              {screens.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Screen ${s.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </Field>
          {!node.screenRefId && (
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
            >
              <Field label="Pixels W">
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={node.pixelsW ?? 0}
                  onChange={(e) =>
                    onChange({ pixelsW: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Pixels H">
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={node.pixelsH ?? 0}
                  onChange={(e) =>
                    onChange({ pixelsH: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>
          )}
        </>
      )}
      {node.kind === "processor" && (
        <>
          <Field label="Model">
            <select
              style={inputStyle}
              value={node.processorModel ?? ""}
              onChange={(e) =>
                onChange({
                  processorModel:
                    (e.target.value as NovastarProcessorModel) || null,
                })
              }
            >
              <option value="">Other / generic</option>
              {NOVASTAR_PROCESSOR_OPTIONS.map((o) => (
                <option key={o.model} value={o.model}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#F4F4F5",
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={!!node.isBackup}
              onChange={(e) => onChange({ isBackup: e.target.checked })}
            />
            Backup / hot-spare
          </label>
        </>
      )}
      {node.kind === "psu" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Amps">
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={node.psuAmps ?? 0}
              onChange={(e) =>
                onChange({ psuAmps: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Phases">
            <select
              style={inputStyle}
              value={node.psuPhases ?? 1}
              onChange={(e) =>
                onChange({
                  psuPhases: Number(e.target.value) === 3 ? 3 : 1,
                })
              }
            >
              <option value={1}>1-phase</option>
              <option value={3}>3-phase</option>
            </select>
          </Field>
        </div>
      )}
      <Field label="Notes">
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={node.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </Field>
    </div>
  );
}

function EdgeInspector({
  edge,
  onChange,
  onRemove,
}: {
  edge: LedSystemEdge;
  onChange: (patch: Partial<LedSystemEdge>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ ...panelTitleStyle, marginBottom: 0, flex: 1 }}>
          Cable · {EDGE_KIND_THEME[edge.kind].label}
        </div>
        <button
          style={{ ...buttonStyle, color: "#EF4444", borderColor: "#7F1D1D" }}
          onClick={onRemove}
        >
          Delete
        </button>
      </div>
      <Field label="Cable type">
        <select
          style={inputStyle}
          value={edge.kind}
          onChange={(e) =>
            onChange({ kind: e.target.value as LedSystemEdgeKind })
          }
        >
          {(Object.keys(EDGE_KIND_THEME) as LedSystemEdgeKind[]).map((k) => (
            <option key={k} value={k}>
              {EDGE_KIND_THEME[k].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Distance (m)">
        <input
          style={inputStyle}
          type="number"
          min={0}
          step={1}
          value={edge.distanceM}
          onChange={(e) =>
            onChange({ distanceM: Math.max(0, Number(e.target.value) || 0) })
          }
        />
      </Field>
      <Field label="Label (optional)">
        <input
          style={inputStyle}
          value={edge.label ?? ""}
          onChange={(e) =>
            onChange({ label: e.target.value || undefined })
          }
        />
      </Field>
    </div>
  );
}

function MetricsPanel({
  metrics,
}: {
  metrics: ReturnType<typeof computeLedSystemMetrics>;
}) {
  return (
    <div style={panelStyle}>
      <div style={panelTitleStyle}>System overview</div>
      <Stat label="Screens" value={metrics.counts.screens} />
      <Stat
        label="Processors"
        value={`${metrics.counts.processors}${
          metrics.counts.backupProcessors > 0
            ? ` (+${metrics.counts.backupProcessors} backup)`
            : ""
        }`}
      />
      <Stat label="Fiber boxes" value={metrics.counts.fiberBoxes} />
      <Stat label="Power supplies" value={metrics.counts.psus} />
      <Stat
        label="Total pixels"
        value={
          metrics.pixelsTotal > 0
            ? metrics.pixelsTotal.toLocaleString()
            : "—"
        }
      />
      <Stat
        label="Total power"
        value={metrics.psuKw > 0 ? `${metrics.psuKw.toFixed(1)} kW` : "—"}
      />
      <div style={{ ...panelTitleStyle, marginTop: 14 }}>Cabling</div>
      <Stat
        label={`Signal · ${metrics.cables.signalCount} run${
          metrics.cables.signalCount === 1 ? "" : "s"
        }`}
        value={`${metrics.cables.signalM} m`}
        accent={EDGE_KIND_THEME.signal.color}
      />
      <Stat
        label={`Fiber · ${metrics.cables.fiberCount} run${
          metrics.cables.fiberCount === 1 ? "" : "s"
        }`}
        value={`${metrics.cables.fiberM} m`}
        accent={EDGE_KIND_THEME.fiber.color}
      />
      <Stat
        label={`Power · ${metrics.cables.powerCount} run${
          metrics.cables.powerCount === 1 ? "" : "s"
        }`}
        value={`${metrics.cables.powerM} m`}
        accent={EDGE_KIND_THEME.power.color}
      />
      <Stat
        label="Total cable"
        value={`${metrics.cables.totalM} m`}
      />

      {metrics.processors.length > 0 && (
        <>
          <div style={{ ...panelTitleStyle, marginTop: 14 }}>
            Processor capacity
          </div>
          {metrics.processors.map((p) => (
            <ProcessorRow key={p.nodeId} p={p} />
          ))}
        </>
      )}

      {metrics.warnings.length > 0 && (
        <>
          <div style={{ ...panelTitleStyle, marginTop: 14, color: "#EF4444" }}>
            Warnings ({metrics.warnings.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#FCA5A5" }}>
            {metrics.warnings.map((w) => (
              <li
                key={w.id}
                style={{
                  fontSize: 11,
                  marginBottom: 4,
                  color: w.level === "danger" ? "#FCA5A5" : "#FCD34D",
                }}
              >
                {w.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ProcessorRow({
  p,
}: {
  p: ReturnType<typeof computeLedSystemMetrics>["processors"][number];
}) {
  const portPct =
    p.portCapacity && p.portCapacity > 0
      ? Math.min(100, (p.portsUsed / p.portCapacity) * 100)
      : 0;
  const pxPct =
    p.pixelCapacity && p.pixelCapacity > 0
      ? Math.min(100, (p.pixelsUsed / p.pixelCapacity) * 100)
      : 0;
  return (
    <div
      style={{
        background: "#1C1C24",
        border: "1px solid #2F2F3A",
        borderRadius: 6,
        padding: 8,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontWeight: 600, color: "#F4F4F5" }}>
          {p.label}
          {p.isBackup && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: "#A1A1AA",
                fontWeight: 400,
              }}
            >
              backup
            </span>
          )}
        </span>
      </div>
      {p.portCapacity !== null && (
        <Bar
          label={`Ports ${p.portsUsed} / ${p.portCapacity}`}
          pct={portPct}
          accent="#F88000"
        />
      )}
      {p.pixelCapacity !== null && (
        <Bar
          label={`Pixels ${p.pixelsUsed.toLocaleString()} / ${p.pixelCapacity.toLocaleString()}`}
          pct={pxPct}
          accent="#3B82F6"
        />
      )}
      {p.portCapacity === null && p.pixelCapacity === null && (
        <div style={{ color: "#A1A1AA", fontSize: 11 }}>
          Generic — no capacity check
        </div>
      )}
    </div>
  );
}

function Bar({
  label,
  pct,
  accent,
}: {
  label: string;
  pct: number;
  accent: string;
}) {
  return (
    <div style={{ marginTop: 2 }}>
      <div
        style={{
          fontSize: 10,
          color: "#A1A1AA",
          marginBottom: 2,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <span>{Math.round(pct)} %</span>
      </div>
      <div
        style={{
          background: "#2F2F3A",
          borderRadius: 3,
          height: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: pct > 95 ? "#EF4444" : pct > 80 ? "#FCD34D" : accent,
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "1px dashed #2F2F3A",
        fontSize: 12,
      }}
    >
      <span style={{ color: "#A1A1AA" }}>
        {accent && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: accent,
              marginRight: 6,
            }}
          />
        )}
        {label}
      </span>
      <span style={{ color: "#F4F4F5", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10,
          color: "#A1A1AA",
          marginBottom: 3,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
