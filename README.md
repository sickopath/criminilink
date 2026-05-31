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

## Mise en ligne sur un site web

L'application ne peut pas être publiée uniquement comme un site statique, car elle utilise une API Node/Express et une base SQLite. L'hébergement doit exécuter le serveur Node et conserver le fichier SQLite sur un disque persistant.

### 1. Préparer le build

Installez les dépendances et générez l'interface de production:

```bash
npm install
npm run build
```

Le frontend compilé est placé dans:

```text
dist/
```

### 2. Servir le frontend en production

Pour un déploiement complet, le serveur Express devrait aussi servir les fichiers statiques de `dist/`. Il faut ajouter dans `server/index.js`, après les routes `/api`:

```js
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

Il est ensuite possible de démarrer l'application avec:

```bash
node server/index.js
```

### 3. Choisir un hébergeur compatible

Choisissez un hébergeur qui supporte:

- une application Node.js persistante;
- un disque ou volume persistant;
- une variable d'environnement pour le port;
- HTTPS;
- des sauvegardes du fichier SQLite.

Exemples adaptés: Railway, Render avec disque persistant, Fly.io avec volume, un VPS ou un serveur institutionnel.

Un hébergement statique comme GitHub Pages ne suffit pas pour la version SQLite.

### 4. Conserver la base SQLite

La base est créée dans:

```text
server/data/criminlink.sqlite
```

En production, ce dossier doit être monté sur un disque persistant. Sinon, les données peuvent disparaître lors d'un redémarrage ou d'un redéploiement.

Prévoyez également:

- une sauvegarde régulière du fichier SQLite;
- une procédure de restauration;
- des permissions système limitées au processus Node;
- un chiffrement du disque si les données sont sensibles.

### 5. Configurer le domaine et HTTPS

Configurez un nom de domaine, par exemple:

```text
https://criminlink.example.org
```

Utilisez le HTTPS obligatoire. Avec un VPS, placez un reverse proxy comme Nginx ou Caddy devant l'application Node. Sur une plateforme gérée, activez le domaine personnalisé et le certificat TLS depuis le tableau de bord.

### 6. Ajouter une authentification avant usage réel

La version actuelle ne possède pas de comptes utilisateurs ni de contrôle d'accès. Avant de publier des données d'enquête réelles, ajoutez:

- une authentification;
- des rôles et permissions;
- une journalisation des accès et suppressions;
- une protection contre les requêtes abusives;
- une politique de sauvegarde;
- une validation de sécurité.

### 7. Prévoir une migration si l'usage augmente

SQLite convient à une instance unique avec un volume de données raisonnable. Pour plusieurs serveurs, plusieurs utilisateurs simultanés ou un environnement plus critique, migrez la persistance vers PostgreSQL ou une base équivalente.

## Notes

- CriminLink utilise SQLite pour la persistance des BD.
- Les données restent sur la machine locale, dans le fichier SQLite.
- Les très grands graphes peuvent ralentir certains layouts et le décroisement.
- Le mode filtre caché garde les entités hors filtre invisibles jusqu'au retrait du filtre.
