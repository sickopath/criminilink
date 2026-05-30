export const relationshipPalette = [
  '#00d4ff',
  '#7c3aed',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#22c55e',
  '#38bdf8',
  '#a855f7',
  '#f97316',
];

export const databasePalette = [
  '#00d4ff',
  '#7c3aed',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#38bdf8',
  '#a3e635',
  '#fb7185',
  '#14b8a6',
  '#c084fc',
  '#fde047',
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#e879f9',
  '#2dd4bf',
  '#facc15',
  '#818cf8',
  '#fb923c',
];

export function colorForRelationship(type, index = 0) {
  let hash = index;
  String(type || '').split('').forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  });
  return relationshipPalette[Math.abs(hash) % relationshipPalette.length];
}

export function communityColor(id) {
  const colors = ['#00d4ff', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#38bdf8', '#ef4444', '#a3e635'];
  return colors[Math.abs(Number(id) || 0) % colors.length];
}

export const entityTypeConfig = {
  person: { label: 'Personne', shape: 'ellipse', color: '#2563eb' },
  company: { label: 'Compagnie', shape: 'round-rectangle', color: '#7c3aed' },
  place: { label: 'Lieu', shape: 'hexagon', color: '#059669' },
  address: { label: 'Adresse', shape: 'tag', color: '#f59e0b' },
  phone: { label: 'Téléphone', shape: 'diamond', color: '#dc2626' },
  email: { label: 'Courriel', shape: 'vee', color: '#0891b2' },
  financial: { label: 'Info financière', shape: 'barrel', color: '#16a34a' },
  other: { label: 'Autre', shape: 'ellipse', color: '#64748b' },
};

export function getCytoscapeStyles({ communityMode = false } = {}) {
  return [
    {
      selector: 'node',
      style: {
        'background-color': communityMode ? 'data(communityColor)' : 'data(color)',
        shape: 'data(shape)',
        'border-color': 'data(entityTypeColor)',
        'border-width': 1.8,
        width: 'data(size)',
        height: 'data(size)',
        label: 'data(label)',
        color: '#111827',
        'font-family': 'Inter',
        'font-size': 11,
        'text-outline-color': '#ffffff',
        'text-outline-width': 3,
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'shadow-blur': 18,
        'shadow-color': communityMode ? 'data(communityColor)' : 'data(color)',
        'shadow-opacity': 0.5,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
        'transition-property': 'background-color, border-color, width, height, opacity',
        'transition-duration': 180,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#111827',
        'border-width': 4,
        'shadow-opacity': 0.95,
      },
    },
    {
      selector: 'node[dbBadge]',
      style: {
        'pie-size': '88%',
        'pie-1-background-color': 'data(badge1)',
        'pie-1-background-size': 'data(badge1Size)',
        'pie-2-background-color': 'data(badge2)',
        'pie-2-background-size': 'data(badge2Size)',
        'pie-3-background-color': 'data(badge3)',
        'pie-3-background-size': 'data(badge3Size)',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 'data(width)',
        label: 'data(label)',
        color: '#111827',
        'font-size': 9,
        'font-family': 'IBM Plex Mono',
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.86,
        'text-background-padding': 3,
        'line-color': 'data(color)',
        'target-arrow-color': 'data(color)',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.95,
        opacity: 0.78,
        'curve-style': 'bezier',
        'control-point-distance': 'data(curve)',
        'control-point-weight': 0.52,
        'shadow-blur': 8,
        'shadow-color': 'data(color)',
        'shadow-opacity': 0.18,
        'transition-property': 'opacity, line-color, width',
        'transition-duration': 160,
      },
    },
    {
      selector: 'edge[multiLabel]',
      style: {
        label: 'data(multiLabel)',
        'font-weight': 700,
        'font-size': 11,
      },
    },
    {
      selector: '.dimmed',
      style: {
        opacity: 0.12,
      },
    },
    {
      selector: '.filter-muted',
      style: {
        opacity: 0.06,
        events: 'no',
      },
    },
    {
      selector: '.highlighted',
      style: {
        opacity: 1,
        'border-color': '#00d4ff',
        'border-width': 4,
        'line-color': '#111827',
        'target-arrow-color': '#111827',
        'shadow-opacity': 0.85,
        'z-index': 999,
      },
    },
    {
      selector: '.search-match',
      style: {
        'border-color': '#10b981',
        'border-width': 5,
        'shadow-color': '#10b981',
        'shadow-opacity': 0.95,
      },
    },
    {
      selector: '.hidden-by-filter',
      style: {
        display: 'none',
        events: 'no',
      },
    },
  ];
}

export function layoutOptions(layout, centralityMap = {}) {
  const common = { animate: true, animationDuration: 450, fit: true, padding: 70 };
  if (layout === 'dagre') return { name: 'dagre', rankDir: 'TB', nodeSep: 70, rankSep: 110, ...common };
  if (layout === 'cose-bilkent') return { name: 'cose-bilkent', idealEdgeLength: 120, nodeRepulsion: 7000, gravity: 0.18, ...common };
  if (layout === 'concentric') {
    return {
      name: 'concentric',
      concentric: (node) => centralityMap[node.id()]?.degree || 1,
      levelWidth: () => 2,
      minNodeSpacing: 54,
      ...common,
    };
  }
  if (layout === 'grid') return { name: 'grid', avoidOverlap: true, spacingFactor: 1.1, ...common };
  return { name: 'cola', nodeSpacing: 38, edgeLengthVal: 125, randomize: false, maxSimulationTime: 1800, ...common };
}
