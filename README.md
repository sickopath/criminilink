# CriminLink

CriminLink est une application web d'analyse de graphes relationnels pour le renseignement criminel. Elle permet d'importer des fichiers CSV, de gérer plusieurs bases de données d'enquête, de visualiser les relations avec Cytoscape.js et de consulter des métriques d'analyse de réseaux sociaux.

## Fonctionnalités

- Importation de bases relationnelles à partir de fichiers CSV.
- Gestion de plusieurs BD simultanées.
- Affichage, masquage et suppression de chaque BD.
- Persistance des BD dans une base SQLite locale.
- Visualisation de graphes dirigés avec Cytoscape.js.
- Layouts disponibles: forces, hiérarchique, organique, centralité et grille.
- Fonction de décroisement pour réduire les croisements entre liens.
- Recherche d'entités.
- Filtres par type de relation, communauté et degré minimum.
- Mode pour cacher complètement les entités hors filtre.
- Fiche détaillée pour chaque entité.
- Affichage des relations multiples entre deux entités.
- Réseau ego autour d'une entité sélectionnée.
- Métriques SNA globales et par noeud.
- Détection de communautés avec Louvain.
- Export PNG, CSV du graphe visible et CSV des métriques.

## Stack technique

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
- Express
- SQLite avec better-sqlite3
- papaparse
- Zustand
- lucide-react
- react-hot-toast

## Installation

Installez les dépendances:

```bash
npm install
```

Lancez l'application:

```bash
npm run dev
```

La commande démarre deux services:

- l'API SQLite sur `http://localhost:5174`
- l'interface Vite sur `http://localhost:5173`

Ouvrez ensuite:

```text
http://localhost:5173/
```

## Base SQLite

Les BD importées sont sauvegardées dans:

```text
server/data/criminlink.sqlite
```

Ce fichier n'est pas versionné par Git. Il est créé automatiquement au démarrage du serveur.

## Format CSV

CriminLink attend un fichier CSV avec les colonnes suivantes:

```csv
node1,node2,relationship,context
Marco Vitali,Tony Ferrante,associé à,Marco Vitali et Tony Ferrante ont été observés ensemble.
```

Colonnes requises:

- `node1`: entité source
- `node2`: entité cible
- `relationship`: type ou libellé de la relation
- `context`: phrase de contexte d'enquête

Les séparateurs virgule et point-virgule sont détectés automatiquement. L'interface permet aussi de mapper manuellement les colonnes lors de l'import.

## Données de démonstration

Un fichier fictif est inclus:

```text
public/sample-data.csv
```

Le bouton **Load Sample Data** charge ce fichier sous le nom `Opération Cargo`.

## Types d'entités

CriminLink infère automatiquement un type d'entité à partir du nom ou de la valeur:

- Personne
- Compagnie
- Lieu
- Adresse
- Téléphone
- Courriel
- Info financière
- Autre

Ces types sont visibles dans la légende et sur les noeuds du graphe.

## Commandes

Développement:

```bash
npm run dev
```

Build de production:

```bash
npm run build
```

Prévisualisation du build:

```bash
npm run preview
```

## Notes

- CriminLink utilise SQLite pour la persistance des BD.
- Les données restent sur la machine locale, dans le fichier SQLite.
- Les très grands graphes peuvent ralentir certains layouts et le décroisement.
- Le mode filtre caché garde les entités hors filtre invisibles jusqu'au retrait du filtre.
