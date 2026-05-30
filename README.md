# CrimLink

CrimLink is a browser-based criminal intelligence relationship graph analyzer. It lets investigators import CSV relationship data, manage multiple graph databases, visualize links with Cytoscape.js, and inspect social network analysis metrics from a single React/Vite interface.

## Features

- Import one or more CSV graph databases.
- Show, hide, persist, and delete databases independently.
- Visualize directed relationship graphs with Cytoscape.js.
- Switch between force, hierarchical, organic, centrality, and grid layouts.
- Minimize link crossings on the visible or filtered graph.
- Search entities and filter by relationship type, community, and minimum degree.
- Hide entities that do not match active filters.
- Inspect node details, connected relationships, ego networks, and per-node SNA metrics.
- Inspect all relationships between two entities from edge popups.
- Compute global graph metrics, rankings, PageRank, clustering, and Louvain communities.
- Export PNG, visible graph CSV, and SNA metrics CSV.
- Persist imported databases in local browser storage.

## Tech Stack

- React 18
- Vite
- Tailwind CSS v3
- Cytoscape.js
- cytoscape-cola
- cytoscape-dagre
- cytoscape-cose-bilkent
- graphology
- graphology-metrics
- graphology-communities-louvain
- papaparse
- Zustand
- lucide-react
- react-hot-toast

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The app runs locally at:

```text
http://localhost:5173/
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## CSV Format

CrimLink expects a CSV with these fields:

```csv
node1,node2,relationship,context
Marco Vitali,Tony Ferrante,associé à,Marco Vitali et Tony Ferrante ont été observés ensemble.
```

Required columns:

- `node1`: source entity name
- `node2`: target entity name
- `relationship`: relationship type or label
- `context`: investigative context sentence

Comma and semicolon delimiters are auto-detected. Columns can also be mapped manually during import.

## Sample Data

A fictional sample dataset is included at:

```text
public/sample-data.csv
```

Use the **Load Sample Data** button in the app to load it as `Opération Cargo`.

## Entity Types

CrimLink automatically infers basic entity types from names and values:

- Personne
- Compagnie
- Lieu
- Adresse
- Téléphone
- Courriel
- Info financière
- Autre

These types are represented with visual styling on graph nodes and listed in the sidebar legend.

## Persistence

Imported databases are saved in `localStorage`, so they remain available after a browser refresh. Deleting a database from the sidebar removes it from local persistence after confirmation.

## Notes

- The app is a client-side SPA and does not require a backend.
- Large graphs can take longer to layout, especially with crossing minimization.
- Browser storage limits apply when importing very large datasets.
