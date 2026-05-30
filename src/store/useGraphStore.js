import { create } from 'zustand';
import toast from 'react-hot-toast';
import { databasePalette } from '../utils/cytoscapeStyles';
import { computeSnaMetrics } from '../utils/snaMetrics';

const MAX_DATABASES = 20;
const STORAGE_KEY = 'crimlink.persistedDatabases.v1';

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveDatabases(databases) {
  return databases.filter((db) => db.active);
}

function getPersistedDatabases() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.databases)) return [];
    return parsed.databases.map((db) => ({ ...db, active: db.active !== false }));
  } catch (error) {
    console.log('CrimLink persistence read failed', error);
    return [];
  }
}

function savePersistedDatabases(databases) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ databases }));
  } catch (error) {
    console.log('CrimLink persistence write failed', error);
    toast.error('Impossible de sauvegarder les BD localement.');
  }
}

const initialDatabases = getPersistedDatabases();
const initialMetrics = computeSnaMetrics(getActiveDatabases(initialDatabases));

export const useGraphStore = create((set, get) => ({
  databases: initialDatabases,
  activeDbIds: initialDatabases.filter((db) => db.active).map((db) => db.id),
  selectedNode: null,
  selectedEdge: null,
  snaMetrics: initialMetrics,
  communities: initialMetrics.communities,
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
    addDatabase: ({ name, nodes, edges }) => {
      const state = get();
      if (state.databases.length >= MAX_DATABASES) {
        toast.error('Maximum of 20 databases reached.');
        return false;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Database name is required.');
        return false;
      }
      if (state.databases.some((db) => db.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error('A database with this name already exists.');
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
          dbIds: [id],
          dbNames: [trimmed],
          dbColors: [color],
          color,
          primaryDbId: id,
        })),
        edges: edges.map((edge) => ({
          ...edge,
          id: edge.id.replace(/^db-[^:]+/, id),
          dbId: id,
          dbName: trimmed,
          dbColor: color,
        })),
        active: true,
        createdAt: new Date().toISOString(),
      };
      const databases = [...state.databases, db];
      const snaMetrics = computeSnaMetrics(getActiveDatabases(databases));
      savePersistedDatabases(databases);
      set({
        databases,
        activeDbIds: databases.filter((item) => item.active).map((item) => item.id),
        snaMetrics,
        communities: snaMetrics.communities,
      });
      if (edges.length > 500) toast('Large graph loaded. Layouts may take a moment.', { icon: '!' });
      console.log('CrimLink database added', db);
      return true;
    },
    importDatabase: ({ id, name, color, nodes, edges }) => {
      const state = get();
      const db = { id, name, color, nodes, edges, active: true, createdAt: new Date().toISOString() };
      const databases = [...state.databases, db];
      const snaMetrics = computeSnaMetrics(getActiveDatabases(databases));
      savePersistedDatabases(databases);
      set({
        databases,
        activeDbIds: databases.filter((item) => item.active).map((item) => item.id),
        snaMetrics,
        communities: snaMetrics.communities,
      });
      return true;
    },
    toggleDatabase: (id) => {
      const current = get().databases;
      const target = current.find((db) => db.id === id);
      if (target?.active && current.filter((db) => db.active).length === 1) {
        toast('Au moins une BD doit rester visible.');
        return;
      }
      const databases = current.map((db) => (db.id === id ? { ...db, active: !db.active } : db));
      const snaMetrics = computeSnaMetrics(getActiveDatabases(databases));
      savePersistedDatabases(databases);
      set({
        databases,
        activeDbIds: databases.filter((db) => db.active).map((db) => db.id),
        snaMetrics,
        communities: snaMetrics.communities,
      });
    },
    deleteDatabase: (id) => {
      const databases = get().databases.filter((db) => db.id !== id);
      const snaMetrics = computeSnaMetrics(getActiveDatabases(databases));
      savePersistedDatabases(databases);
      set({
        databases,
        activeDbIds: databases.filter((db) => db.active).map((db) => db.id),
        snaMetrics,
        communities: snaMetrics.communities,
        selectedNode: null,
        selectedEdge: null,
      });
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
      const snaMetrics = computeSnaMetrics(getActiveDatabases(get().databases));
      set({ snaMetrics, communities: snaMetrics.communities });
    },
    clearPersistedDatabases: () => {
      savePersistedDatabases([]);
      const snaMetrics = computeSnaMetrics([]);
      set({
        databases: [],
        activeDbIds: [],
        selectedNode: null,
        selectedEdge: null,
        snaMetrics,
        communities: snaMetrics.communities,
      });
    },
  },
}));
