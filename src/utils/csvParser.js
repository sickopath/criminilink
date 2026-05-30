import Papa from 'papaparse';

const REQUIRED_FIELDS = ['node1', 'node2', 'relationship', 'context'];
const FIELD_ALIASES = {
  node1: ['node1', 'source', 'from', 'origine', 'entity1', 'personne1'],
  node2: ['node2', 'target', 'to', 'destination', 'entity2', 'personne2'],
  relationship: ['relationship', 'relation', 'type', 'label', 'lien'],
  context: ['context', 'contexte', 'description', 'note', 'details'],
};

export function inferEntityType(name) {
  const value = String(name || '').trim();
  const lower = value.toLowerCase();

  if (/(\+?\d[\d\s().-]{7,}\d)/.test(value)) return 'phone';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  if (/\b(inc\.?|corp\.?|corporation|holdings?|express|logistics?|transport|compagnie|company|llc|ltée|ltd\.?|s\.a\.|sarl)\b/i.test(value)) return 'company';
  if (/\b(port|rue|avenue|av\.|boulevard|boul\.|street|st\.|road|rd\.|montréal|montreal|warehouse|entrepôt)\b/i.test(value)) return 'place';
  if (/^\d+\s+/.test(value)) return 'address';
  if (/^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'-]+){1,3}$/.test(value)) return 'person';
  if (lower.includes('compte') || lower.includes('iban') || lower.includes('swift')) return 'financial';
  return 'other';
}

export function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]/g, '');
}

export function detectColumnMapping(headers = []) {
  const normalized = headers.map((header) => ({ raw: header, key: normalizeHeader(header) }));
  const mapping = {};

  REQUIRED_FIELDS.forEach((field) => {
    const aliases = FIELD_ALIASES[field].map(normalizeHeader);
    const match = normalized.find((entry) => aliases.includes(entry.key));
    mapping[field] = match?.raw || '';
  });

  return mapping;
}

export function parseCsvText(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t', '|'],
    transformHeader: (header) => header.trim(),
  });

  const rows = (result.data || []).filter((row) =>
    Object.values(row).some((value) => String(value || '').trim().length > 0),
  );

  const headers = result.meta?.fields || [];
  return {
    rows,
    headers,
    delimiter: result.meta?.delimiter || ',',
    errors: result.errors || [],
  };
}

export function validateRows(rows, mapping) {
  const missing = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  if (missing.length) {
    throw new Error(`Missing required column mapping: ${missing.join(', ')}`);
  }

  if (!rows.length) {
    throw new Error('CSV is empty or contains no data rows.');
  }

  const malformed = [];
  rows.forEach((row, index) => {
    const missingFields = REQUIRED_FIELDS.filter((field) => !String(row[mapping[field]] || '').trim());
    if (missingFields.length) {
      malformed.push(`Row ${index + 2}: ${missingFields.join(', ')}`);
    }
  });

  if (malformed.length) {
    throw new Error(`Malformed rows detected. ${malformed.slice(0, 5).join('; ')}`);
  }
}

export function buildGraphFromRows(rows, mapping, dbId, dbName, dbColor) {
  validateRows(rows, mapping);

  const nodesByName = new Map();
  const edges = [];

  rows.forEach((row, index) => {
    const source = String(row[mapping.node1]).trim();
    const target = String(row[mapping.node2]).trim();
    const relationship = String(row[mapping.relationship]).trim();
    const context = String(row[mapping.context]).trim();

    [source, target].forEach((name) => {
      if (!nodesByName.has(name)) {
        nodesByName.set(name, {
          id: `${dbId}::${name}`,
          canonicalId: name,
          label: name,
          entityType: inferEntityType(name),
          dbIds: [dbId],
          dbNames: [dbName],
          dbColors: [dbColor],
          primaryDbId: dbId,
          color: dbColor,
        });
      }
    });

    edges.push({
      id: `${dbId}::edge::${index}::${source}::${target}`,
      source,
      target,
      sourceId: `${dbId}::${source}`,
      targetId: `${dbId}::${target}`,
      relationship,
      context,
      dbId,
      dbName,
      dbColor,
      rowNumber: index + 2,
    });
  });

  return {
    nodes: Array.from(nodesByName.values()),
    edges,
  };
}

export function graphToCsv(edges) {
  const rows = edges.map((edge) => ({
    node1: edge.source,
    node2: edge.target,
    relationship: edge.relationship,
    context: edge.context,
    database: edge.dbName,
  }));

  return Papa.unparse(rows);
}

export function metricsToCsv(metrics) {
  const rows = Object.entries(metrics?.nodeMetrics || {}).map(([node, values]) => ({
    node,
    degree: values.degree || 0,
    inDegree: values.inDegree || 0,
    outDegree: values.outDegree || 0,
    betweenness: values.betweenness || 0,
    closeness: values.closeness || 0,
    eigenvector: values.eigenvector || 0,
    pageRank: values.pageRank || 0,
    clustering: values.clustering || 0,
    community: values.community ?? '',
    databases: (values.dbNames || []).join('|'),
  }));

  return Papa.unparse(rows);
}

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      delimitersToGuess: [',', ';', '\t', '|'],
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const rows = (result.data || []).filter((row) =>
          Object.values(row).some((value) => String(value || '').trim().length > 0),
        );
        resolve({
          rows,
          headers: result.meta?.fields || [],
          delimiter: result.meta?.delimiter || ',',
          errors: result.errors || [],
        });
      },
      error: reject,
    });
  });
}
