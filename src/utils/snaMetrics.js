import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

function getCanonicalNodeId(node) {
  return node.canonicalId || node.id || node.label;
}

export function buildGraphologyGraph(databases) {
  const graph = new Graph({ type: 'directed', multi: true, allowSelfLoops: true });
  const nodeDbMap = new Map();

  databases.forEach((db) => {
    if (!db.active) return;

    db.nodes.forEach((node) => {
      const id = getCanonicalNodeId(node);
      const current = nodeDbMap.get(id) || {
        dbIds: [],
        dbNames: [],
        dbColors: [],
      };
      if (!current.dbIds.includes(db.id)) {
        current.dbIds.push(db.id);
        current.dbNames.push(db.name);
        current.dbColors.push(db.color);
      }
      nodeDbMap.set(id, current);

      if (!graph.hasNode(id)) {
        graph.addNode(id, {
          label: id,
          color: db.color,
          dbIds: current.dbIds,
          dbNames: current.dbNames,
          dbColors: current.dbColors,
        });
      } else {
        graph.mergeNodeAttributes(id, current);
      }
    });

    db.edges.forEach((edge, index) => {
      const source = edge.source;
      const target = edge.target;
      if (!graph.hasNode(source)) graph.addNode(source, { label: source, color: db.color });
      if (!graph.hasNode(target)) graph.addNode(target, { label: target, color: db.color });
      graph.addDirectedEdgeWithKey(`${db.id}-${index}-${source}-${target}`, source, target, {
        relationship: edge.relationship,
        context: edge.context,
        dbId: db.id,
        dbName: db.name,
      });
    });
  });

  return graph;
}

function neighborsUndirected(graph, node) {
  return Array.from(new Set([...graph.inNeighbors(node), ...graph.outNeighbors(node)]));
}

function bfsDistances(graph, source) {
  const distances = new Map([[source, 0]]);
  const queue = [source];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    neighborsUndirected(graph, current).forEach((neighbor) => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distances.get(current) + 1);
        queue.push(neighbor);
      }
    });
  }
  return distances;
}

function connectedComponents(graph) {
  const seen = new Set();
  const components = [];
  graph.forEachNode((node) => {
    if (seen.has(node)) return;
    const queue = [node];
    const component = [];
    seen.add(node);
    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      component.push(current);
      neighborsUndirected(graph, current).forEach((neighbor) => {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    components.push(component);
  });
  return components;
}

function clusteringCoefficient(graph, node) {
  const neighbors = neighborsUndirected(graph, node);
  const k = neighbors.length;
  if (k < 2) return 0;
  let links = 0;
  for (let i = 0; i < neighbors.length; i += 1) {
    for (let j = i + 1; j < neighbors.length; j += 1) {
      if (graph.hasEdge(neighbors[i], neighbors[j]) || graph.hasEdge(neighbors[j], neighbors[i])) links += 1;
    }
  }
  return (2 * links) / (k * (k - 1));
}

function pageRank(graph, damping = 0.85, iterations = 40) {
  const nodes = graph.nodes();
  const n = nodes.length || 1;
  const ranks = Object.fromEntries(nodes.map((node) => [node, 1 / n]));

  for (let i = 0; i < iterations; i += 1) {
    const next = Object.fromEntries(nodes.map((node) => [node, (1 - damping) / n]));
    nodes.forEach((node) => {
      const out = graph.outNeighbors(node);
      if (!out.length) {
        nodes.forEach((target) => {
          next[target] += (damping * ranks[node]) / n;
        });
      } else {
        out.forEach((target) => {
          next[target] += (damping * ranks[node]) / out.length;
        });
      }
    });
    Object.assign(ranks, next);
  }
  return ranks;
}

function eigenvectorCentrality(graph, iterations = 60) {
  const nodes = graph.nodes();
  let scores = Object.fromEntries(nodes.map((node) => [node, 1]));
  for (let i = 0; i < iterations; i += 1) {
    const next = Object.fromEntries(nodes.map((node) => [node, 0]));
    nodes.forEach((node) => {
      neighborsUndirected(graph, node).forEach((neighbor) => {
        next[node] += scores[neighbor];
      });
    });
    const norm = Math.sqrt(Object.values(next).reduce((sum, value) => sum + value * value, 0)) || 1;
    scores = Object.fromEntries(nodes.map((node) => [node, next[node] / norm]));
  }
  return scores;
}

function betweennessCentrality(graph) {
  const nodes = graph.nodes();
  const cb = Object.fromEntries(nodes.map((node) => [node, 0]));

  nodes.forEach((source) => {
    const stack = [];
    const predecessors = Object.fromEntries(nodes.map((node) => [node, []]));
    const sigma = Object.fromEntries(nodes.map((node) => [node, 0]));
    const distance = Object.fromEntries(nodes.map((node) => [node, -1]));
    sigma[source] = 1;
    distance[source] = 0;
    const queue = [source];

    for (let i = 0; i < queue.length; i += 1) {
      const vertex = queue[i];
      stack.push(vertex);
      neighborsUndirected(graph, vertex).forEach((neighbor) => {
        if (distance[neighbor] < 0) {
          queue.push(neighbor);
          distance[neighbor] = distance[vertex] + 1;
        }
        if (distance[neighbor] === distance[vertex] + 1) {
          sigma[neighbor] += sigma[vertex];
          predecessors[neighbor].push(vertex);
        }
      });
    }

    const delta = Object.fromEntries(nodes.map((node) => [node, 0]));
    while (stack.length) {
      const w = stack.pop();
      predecessors[w].forEach((v) => {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      });
      if (w !== source) cb[w] += delta[w];
    }
  });

  const scale = nodes.length > 2 ? 1 / ((nodes.length - 1) * (nodes.length - 2)) : 1;
  Object.keys(cb).forEach((node) => {
    cb[node] *= scale;
  });
  return cb;
}

function closenessCentrality(graph) {
  const scores = {};
  const n = graph.order;
  graph.forEachNode((node) => {
    const distances = bfsDistances(graph, node);
    const total = Array.from(distances.values()).reduce((sum, value) => sum + value, 0);
    scores[node] = total > 0 && n > 1 ? (distances.size - 1) / total : 0;
  });
  return scores;
}

function topRanking(nodeMetrics, key) {
  return Object.entries(nodeMetrics)
    .sort((a, b) => (b[1][key] || 0) - (a[1][key] || 0))
    .slice(0, 10)
    .map(([node, values], index) => ({ rank: index + 1, node, score: values[key] || 0, dbColors: values.dbColors || [], dbNames: values.dbNames || [] }));
}

function safeLouvain(graph) {
  if (!graph.order) return {};
  try {
    if (typeof louvain === 'function') return louvain(graph);
    if (typeof louvain.assign === 'function') {
      const copy = graph.copy();
      louvain.assign(copy);
      const result = {};
      copy.forEachNode((node, attrs) => {
        result[node] = attrs.community ?? 0;
      });
      return result;
    }
  } catch (error) {
    console.log('Louvain computation failed, falling back to component IDs.', error);
  }
  const result = {};
  connectedComponents(graph).forEach((component, index) => {
    component.forEach((node) => {
      result[node] = index;
    });
  });
  return result;
}

export function computeSnaMetrics(databases) {
  const graph = buildGraphologyGraph(databases);
  const nodes = graph.nodes();
  const nodeCount = graph.order;
  const edgeCount = graph.size;

  if (!nodeCount) {
    return {
      graph,
      global: {
        nodeCount: 0,
        edgeCount: 0,
        components: 0,
        density: 0,
        averageDegree: 0,
        maxDegree: 0,
        averageClustering: 0,
        diameter: 0,
        averagePathLength: 0,
      },
      nodeMetrics: {},
      rankings: {},
      communities: {},
      communityList: [],
    };
  }

  const communities = safeLouvain(graph);
  const pr = pageRank(graph);
  const eigen = eigenvectorCentrality(graph);
  const between = betweennessCentrality(graph);
  const close = closenessCentrality(graph);

  let pathTotal = 0;
  let pathPairs = 0;
  let diameter = 0;
  nodes.forEach((node) => {
    const distances = bfsDistances(graph, node);
    distances.forEach((distance, target) => {
      if (node !== target) {
        pathTotal += distance;
        pathPairs += 1;
        diameter = Math.max(diameter, distance);
      }
    });
  });

  const nodeMetrics = {};
  let degreeTotal = 0;
  let maxDegree = 0;
  let clusteringTotal = 0;
  nodes.forEach((node) => {
    const attrs = graph.getNodeAttributes(node);
    const degree = graph.degree(node);
    const clustering = clusteringCoefficient(graph, node);
    degreeTotal += degree;
    maxDegree = Math.max(maxDegree, degree);
    clusteringTotal += clustering;
    nodeMetrics[node] = {
      node,
      degree,
      inDegree: graph.inDegree(node),
      outDegree: graph.outDegree(node),
      betweenness: between[node] || 0,
      closeness: close[node] || 0,
      eigenvector: eigen[node] || 0,
      pageRank: pr[node] || 0,
      clustering,
      community: communities[node] ?? 0,
      dbIds: attrs.dbIds || [],
      dbNames: attrs.dbNames || [],
      dbColors: attrs.dbColors || [attrs.color].filter(Boolean),
    };
  });

  const componentList = connectedComponents(graph);
  const communityMap = new Map();
  Object.entries(communities).forEach(([node, community]) => {
    const entry = communityMap.get(community) || [];
    entry.push(node);
    communityMap.set(community, entry);
  });
  const communityList = Array.from(communityMap.entries())
    .map(([id, members]) => ({
      id,
      size: members.length,
      members: members.slice(0, 3),
    }))
    .sort((a, b) => b.size - a.size);

  return {
    graph,
    global: {
      nodeCount,
      edgeCount,
      components: componentList.length,
      density: nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0,
      averageDegree: degreeTotal / nodeCount,
      maxDegree,
      averageClustering: clusteringTotal / nodeCount,
      diameter,
      averagePathLength: pathPairs ? pathTotal / pathPairs : 0,
    },
    nodeMetrics,
    rankings: {
      degree: topRanking(nodeMetrics, 'degree'),
      betweenness: topRanking(nodeMetrics, 'betweenness'),
      closeness: topRanking(nodeMetrics, 'closeness'),
      eigenvector: topRanking(nodeMetrics, 'eigenvector'),
      pageRank: topRanking(nodeMetrics, 'pageRank'),
    },
    communities,
    communityList,
  };
}
