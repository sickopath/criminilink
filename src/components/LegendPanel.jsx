import { useMemo } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { colorForRelationship } from '../utils/cytoscapeStyles';

export default function LegendPanel() {
  const databases = useGraphStore((state) => state.databases);
  const relationshipTypes = useMemo(() => {
    const set = new Set();
    databases.filter((db) => db.active).forEach((db) => db.edges.forEach((edge) => set.add(edge.relationship)));
    return Array.from(set).sort();
  }, [databases]);

  if (!relationshipTypes.length) return null;

  return (
    <div className="glass absolute bottom-5 left-5 z-20 w-64 p-3">
      <h3 className="mb-2 font-heading text-lg font-bold uppercase tracking-[0.14em] text-white">Legend</h3>
      <div className="space-y-1.5">
        {relationshipTypes.slice(0, 12).map((type, index) => (
          <div key={type} className="group flex items-center gap-2 rounded-md px-1 py-1 transition hover:bg-white/5">
            <span className="h-2.5 w-7 rounded-full transition-all group-hover:w-10" style={{ background: colorForRelationship(type, index) }} />
            <span className="truncate text-xs text-slate-300">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
