import cytoscape from 'cytoscape';
import { Crosshair, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { entityTypeConfig, getCytoscapeStyles } from '../utils/cytoscapeStyles';

function fmt(value) {
  return Number(value || 0).toFixed(4);
}

export default function NodePopup() {
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const databases = useGraphStore((state) => state.databases);
  const snaMetrics = useGraphStore((state) => state.snaMetrics);
  const actions = useGraphStore((state) => state.actions);
  const egoRef = useRef(null);
  const cyRef = useRef(null);

  const connections = useMemo(() => {
    if (!selectedNode) return [];
    return databases
      .filter((db) => db.active)
      .flatMap((db) =>
        db.edges
          .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
          .map((edge) => ({ ...edge, dbName: db.name, dbColor: db.color, other: edge.source === selectedNode.id ? edge.target : edge.source })),
      );
  }, [databases, selectedNode]);

  const grouped = useMemo(() => {
    const map = new Map();
    connections.forEach((edge) => {
      const list = map.get(edge.relationship) || [];
      list.push(edge);
      map.set(edge.relationship, list);
    });
    return Array.from(map.entries());
  }, [connections]);

  useEffect(() => {
    if (!selectedNode) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') actions.closePopups();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, selectedNode]);

  useEffect(() => {
    if (!selectedNode || !egoRef.current) return undefined;
    const neighborNames = Array.from(new Set(connections.flatMap((edge) => [edge.source, edge.target])));
    const elements = [
      ...neighborNames.map((name) => ({
        data: {
          id: name,
          label: name,
          color: name === selectedNode.id ? '#00d4ff' : '#7c3aed',
          size: name === selectedNode.id ? 38 : 26,
        },
      })),
      ...connections.map((edge, index) => ({
        data: {
          id: `ego-${index}`,
          source: edge.source,
          target: edge.target,
          label: edge.relationship,
          color: edge.dbColor,
          width: 2,
          curve: 18,
        },
      })),
    ];
    cyRef.current = cytoscape({
      container: egoRef.current,
      elements,
      style: getCytoscapeStyles(),
      layout: { name: 'concentric', fit: true, padding: 20, animate: false },
      userZoomingEnabled: false,
    });
    return () => cyRef.current?.destroy();
  }, [connections, selectedNode]);

  if (!selectedNode) return null;
  const metrics = snaMetrics.nodeMetrics?.[selectedNode.id] || {};
  const typeConfig = entityTypeConfig[selectedNode.entityType] || entityTypeConfig.other;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/35" onMouseDown={actions.closePopups}>
      <section className="glass h-full w-[520px] animate-slideIn overflow-y-auto border-y-0 border-r-0 p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-4xl font-bold text-white">{selectedNode.label}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ background: typeConfig.color }}>
                {typeConfig.label}
              </span>
              {(metrics.dbNames || selectedNode.dbNames || []).map((name, index) => (
                <span key={name} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-950" style={{ background: metrics.dbColors?.[index] || selectedNode.dbColors?.[index] || '#00d4ff' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
          <button className="btn h-9 min-h-9 w-9 p-0" onClick={actions.closePopups}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <button className="btn btn-primary mb-4 w-full" onClick={() => actions.setFocusNode(selectedNode.id)}>
          <Crosshair className="h-4 w-4" />
          Focus on this node
        </button>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            ['Degree', metrics.degree],
            ['In / Out', `${metrics.inDegree || 0} / ${metrics.outDegree || 0}`],
            ['Betweenness', fmt(metrics.betweenness)],
            ['Closeness', fmt(metrics.closeness)],
            ['PageRank', fmt(metrics.pageRank)],
            ['Clustering', fmt(metrics.clustering)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-slate-950/30 p-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
              <div className="metric-number mt-1 text-lg font-bold text-cyan">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 h-56 overflow-hidden rounded-lg border border-line bg-[#070b14]">
          <div ref={egoRef} className="h-full w-full" />
        </div>

        <div className="space-y-3">
          {grouped.map(([type, items]) => (
            <div key={type} className="rounded-lg border border-line bg-slate-950/30 p-3">
              <h3 className="mb-2 font-heading text-xl font-bold text-white">{type}</h3>
              <div className="space-y-2">
                {items.map((edge) => (
                  <div key={edge.id} className="border-l-2 pl-3 text-sm" style={{ borderColor: edge.dbColor }}>
                    <div className="font-semibold text-slate-200">{edge.other}</div>
                    <div className="italic text-slate-400">"{edge.context}"</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
