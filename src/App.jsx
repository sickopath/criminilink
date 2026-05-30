import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import EdgePopup from './components/EdgePopup';
import GraphCanvas from './components/GraphCanvas';
import ImportModal from './components/ImportModal';
import MetricsPanel from './components/MetricsPanel';
import NodePopup from './components/NodePopup';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useGraphStore } from './store/useGraphStore';
import { buildGraphFromRows, detectColumnMapping, parseCsvText } from './utils/csvParser';

class GraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.log('CrimLink graph boundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex flex-1 items-center justify-center bg-[#070b14]">
          <div className="max-w-lg rounded-lg border border-danger/50 bg-danger/10 p-6 text-center">
            <h2 className="font-heading text-3xl font-bold text-white">Graph renderer failed</h2>
            <p className="mt-2 text-sm text-slate-300">{this.state.error?.message || 'Unknown graph error'}</p>
            <button className="btn btn-primary mt-4" onClick={() => this.setState({ hasError: false, error: null })}>Retry</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [importOpen, setImportOpen] = useState(false);
  const graphRef = useRef(null);
  const actions = useGraphStore((state) => state.actions);
  const databases = useGraphStore((state) => state.databases);

  const loadSample = async () => {
    try {
      if (databases.some((db) => db.name === 'Opération Cargo')) {
        toast('Sample database is already loaded.');
        return;
      }
      const response = await fetch('/sample-data.csv');
      const text = await response.text();
      const parsed = parseCsvText(text);
      const mapping = detectColumnMapping(parsed.headers);
      const graph = buildGraphFromRows(parsed.rows, mapping, 'db-sample', 'Opération Cargo', '#00d4ff');
      actions.addDatabase({ name: 'Opération Cargo', nodes: graph.nodes, edges: graph.edges });
      toast.success('Sample data loaded.');
    } catch (error) {
      toast.error(error.message || 'Unable to load sample data.');
    }
  };

  const handleGraphCommand = (command) => {
    graphRef.current?.[command]?.();
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-100">
      <TopBar onImport={() => setImportOpen(true)} onGraphCommand={handleGraphCommand} />
      <div className="flex min-h-0 flex-1">
        <Sidebar onLoadSample={loadSample} />
        <div className="relative flex min-w-0 flex-1">
          <GraphErrorBoundary>
            <GraphCanvas ref={graphRef} />
          </GraphErrorBoundary>
        </div>
        <MetricsPanel />
      </div>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <NodePopup />
      <EdgePopup />
    </div>
  );
}
