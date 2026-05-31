import { Download, FileDown, FilterX, ImageDown, Network, RotateCcw, Search, Shuffle, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGraphStore } from '../store/useGraphStore';
import { graphToCsv, metricsToCsv } from '../utils/csvParser';

function download(filename, content, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TopBar({ onImport, onGraphCommand }) {
  const databases = useGraphStore((state) => state.databases);
  const filters = useGraphStore((state) => state.filters);
  const snaMetrics = useGraphStore((state) => state.snaMetrics);
  const layout = useGraphStore((state) => state.layout);
  const communityMode = useGraphStore((state) => state.communityMode);
  const focusNode = useGraphStore((state) => state.focusNode);
  const actions = useGraphStore((state) => state.actions);

  const visibleEdges = databases
    .filter((db) => db.active)
    .flatMap((db) => db.edges.map((edge) => ({ ...edge, dbName: db.name })));
  const activeFilterCount = [
    filters.searchQuery.trim(),
    filters.relationshipTypes.length,
    filters.minDegree > 0,
    filters.communityId !== null,
    focusNode,
  ].filter(Boolean).length;

  return (
    <header className="glass z-30 flex h-[76px] shrink-0 items-center justify-between border-x-0 border-t-0 px-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-cyan shadow-cyan animate-pulseDot" />
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-[0.28em] text-white">CRIMINLINK</h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan/80">Analyseur de graphes d'enquête</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2 px-5">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan/70" />
          <input
            className="input h-10 pl-9 pr-9"
            value={filters.searchQuery}
            onChange={(event) => actions.setFilter('searchQuery', event.target.value)}
            placeholder="Rechercher une entité"
          />
          {filters.searchQuery && (
            <button
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              title="Retirer la recherche"
              onClick={() => actions.clearFilter('searchQuery')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select className="input h-10 max-w-[170px]" value={layout} onChange={(event) => actions.setLayout(event.target.value)}>
          <option value="cola">Forces</option>
          <option value="dagre">Hiérarchique</option>
          <option value="cose-bilkent">Organique</option>
          <option value="concentric">Centralité</option>
          <option value="grid">Grille</option>
        </select>
        <button className="btn" title="Zoom avant" onClick={() => onGraphCommand('zoomIn')}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className="btn" title="Zoom arrière" onClick={() => onGraphCommand('zoomOut')}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button className="btn" title="Ajuster le graphe" onClick={() => onGraphCommand('fit')}>
          <Network className="h-4 w-4" />
        </button>
        <button className="btn" title="Réinitialiser la vue" onClick={() => onGraphCommand('reset')}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="btn" title="Minimiser les croisements" onClick={() => onGraphCommand('minimizeCrossings')}>
          <Shuffle className="h-4 w-4" />
          Croisements
        </button>
        <button className={communityMode ? 'btn btn-primary' : 'btn'} onClick={actions.toggleCommunityMode}>
          Communautés
        </button>
        {activeFilterCount > 0 && (
          <button className="btn border-success/80 bg-success/15 text-success" title="Retirer tous les filtres" onClick={actions.resetFilters}>
            <FilterX className="h-4 w-4" />
            Filtre actif ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Importer CSV
        </button>
        <button className="btn" onClick={() => onGraphCommand('png')}>
          <ImageDown className="h-4 w-4" />
        </button>
        <button
          className="btn"
          onClick={() => {
            download('criminlink-visible-graph.csv', graphToCsv(visibleEdges));
            toast.success('Visible graph exported.');
          }}
        >
          <FileDown className="h-4 w-4" />
        </button>
        <button
          className="btn"
          onClick={() => {
            download('criminlink-sna-metrics.csv', metricsToCsv(snaMetrics));
            toast.success('SNA metrics exported.');
          }}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
