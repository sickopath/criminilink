import { Database, Eye, EyeOff, RotateCcw, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { colorForRelationship, entityTypeConfig } from '../utils/cytoscapeStyles';

export default function Sidebar({ onLoadSample }) {
  const databases = useGraphStore((state) => state.databases);
  const filters = useGraphStore((state) => state.filters);
  const snaMetrics = useGraphStore((state) => state.snaMetrics);
  const actions = useGraphStore((state) => state.actions);

  const relationshipTypes = useMemo(() => {
    const counts = new Map();
    databases.forEach((db) => db.edges.forEach((edge) => counts.set(edge.relationship, (counts.get(edge.relationship) || 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([type, count]) => ({ type, count }));
  }, [databases]);

  const confirmDeleteDatabase = (db) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la BD "${db.name}"?\n\nCette action retirera ${db.nodes.length} entités et ${db.edges.length} liens de CriminLink.`,
    );
    if (confirmed) actions.deleteDatabase(db.id);
  };

  return (
    <aside className="glass z-20 flex w-[330px] shrink-0 flex-col overflow-hidden border-y-0 border-l-0">
      <div className="border-b border-line/80 p-4">
        <button className="btn btn-primary w-full" onClick={onLoadSample}>
          <Database className="h-4 w-4" />
          Load Sample Data
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold uppercase tracking-[0.16em] text-white">Databases</h2>
            <span className="font-mono text-xs text-cyan">{databases.length}/20</span>
          </div>
          <div className="space-y-2">
            {databases.length === 0 && (
              <div className="rounded-lg border border-dashed border-line p-4 text-sm text-slate-400">
                Import a CSV or load the sample operation to begin.
              </div>
            )}
            {databases.map((db) => (
              <div key={db.id} className="rounded-lg border border-line/80 bg-slate-950/35 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: db.color }} />
                      <p className="truncate font-semibold text-white">{db.name}</p>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {db.nodes.length} nodes / {db.edges.length} edges
                    </p>
                    <p className={`mt-1 font-mono text-[11px] ${db.active ? 'text-success' : 'text-slate-500'}`}>
                      {db.active ? 'Visible sur le graphe' : 'Masquée, mais conservée'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className={`btn h-9 min-h-9 w-9 p-0 ${db.active ? 'border-success/70 text-success' : 'border-slate-600 text-slate-400'}`}
                      aria-label={db.active ? `Masquer ${db.name}` : `Afficher ${db.name}`}
                      title={db.active ? 'Masquer cette BD' : 'Afficher cette BD'}
                      onClick={() => actions.toggleDatabase(db.id)}
                    >
                      {db.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      className="btn btn-danger h-9 min-h-9 w-9 p-0 border-danger/70 text-danger"
                      aria-label={`Supprimer ${db.name}`}
                      title="Supprimer cette BD"
                      onClick={() => confirmDeleteDatabase(db)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-line/80 bg-slate-950/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">Filtres</h3>
            <button className="btn h-8 min-h-8 px-2 text-xs" onClick={actions.resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Tout retirer
            </button>
          </div>
          <label className="mb-3 flex items-center justify-between gap-3 rounded-md border border-line/70 bg-slate-950/30 px-2 py-2 text-sm text-slate-200">
            <span>Cacher les entités hors filtre</span>
            <input
              type="checkbox"
              className="accent-cyan"
              checked={filters.hideNonMatching}
              onChange={(event) => actions.setFilter('hideNonMatching', event.target.checked)}
            />
          </label>

          <div className="mb-3 rounded-md border border-success/40 bg-success/10 px-2 py-2 text-xs text-success">
            {filters.searchQuery || filters.relationshipTypes.length || filters.minDegree > 0 || filters.communityId !== null
              ? 'Filtre appliqué au graphe'
              : 'Aucun filtre appliqué'}
          </div>

          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Degré minimum</label>
            {filters.minDegree > 0 && (
              <button className="btn h-7 min-h-7 px-2 text-xs" onClick={() => actions.clearFilter('minDegree')}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <input
            className="w-full accent-cyan"
            type="range"
            min="0"
            max={Math.max(10, snaMetrics.global?.maxDegree || 0)}
            value={filters.minDegree}
            onChange={(event) => actions.setFilter('minDegree', Number(event.target.value))}
          />
          <div className="font-mono text-xs text-cyan">{filters.minDegree}</div>

          <div className="mb-2 mt-4 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Communauté</label>
            {filters.communityId !== null && (
              <button className="btn h-7 min-h-7 px-2 text-xs" onClick={() => actions.clearFilter('communityId')}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <select
            className="input"
            value={filters.communityId ?? ''}
            onChange={(event) => actions.setFilter('communityId', event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">Toutes les communautés</option>
            {(snaMetrics.communityList || []).map((community) => (
              <option key={community.id} value={community.id}>
                Communauté {community.id} ({community.size})
              </option>
            ))}
          </select>

          <div className="mb-2 mt-4 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Types de relation & légende</label>
            {filters.relationshipTypes.length > 0 && (
              <button className="btn h-7 min-h-7 px-2 text-xs" onClick={() => actions.clearFilter('relationshipTypes')}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {relationshipTypes.map(({ type, count }, index) => (
              <label key={type} className="group flex items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-200 transition hover:bg-white/5">
                <input
                  type="checkbox"
                  className="accent-cyan"
                  checked={filters.relationshipTypes.includes(type)}
                  onChange={() => actions.toggleRelationshipFilter(type)}
                />
                <span
                  className="h-2.5 w-7 shrink-0 rounded-full transition-all group-hover:w-10"
                  style={{ background: colorForRelationship(type, index) }}
                />
                <span className="min-w-0 flex-1 truncate">{type}</span>
                <span className="font-mono text-[11px] text-slate-500">{count}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-line/80 bg-slate-950/30 p-3">
          <h3 className="mb-3 font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">Types d'entités</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(entityTypeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1.5 text-xs text-slate-300">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: config.color }} />
                <span className="truncate">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
