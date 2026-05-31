import { create } from 'zustand';
import toast from 'react-hot-toast';
import { databasePalette } from '../utils/cytoscapeStyles';
import { computeSnaMetrics } from '../utils/snaMetrics';

const MAX_DATABASES = 20;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveDatabases(databases) {
  return databases.filter((db) => db.active);
}

function metricsFor(databases) {
  return computeSnaMetrics(getActiveDatabases(databases));
}

async function apiJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'Erreur SQLite.';
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const useGraphStore = create((set, get) => ({
  databases: [],
  activeDbIds: [],
  selectedNode: null,
  selectedEdge: null,
  snaMetrics: computeSnaMetrics([]),
  communities: {},
  sqliteReady: false,
  sqliteError: null,
  filters: {
    searchQuery: '',
    relationshipTypes: [],
    minDegree: 0,
    communityId: null,
    hideNonMatching: false,
  },
  layout: 'cola',
  communityMode: false,
  focusNode: null,
  highlightedNodeId: null,
  rightPanelOpen: true,
  actions: {
    loadDatabases: async () => {
      try {
        const payload = await apiJson('/api/databases');
        const databases = payload.databases || [];
        const snaMetrics = metricsFor(databases);
        set({
          databases,
          activeDbIds: databases.filter((db) => db.active).map((db) => db.id),
          snaMetrics,
          communities: snaMetrics.communities,
          sqliteReady: true,
          sqliteError: null,
        });
        console.log('CriminLink databases loaded from SQLite', databases.length);
      } catch (error) {
        console.log('CriminLink SQLite load failed', error);
        set({ sqliteReady: false, sqliteError: error.message });
        toast.error(`SQLite indisponible: ${error.message}`);
      }
    },
    addDatabase: async ({ name, nodes, edges }) => {
      const state = get();
      if (state.databases.length >= MAX_DATABASES) {
        toast.error('Maximum de 20 BD atteint.');
        return false;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Le nom de la BD est obligatoire.');
        return false;
      }
      if (state.databases.some((db) => db.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error('Une BD avec ce nom existe déjà.');
        return false;
      }

      const id = makeId('db');
      const color = databasePalette[state.databases.length % databasePalette.length];
      const db = {
        id,
        name: trimmed,
        color,
        nodes: nodes.map((node) => ({
          ...node,
          id: `${id}::${node.canonicalId || node.label}`,
          dbIds: [id],
          dbNames: [trimmed],
          dbColors: [color],
          color,
          primaryDbId: id,
        })),
        edges: edges.map((edge, index) => ({
          ...edge,
          id: `${id}::edge::${index}::${edge.source}::${edge.target}`,
          sourceId: `${id}::${edge.source}`,
          targetId: `${id}::${edge.target}`,
          dbId: id,
          dbName: trimmed,
          dbColor: color,
        })),
        active: true,
        createdAt: new Date().toISOString(),
      };

      try {
        const payload = await apiJson('/api/databases', {
          method: 'POST',
          body: JSON.stringify(db),
        });
        const databases = [...state.databases, payload.database];
        const snaMetrics = metricsFor(databases);
        set({
          databases,
          activeDbIds: databases.filter((item) => item.active).map((item) => item.id),
          snaMetrics,
          communities: snaMetrics.communities,
          sqliteReady: true,
          sqliteError: null,
        });
        if (edges.length > 500) toast('Grand graphe chargé. Les layouts peuvent prendre un moment.', { icon: '!' });
        console.log('CriminLink database added to SQLite', payload.database);
        return true;
      } catch (error) {
        toast.error(error.message);
        return false;
      }
    },
    toggleDatabase: async (id) => {
      const current = get().databases;
      const target = current.find((db) => db.id === id);
      if (!target) return;
      if (target.active && current.filter((db) => db.active).length === 1) {
        toast('Au moins une BD doit rester visible.');
        return;
      }

      try {
        const payload = await apiJson(`/api/databases/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: !target.active }),
        });
        const databases = current.map((db) => (db.id === id ? payload.database : db));
        const snaMetrics = metricsFor(databases);
        set({
          databases,
          activeDbIds: databases.filter((db) => db.active).map((db) => db.id),
          snaMetrics,
          communities: snaMetrics.communities,
        });
      } catch (error) {
        toast.error(error.message);
      }
    },
    deleteDatabase: async (id) => {
      try {
        await apiJson(`/api/databases/${id}`, { method: 'DELETE' });
        const databases = get().databases.filter((db) => db.id !== id);
        const snaMetrics = metricsFor(databases);
        set({
          databases,
          activeDbIds: databases.filter((db) => db.active).map((db) => db.id),
          snaMetrics,
          communities: snaMetrics.communities,
          selectedNode: null,
          selectedEdge: null,
        });
      } catch (error) {
        toast.error(error.message);
      }
    },
    setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
    setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),
    closePopups: () => set({ selectedNode: null, selectedEdge: null }),
    setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
    toggleRelationshipFilter: (type) => {
      const current = get().filters.relationshipTypes;
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      set((state) => ({ filters: { ...state.filters, relationshipTypes: next } }));
    },
    clearFilter: (key) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: key === 'relationshipTypes' ? [] : key === 'minDegree' ? 0 : key === 'hideNonMatching' ? false : null,
          ...(key === 'searchQuery' ? { searchQuery: '' } : {}),
        },
      })),
    resetFilters: () => set({ filters: { searchQuery: '', relationshipTypes: [], minDegree: 0, communityId: null, hideNonMatching: false }, focusNode: null }),
    setLayout: (layout) => set({ layout }),
    toggleCommunityMode: () => set((state) => ({ communityMode: !state.communityMode })),
    setFocusNode: (nodeId) => set({ focusNode: nodeId }),
    clearFocus: () => set({ focusNode: null }),
    setHighlightedNodeId: (nodeId) => set({ highlightedNodeId: nodeId }),
    toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
    recomputeMetrics: () => {
      const snaMetrics = metricsFor(get().databases);
      set({ snaMetrics, communities: snaMetrics.communities });
    },
    clearPersistedDatabases: async () => {
      try {
        await apiJson('/api/databases', { method: 'DELETE' });
        const snaMetrics = computeSnaMetrics([]);
        set({
          databases: [],
          activeDbIds: [],
          selectedNode: null,
          selectedEdge: null,
          snaMetrics,
          communities: snaMetrics.communities,
        });
      } catch (error) {
        toast.error(error.message);
      }
    },
  },
}));
