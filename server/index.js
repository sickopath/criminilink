import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'criminlink.sqlite');
const port = Number(process.env.CRIMINLINK_API_PORT || 5174);

fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS graph_databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    nodes_json TEXT NOT NULL,
    edges_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const app = express();
app.use(express.json({ limit: '60mb' }));

function rowToDatabase(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    active: Boolean(row.active),
    nodes: JSON.parse(row.nodes_json),
    edges: JSON.parse(row.edges_json),
    createdAt: row.created_at,
  };
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, database: dbPath });
});

app.get('/api/databases', (_request, response) => {
  const rows = sqlite.prepare('SELECT * FROM graph_databases ORDER BY created_at ASC').all();
  response.json({ databases: rows.map(rowToDatabase) });
});

app.post('/api/databases', (request, response) => {
  const db = request.body;
  if (!db?.id || !db?.name || !Array.isArray(db.nodes) || !Array.isArray(db.edges)) {
    response.status(400).json({ error: 'Payload de BD invalide.' });
    return;
  }

  try {
    sqlite
      .prepare(
        `INSERT INTO graph_databases (id, name, color, active, nodes_json, edges_json, created_at)
         VALUES (@id, @name, @color, @active, @nodes_json, @edges_json, @created_at)`,
      )
      .run({
        id: db.id,
        name: db.name,
        color: db.color || '#00d4ff',
        active: db.active === false ? 0 : 1,
        nodes_json: JSON.stringify(db.nodes),
        edges_json: JSON.stringify(db.edges),
        created_at: db.createdAt || new Date().toISOString(),
      });

    const row = sqlite.prepare('SELECT * FROM graph_databases WHERE id = ?').get(db.id);
    response.status(201).json({ database: rowToDatabase(row) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      response.status(409).json({ error: 'Une BD avec ce nom existe déjà.' });
      return;
    }
    console.log('CriminLink SQLite insert failed', error);
    response.status(500).json({ error: 'Impossible de sauvegarder la BD.' });
  }
});

app.patch('/api/databases/:id', (request, response) => {
  const current = sqlite.prepare('SELECT * FROM graph_databases WHERE id = ?').get(request.params.id);
  if (!current) {
    response.status(404).json({ error: 'BD introuvable.' });
    return;
  }

  const active = request.body.active === false ? 0 : 1;
  sqlite.prepare('UPDATE graph_databases SET active = ? WHERE id = ?').run(active, request.params.id);
  const row = sqlite.prepare('SELECT * FROM graph_databases WHERE id = ?').get(request.params.id);
  response.json({ database: rowToDatabase(row) });
});

app.delete('/api/databases/:id', (request, response) => {
  sqlite.prepare('DELETE FROM graph_databases WHERE id = ?').run(request.params.id);
  response.status(204).end();
});

app.delete('/api/databases', (_request, response) => {
  sqlite.prepare('DELETE FROM graph_databases').run();
  response.status(204).end();
});

app.listen(port, () => {
  console.log(`CriminLink SQLite API listening on http://localhost:${port}`);
  console.log(`CriminLink SQLite database: ${dbPath}`);
});
