import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';

export default function EdgePopup() {
  const selectedEdge = useGraphStore((state) => state.selectedEdge);
  const actions = useGraphStore((state) => state.actions);

  useEffect(() => {
    if (!selectedEdge) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') actions.closePopups();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, selectedEdge]);

  if (!selectedEdge) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6" onMouseDown={actions.closePopups}>
      <section className="glass w-full max-w-2xl animate-slideIn p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold text-white">{selectedEdge.source} → {selectedEdge.target}</h2>
            <p className="font-mono text-xs text-cyan">{selectedEdge.relationships.length} relationship{selectedEdge.relationships.length === 1 ? '' : 's'}</p>
          </div>
          <button className="btn h-9 min-h-9 w-9 p-0" onClick={actions.closePopups}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="space-y-3">
          {selectedEdge.relationships.map((edge, index) => (
            <li key={`${edge.id}-${index}`} className="rounded-lg border border-line bg-slate-950/35 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-white">{index + 1}. {edge.relationship}</strong>
                <span className="rounded-md px-2 py-1 text-xs font-semibold text-slate-950" style={{ background: edge.dbColor }}>
                  {edge.dbName}
                </span>
              </div>
              <p className="italic text-slate-300">"{edge.context}"</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
