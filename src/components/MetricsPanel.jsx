import { BarChart3, ChevronRight } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

function fmt(value) {
  return Number(value || 0).toFixed(4);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line/70 bg-slate-950/30 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="metric-number mt-1 text-xl font-bold text-cyan">{value}</div>
    </div>
  );
}

function RankingTable({ title, rows, onSelect }) {
  return (
    <div className="rounded-lg border border-line/70 bg-slate-950/30">
      <div className="border-b border-line/70 px-3 py-2 font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">{title}</div>
      <div className="max-h-56 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-950 text-slate-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Node</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.node}`} className="table-row-hover cursor-pointer border-t border-line/50" onClick={() => onSelect(row.node)}>
                <td className="px-3 py-2 font-mono text-cyan">{row.rank}</td>
                <td className="max-w-[145px] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.dbColors?.[0] || '#00d4ff' }} />
                    <span className="truncate text-slate-200">{row.node}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300">{fmt(row.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MetricsPanel() {
  const snaMetrics = useGraphStore((state) => state.snaMetrics);
  const open = useGraphStore((state) => state.rightPanelOpen);
  const actions = useGraphStore((state) => state.actions);
  const global = snaMetrics.global || {};

  return (
    <aside className={`glass z-20 flex shrink-0 flex-col overflow-hidden border-y-0 border-r-0 transition-all duration-200 ${open ? 'w-[380px]' : 'w-[54px]'}`}>
      <button className="flex h-[52px] items-center gap-2 border-b border-line/80 px-4 text-left" onClick={actions.toggleRightPanel}>
        <BarChart3 className="h-5 w-5 text-cyan" />
        {open && <span className="font-heading text-xl font-bold uppercase tracking-[0.16em] text-white">SNA Metrics</span>}
        <ChevronRight className={`ml-auto h-4 w-4 transition ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Nodes" value={global.nodeCount || 0} />
            <Stat label="Edges" value={global.edgeCount || 0} />
            <Stat label="Components" value={global.components || 0} />
            <Stat label="Density" value={fmt(global.density)} />
            <Stat label="Avg degree" value={fmt(global.averageDegree)} />
            <Stat label="Max degree" value={global.maxDegree || 0} />
            <Stat label="Avg clustering" value={fmt(global.averageClustering)} />
            <Stat label="Diameter" value={global.diameter || 0} />
            <Stat label="Avg path" value={fmt(global.averagePathLength)} />
          </div>

          <RankingTable title="Degree" rows={snaMetrics.rankings?.degree || []} onSelect={actions.setHighlightedNodeId} />
          <RankingTable title="Betweenness" rows={snaMetrics.rankings?.betweenness || []} onSelect={actions.setHighlightedNodeId} />
          <RankingTable title="Closeness" rows={snaMetrics.rankings?.closeness || []} onSelect={actions.setHighlightedNodeId} />
          <RankingTable title="Eigenvector" rows={snaMetrics.rankings?.eigenvector || []} onSelect={actions.setHighlightedNodeId} />
          <RankingTable title="PageRank" rows={snaMetrics.rankings?.pageRank || []} onSelect={actions.setHighlightedNodeId} />

          <div className="rounded-lg border border-line/70 bg-slate-950/30">
            <div className="border-b border-line/70 px-3 py-2 font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">Communities</div>
            <div className="space-y-2 p-3">
              {(snaMetrics.communityList || []).map((community) => (
                <div key={community.id} className="rounded-md bg-white/[0.03] p-2 text-xs">
                  <div className="flex justify-between text-slate-200">
                    <span>Community {community.id}</span>
                    <span className="font-mono text-cyan">{community.size}</span>
                  </div>
                  <div className="mt-1 truncate text-slate-500">{community.members.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
