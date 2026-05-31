import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useGraphStore } from '../store/useGraphStore';
import { buildGraphFromRows, detectColumnMapping, parseCsvText, parseFile } from '../utils/csvParser';

const FIELDS = [
  ['node1', 'Source entity'],
  ['node2', 'Target entity'],
  ['relationship', 'Relationship'],
  ['context', 'Context'],
];

export default function ImportModal({ open, onClose }) {
  const actions = useGraphStore((state) => state.actions);
  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  if (!open) return null;

  const handleParsed = (parsed, label) => {
    if (parsed.errors?.length) console.log('CriminLink CSV parse warnings', parsed.errors);
    setRows(parsed.rows);
    setHeaders(parsed.headers);
    setMapping(detectColumnMapping(parsed.headers));
    setFileName(label);
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      handleParsed(parsed, file.name);
      toast.success(`Parsed ${parsed.rows.length} rows.`);
    } catch (error) {
      toast.error(error.message || 'Unable to parse CSV.');
    }
  };

  const importNow = async () => {
    try {
      if (!name.trim()) throw new Error('Database name is required.');
      const tempDbId = 'db-import';
      const graph = buildGraphFromRows(rows, mapping, tempDbId, name.trim(), '#00d4ff');
      const ok = await actions.addDatabase({ name, nodes: graph.nodes, edges: graph.edges });
      if (ok) {
        toast.success(`${name.trim()} imported.`);
        setName('');
        setRows([]);
        setHeaders([]);
        setMapping({});
        setFileName('');
        onClose();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onMouseDown={onClose}>
      <div className="glass max-h-[88vh] w-full max-w-5xl animate-slideIn overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line/80 px-5 py-4">
          <div>
            <h2 className="font-heading text-3xl font-bold uppercase tracking-[0.18em] text-white">Import CSV</h2>
            <p className="text-sm text-slate-400">Map entity relationship columns into a named graph database.</p>
          </div>
          <button className="btn h-9 min-h-9 w-9 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[calc(88vh-78px)] grid-cols-[330px_1fr] gap-4 overflow-y-auto p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Database name</label>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Operation name" />
            </div>

            <label
              className={`flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition ${
                dragging ? 'border-cyan bg-cyan/10' : 'border-line bg-slate-950/25'
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
              <span className="font-heading text-2xl font-bold text-white">Drop CSV</span>
              <span className="mt-1 text-sm text-slate-400">or click to choose a file</span>
              {fileName && <span className="mt-4 rounded-md bg-cyan/10 px-2 py-1 font-mono text-xs text-cyan">{fileName}</span>}
            </label>

            <div className="rounded-lg border border-line/80 bg-slate-950/30 p-3">
              <h3 className="mb-3 font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">Column Mapping</h3>
              <div className="space-y-3">
                {FIELDS.map(([field, label]) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs text-slate-400">{label}</label>
                    <select className="input" value={mapping[field] || ''} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}>
                      <option value="">Select column</option>
                      {headers.map((header) => (
                        <option key={`${field}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold uppercase tracking-[0.14em] text-white">Preview</h3>
              <span className="font-mono text-xs text-cyan">{rows.length} rows</span>
            </div>
            <div className="min-h-[360px] overflow-auto rounded-lg border border-line bg-slate-950/35">
              {previewRows.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center text-slate-500">No file selected</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400">
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="whitespace-nowrap px-3 py-2">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={`preview-${index}`} className="border-t border-line/60">
                        {headers.map((header) => (
                          <td key={`${index}-${header}`} className="max-w-[220px] truncate px-3 py-2 text-slate-300">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={importNow}>Import</button>
            </div>

            <button
              className="mt-3 text-left text-xs text-cyan/80 hover:text-cyan"
              onClick={() => {
                fetch('/sample-data.csv')
                  .then((response) => response.text())
                  .then((text) => {
                    setName('Opération Cargo');
                    handleParsed(parseCsvText(text), 'sample-data.csv');
                  })
                  .catch((error) => toast.error(error.message));
              }}
            >
              Use bundled sample CSV in this modal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
