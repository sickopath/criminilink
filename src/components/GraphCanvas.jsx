import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useGraphStore } from '../store/useGraphStore';
import { colorForRelationship, communityColor, entityTypeConfig, getCytoscapeStyles, layoutOptions } from '../utils/cytoscapeStyles';

cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

function mergeActiveGraph(databases, metrics) {
  const nodes = new Map();
  const edgeGroups = new Map();

  databases.filter((db) => db.active).forEach((db) => {
    db.nodes.forEach((node) => {
      const id = node.canonicalId || node.label;
      const existing = nodes.get(id) || {
        id,
        label: id,
        entityType: node.entityType || 'other',
        dbIds: [],
        dbNames: [],
        dbColors: [],
        color: db.color,
      };
      if (!existing.dbIds.includes(db.id)) {
        existing.dbIds.push(db.id);
        existing.dbNames.push(db.name);
        existing.dbColors.push(db.color);
      }
      nodes.set(id, existing);
    });

    db.edges.forEach((edge, index) => {
      const key = `${edge.source}:::${edge.target}`;
      const list = edgeGroups.get(key) || [];
      list.push({ ...edge, id: edge.id || `${db.id}-${index}`, dbName: db.name, dbColor: db.color });
      edgeGroups.set(key, list);
    });
  });

  const cyNodes = Array.from(nodes.values()).map((node) => {
    const degree = metrics.nodeMetrics?.[node.id]?.degree || 1;
    const badges = node.dbColors.slice(0, 3);
    const typeConfig = entityTypeConfig[node.entityType] || entityTypeConfig.other;
    return {
      data: {
        ...node,
        entityTypeLabel: typeConfig.label,
        entityTypeColor: typeConfig.color,
        shape: typeConfig.shape,
        size: Math.min(72, 28 + degree * 4),
        degree,
        community: metrics.nodeMetrics?.[node.id]?.community ?? 0,
        communityColor: communityColor(metrics.nodeMetrics?.[node.id]?.community ?? 0),
        dbBadge: node.dbColors.length > 1,
        badge1: badges[0] || node.color,
        badge2: badges[1] || badges[0] || node.color,
        badge3: badges[2] || badges[1] || badges[0] || node.color,
        badge1Size: badges.length === 1 ? 100 : badges.length === 2 ? 50 : 34,
        badge2Size: badges.length === 2 ? 50 : badges.length >= 3 ? 33 : 0,
        badge3Size: badges.length >= 3 ? 33 : 0,
      },
    };
  });

  const cyEdges = [];
  edgeGroups.forEach((relationships, key) => {
    const [source, target] = key.split(':::');
    const count = relationships.length;
    relationships.forEach((edge, index) => {
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 34;
      cyEdges.push({
        data: {
          id: `${edge.id}-${index}`,
          source,
          target,
          label: edge.relationship,
          relationship: edge.relationship,
          context: edge.context,
          color: colorForRelationship(edge.relationship, index),
          width: Math.min(8, 1.8 + count * 0.8),
          curve: offset,
          count,
          multiLabel: count > 1 && index === Math.floor(count / 2) ? `×${count} ${edge.relationship}` : edge.relationship,
          relationships,
          dbName: edge.dbName,
          dbColor: edge.dbColor,
        },
      });
    });
  });

  return [...cyNodes, ...cyEdges];
}

function downloadPng(dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'criminlink-graph.png';
  link.click();
}

function orientation(a, b, c) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function countEdgeCrossings(collection) {
  const edges = collection.edges().filter((edge) => !edge.hasClass('hidden-by-filter') && !edge.source().hasClass('hidden-by-filter') && !edge.target().hasClass('hidden-by-filter'));
  let crossings = 0;

  for (let i = 0; i < edges.length; i += 1) {
    const first = edges[i];
    const firstSource = first.source().id();
    const firstTarget = first.target().id();
    const a = first.source().position();
    const b = first.target().position();

    for (let j = i + 1; j < edges.length; j += 1) {
      const second = edges[j];
      const secondSource = second.source().id();
      const secondTarget = second.target().id();
      const sharesEndpoint = [firstSource, firstTarget].includes(secondSource) || [firstSource, firstTarget].includes(secondTarget);
      const samePair = firstSource === secondSource && firstTarget === secondTarget;
      if (sharesEndpoint || samePair) continue;
      if (segmentsIntersect(a, b, second.source().position(), second.target().position())) crossings += 1;
    }
  }

  return crossings;
}

function getCrossingCollection(cy) {
  const filtered = cy
    .elements()
    .filter((element) => !element.hasClass('hidden-by-filter') && !element.hasClass('dimmed'));
  if (filtered.nodes().length >= 3 && filtered.edges().length >= 2) return filtered;

  return cy.elements().filter((element) => !element.hasClass('hidden-by-filter'));
}

function spreadCollection(collection, factor = 1.08) {
  const nodes = collection.nodes();
  if (!nodes.length) return;
  const center = nodes.reduce(
    (acc, node) => {
      const position = node.position();
      return { x: acc.x + position.x, y: acc.y + position.y };
    },
    { x: 0, y: 0 },
  );
  center.x /= nodes.length;
  center.y /= nodes.length;

  nodes.forEach((node) => {
    const position = node.position();
    node.position({
      x: center.x + (position.x - center.x) * factor,
      y: center.y + (position.y - center.y) * factor,
    });
  });
}

function waitForLayout(layout, timeout = 2600) {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    layout.one('layoutstop', done);
    layout.run();
    window.setTimeout(done, timeout);
  });
}

async function minimizeCrossings(cy, metrics) {
  const layoutCollection = cy ? getCrossingCollection(cy) : null;
  if (!cy || !layoutCollection || layoutCollection.nodes().length < 3 || layoutCollection.edges().length < 2) {
    toast('Pas assez de structure visible à décroiser.');
    return;
  }

  const candidates = [
    { name: 'dagre', rankDir: 'TB', nodeSep: 135, rankSep: 175, edgeSep: 62, animate: false, fit: true, padding: 90 },
    { name: 'dagre', rankDir: 'LR', nodeSep: 130, rankSep: 170, edgeSep: 62, animate: false, fit: true, padding: 90 },
    { name: 'cola', nodeSpacing: 92, edgeLengthVal: 205, avoidOverlap: true, unconstrIter: 48, userConstIter: 34, allConstIter: 34, randomize: false, animate: false, fit: true, padding: 90 },
    { name: 'cose-bilkent', idealEdgeLength: 180, nodeRepulsion: 14500, gravity: 0.09, randomize: false, animate: false, fit: true, padding: 90 },
    { ...layoutOptions('concentric', metrics.nodeMetrics), animate: false, fit: true, padding: 80 },
  ];

  let best = {
    score: Number.POSITIVE_INFINITY,
    positions: {},
    name: '',
  };

  const scopeLabel = layoutCollection.length < cy.elements().length ? ' sur le filtre actif' : '';
  toast.loading(`Décroisement${scopeLabel}...`, { id: 'crossings' });
  for (const options of candidates) {
    const layout = layoutCollection.layout(options);
    await waitForLayout(layout);
    spreadCollection(layoutCollection, 1.08);
    const score = countEdgeCrossings(layoutCollection);
    console.log('CriminLink crossing candidate', options.name, options.rankDir || '', score);
    if (score < best.score) {
      best = {
        score,
        name: `${options.name}${options.rankDir ? ` ${options.rankDir}` : ''}`,
        positions: Object.fromEntries(layoutCollection.nodes().map((node) => [node.id(), { ...node.position() }])),
      };
    }
  }

  cy.batch(() => {
    layoutCollection.nodes().forEach((node) => {
      if (best.positions[node.id()]) node.position(best.positions[node.id()]);
    });
  });
  cy.fit(layoutCollection, 80);
  toast.success(`Meilleur décroisement: ${best.name}, ${best.score} croisement${best.score === 1 ? '' : 's'}.`, { id: 'crossings' });
}

const GraphCanvas = forwardRef(function GraphCanvas(_, ref) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [miniMap, setMiniMap] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const databases = useGraphStore((state) => state.databases);
  const filters = useGraphStore((state) => state.filters);
  const layout = useGraphStore((state) => state.layout);
  const snaMetrics = useGraphStore((state) => state.snaMetrics);
  const communityMode = useGraphStore((state) => state.communityMode);
  const focusNode = useGraphStore((state) => state.focusNode);
  const highlightedNodeId = useGraphStore((state) => state.highlightedNodeId);
  const actions = useGraphStore((state) => state.actions);
  const filtersRef = useRef(filters);
  const focusNodeRef = useRef(focusNode);
  const snaMetricsRef = useRef(snaMetrics);

  const elements = useMemo(() => mergeActiveGraph(databases, snaMetrics), [databases, snaMetrics]);

  useEffect(() => {
    filtersRef.current = filters;
    focusNodeRef.current = focusNode;
    snaMetricsRef.current = snaMetrics;
  }, [filters, focusNode, snaMetrics]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.18, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } }),
    zoomOut: () => cyRef.current?.zoom({ level: cyRef.current.zoom() / 1.18, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } }),
    fit: () => cyRef.current?.fit(undefined, 60),
    reset: () => {
      cyRef.current?.elements().removeClass('dimmed highlighted search-match hidden-by-filter filter-muted');
      cyRef.current?.layout(layoutOptions(layout, snaMetricsRef.current.nodeMetrics)).run();
      if (cyRef.current) applyFilters(cyRef.current, filtersRef.current, focusNodeRef.current, snaMetricsRef.current);
    },
    png: () => {
      if (!cyRef.current) return;
      downloadPng(cyRef.current.png({ scale: 2, full: false, bg: '#ffffff' }));
      toast.success('PNG exported.');
    },
    minimizeCrossings: () => minimizeCrossings(cyRef.current, snaMetricsRef.current),
  }));

  useEffect(() => {
    if (!containerRef.current) return undefined;
    console.log('CriminLink initializing Cytoscape');
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: getCytoscapeStyles({ communityMode }),
      layout: layoutOptions(layout, snaMetrics.nodeMetrics),
      wheelSensitivity: 0.18,
      minZoom: 0.12,
      maxZoom: 3,
    });

    const cy = cyRef.current;
    cy.on('tap', 'node', (event) => {
      const data = event.target.data();
      actions.setSelectedNode(data);
      console.log('CriminLink node clicked', data);
    });
    cy.on('tap', 'edge', (event) => {
      const data = event.target.data();
      actions.setSelectedEdge({ source: data.source, target: data.target, relationships: data.relationships || [data] });
      console.log('CriminLink edge clicked', data);
    });
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      if (node.hasClass('hidden-by-filter') || node.hasClass('filter-muted')) return;
      cy.elements().not('.hidden-by-filter').not('.filter-muted').addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      node
        .connectedEdges()
        .not('.hidden-by-filter')
        .not('.filter-muted')
        .filter((edge) => !edge.source().hasClass('hidden-by-filter') && !edge.target().hasClass('hidden-by-filter'))
        .removeClass('dimmed')
        .addClass('highlighted');
      node.neighborhood('node').not('.hidden-by-filter').not('.filter-muted').removeClass('dimmed').addClass('highlighted');
    });
    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('dimmed highlighted');
      applyFilters(cy, filtersRef.current, focusNodeRef.current, snaMetricsRef.current);
    });
    cy.on('mouseover', 'edge', (event) => {
      const data = event.target.data();
      if (event.target.hasClass('hidden-by-filter') || event.target.hasClass('filter-muted')) return;
      event.target.addClass('highlighted');
      setTooltip({
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
        title: data.relationship,
        text: `${data.context || ''}`.slice(0, 80),
      });
    });
    cy.on('mousemove', 'edge', (event) => {
      if (event.target.hasClass('hidden-by-filter') || event.target.hasClass('filter-muted')) return;
      setTooltip((current) => current && { ...current, x: event.originalEvent.clientX, y: event.originalEvent.clientY });
    });
    cy.on('mouseout', 'edge', (event) => {
      event.target.removeClass('highlighted');
      setTooltip(null);
    });
    cy.on('layoutstop render zoom pan', () => {
      window.clearTimeout(cyRef.current?._miniTimer);
      cyRef.current._miniTimer = window.setTimeout(() => {
        try {
          setMiniMap(cy.png({ scale: 0.18, full: true, bg: '#ffffff' }));
        } catch (error) {
          console.log('CriminLink minimap update failed', error);
        }
      }, 250);
    });
    return () => cy.destroy();
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.json({ elements });
    cy.style(getCytoscapeStyles({ communityMode }));
    cy.layout(layoutOptions(layout, snaMetrics.nodeMetrics)).run();
    applyFilters(cy, filters, focusNode, snaMetrics);
    console.log('CriminLink graph elements updated', elements.length);
  }, [elements, communityMode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout(layoutOptions(layout, snaMetrics.nodeMetrics)).run();
  }, [layout, snaMetrics.nodeMetrics]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyFilters(cy, filters, focusNode, snaMetrics);
  }, [filters, focusNode, snaMetrics]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !highlightedNodeId) return;
    cy.elements().removeClass('highlighted dimmed');
    const node = cy.getElementById(highlightedNodeId);
    if (node.length && !node.hasClass('hidden-by-filter') && !node.hasClass('filter-muted')) {
      cy.elements().not('.hidden-by-filter').not('.filter-muted').addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      node
        .connectedEdges()
        .not('.hidden-by-filter')
        .not('.filter-muted')
        .filter((edge) => !edge.source().hasClass('hidden-by-filter') && !edge.target().hasClass('hidden-by-filter'))
        .removeClass('dimmed')
        .addClass('highlighted');
      node.neighborhood('node').not('.hidden-by-filter').not('.filter-muted').removeClass('dimmed').addClass('highlighted');
      cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.15) }, { duration: 350 });
    }
  }, [highlightedNodeId]);

  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-white">
      <div ref={containerRef} className="h-full w-full" />
      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-dashed border-cyan/40 bg-white/85 px-8 py-6 text-center shadow-lg">
            <div className="font-heading text-3xl font-bold uppercase tracking-[0.18em] text-slate-950">Aucun graphe actif</div>
            <div className="mt-1 text-sm text-slate-600">Importez des relations pour activer le canvas.</div>
          </div>
        </div>
      )}
      <div className="glass absolute bottom-5 right-5 h-36 w-52 overflow-hidden p-2">
        {miniMap ? <img src={miniMap} alt="Graph minimap" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">MINI-CARTE</div>}
      </div>
      {tooltip && (
        <div className="cy-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          <div className="font-bold text-cyan">{tooltip.title}</div>
          <div className="text-slate-300">{tooltip.text}</div>
        </div>
      )}
    </main>
  );
});

function applyFilters(cy, filters, focusNode, metrics) {
  cy.elements().removeClass('hidden-by-filter filter-muted dimmed highlighted search-match');
  const relationshipTypes = filters.relationshipTypes || [];
  const search = filters.searchQuery?.trim().toLowerCase();
  const hasFilters = Boolean(search || relationshipTypes.length || filters.minDegree > 0 || filters.communityId !== null || focusNode);
  const hideNonMatching = Boolean(filters.hideNonMatching);

  cy.nodes().forEach((node) => {
    const nodeMetrics = metrics.nodeMetrics?.[node.id()] || {};
    const failsSearch = search && !node.data('label').toLowerCase().includes(search);
    const failsDegree = (nodeMetrics.degree || 0) < (filters.minDegree || 0);
    const failsCommunity = filters.communityId !== null && Number(nodeMetrics.community) !== Number(filters.communityId);
    const failsFocus =
      focusNode &&
      node.id() !== focusNode &&
      !node.connectedEdges().some((edge) => edge.source().id() === focusNode || edge.target().id() === focusNode);
    const failsRelationship =
      relationshipTypes.length > 0 &&
      !node.connectedEdges().some((edge) => relationshipTypes.includes(edge.data('relationship')));
    const failsAny = failsSearch || failsDegree || failsCommunity || failsFocus || failsRelationship;

    node.data('passesFilters', !failsAny);
    if (hasFilters && failsAny) node.addClass(hideNonMatching ? 'hidden-by-filter' : 'filter-muted');
    if (search) {
      if (node.data('label').toLowerCase().includes(search)) node.addClass('search-match');
    }
  });

  cy.edges().forEach((edge) => {
    const failsRelationship = relationshipTypes.length > 0 && !relationshipTypes.includes(edge.data('relationship'));
    const failsEndpoint = !edge.source().data('passesFilters') || !edge.target().data('passesFilters');
    const failsFocus = focusNode && edge.source().id() !== focusNode && edge.target().id() !== focusNode;
    const failsAny = failsRelationship || failsEndpoint || failsFocus;
    if (hasFilters && failsAny) edge.addClass(hideNonMatching ? 'hidden-by-filter' : 'filter-muted');
  });
}

export default GraphCanvas;
