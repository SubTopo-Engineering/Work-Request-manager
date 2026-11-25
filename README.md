# Work Request Manager (WRM)

Application web interne **Survey Group** pour réceptionner, suivre, archiver et reporter les demandes de travaux topographiques.

L'application permet de scanner/importer une demande (avec **OCR automatique** pour pré-remplir le formulaire), de suivre son avancement, d'archiver les fichiers associés (document original, photos, Raw Data, Final Data), de générer des rapports journaliers/mensuels et d'exporter les données en Excel/CSV.

## ✨ Fonctionnalités

- **Accueil** — tableau de bord avec compteurs (reçues, en cours, terminées, en retard, archivées).
- **Nouvelle demande** — import de scan/PDF avec OCR automatique (Tesseract.js + pdf.js) pour pré-remplir le formulaire.
- **Suivi** — vue des demandes en cours avec leur statut.
- **Archive** — recherche dans l'historique des demandes.
- **Fiche demande** — détail d'une demande : fichiers, Raw/Final Data, historique des actions.
- **Rapports** — rapports journaliers et mensuels.
- **Export** — export des données en Excel / CSV.
- **Sauvegarde** — sauvegarde et restauration des données.
- **Paramètres** — configuration de l'application.

### Cycle de vie d'une demande

`Reçu → En cours → Terminé → Archivé`

Chaque demande reçoit un numéro attribué automatiquement et atomiquement par année, au format `SR-01-2026`, `SR-02-2026`, etc.

## 🏗️ Architecture

Le projet est un **workspace [Bit](https://bit.dev)** (`survey-group`), composé de plusieurs composants versionnés indépendamment :

| Composant | Type | Rôle |
|---|---|---|
| `wrm-platform` | Platform | Compose l'app et le service ensemble, point d'entrée pour tout lancer |
| `wrm-app` | App (React + Vite) | Frontend : pages, OCR, i18n, appels API |
| `wrm-service` | Service (Express) | API REST, numérotation des demandes, gestion des fichiers, jobs automatiques |

```
wrm-platform
  ├── wrm-app      (frontend React/Vite)
  └── wrm-service  (backend Express/MongoDB)
```

## 🧰 Stack technique

- **Frontend** : React, React Router, Vite, Tesseract.js (OCR), pdf.js (lecture PDF)
- **Backend** : Node.js, Express 5, MongoDB (Mongoose)
- **Export** : xlsx (Excel/CSV)
- **Gestion de composants** : Bit (`bit.dev`), pnpm

## 📁 Structure du dépôt

```
.
├── workspace.jsonc              # configuration du workspace Bit
├── package.json
├── pnpm-lock.yaml
├── AGENTS.md                     # instructions pour agents IA travaillant dans ce workspace Bit
└── survey-group/
    ├── wrm-app/                  # frontend React
    │   ├── home-page.tsx
    │   ├── new-request-page.tsx  # import + OCR
    │   ├── tracking-page.tsx
    │   ├── archive-page.tsx
    │   ├── request-detail-page.tsx
    │   ├── reports-page.tsx
    │   ├── data-pages.tsx        # export / sauvegarde / paramètres
    │   ├── ocr.ts                 # pipeline OCR (Tesseract.js + pdf.js)
    │   ├── api.ts                 # client API
    │   ├── i18n.tsx                # traductions (FR)
    │   └── types.ts
    ├── wrm-platform/             # composition app + service
    └── wrm-service/              # backend Express/MongoDB
        ├── wrm-service.ts
        ├── models.ts
        └── seed.ts
```

## 🚀 Démarrage

### Prérequis

- Node.js 18+
- pnpm
- [Bit CLI](https://bit.dev/docs/getting-started/installing-bit/installing-bit)
- Une instance MongoDB accessible (variable d'environnement `MONGO_URL`)

### Installation

```bash
pnpm install
bit install
```

> ⚠️ Toujours utiliser `bit install` pour ajouter des dépendances (jamais `npm install` / `yarn` directement), sauf si le workspace est configuré en `externalPackageManager`.

### Variables d'environnement

| Variable | Description | Utilisé par |
|---|---|---|
| `MONGO_URL` | URL de connexion MongoDB | `wrm-service` |
| `BACKEND_URL` | URL de base de l'API consommée par le frontend | `wrm-app` |

### Lancer l'application

Le frontend et le backend sont composés ensemble par la plateforme :

```bash
bit run wrm-platform
```

Serveur de développement Bit (previews des composants) :

```bash
bit start
```

### Autres commandes utiles

```bash
bit status       # état du workspace / changements en attente
bit validate     # lint + type-check + tests (préférer à bit build)
bit test         # lancer les tests
bit list         # lister les composants locaux
```

## 📡 API (wrm-service)

Principaux endpoints, sous `/api` :

| Endpoint | Description |
|---|---|
| `requests` | CRUD des demandes de travaux |
| `requests/:id/files` | Gestion des fichiers liés à une demande |
| `dashboard` | Statistiques du tableau de bord |
| `reports/daily` | Rapport journalier |
| `reports/monthly` | Rapport mensuel |
| `automation/run` | Déclenche le job automatique (mise à jour des statuts) |
| `export/excel` | Export Excel |
| `export/csv` | Export CSV |
| `backup` | Sauvegarde des données |
| `restore` | Restauration des données |
| `settings` | Configuration |

Les fichiers sont versionnés et organisés sous `Archives/<année>/<numéro>/<catégorie>/`.

## 🤝 Contribution

Ce dépôt est géré avec **Bit** : les composants ne sont pas versionnés via Git classique mais via `bit snap` / `bit export`. Voir `AGENTS.md` pour le détail du flux de travail (création de composants, lanes, règles à respecter).

```bash
bit lane create <nom-de-lane>
bit validate
bit snap --message "describe change"
bit export
```

## 📄 Licence

Usage interne — Survey Group.
