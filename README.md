# 🌱 Copilote de Jardin

Assistant intelligent de jardinage (Progressive Web App) qui s'adapte à votre jardin, suit son évolution dans le temps et fournit des recommandations personnalisées basées sur la météo, la saison, l'historique de vos interventions et l'analyse d'images par IA.

---

## 🛠️ Stack technique

- **Framework Fullstack** : [Next.js 15](https://nextjs.org/) (App Router, API Routes, TypeScript)
- **UI & Style** : [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons
- **State & Data Fetching** : TanStack Query, Zustand, SWR
- **Base de données** : PostgreSQL avec [Prisma ORM](https://www.prisma.io/)
- **Cache & Queue** : Redis (via Docker)
- **IA** : Anthropic Claude API (recommandations quotidiennes, diagnostic visuel des plantes)
- **Météo** : OpenWeatherMap API
- **Stockage photos** : Cloudinary / stockage local
- **Mobile / PWA** : next-pwa (offline support, installation sur écran d'accueil)

---

## 🚀 Démarrage rapide

### 1. Prérequis

- Node.js 20+
- Docker & Docker Compose
- Un compte / clés API pour Anthropic, OpenWeatherMap et Cloudinary (optionnels en premier test)

### 2. Installation des dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Copiez le fichier d'exemple et renseignez vos variables d'environnement :

```bash
cp .env.example .env
```

Éditez le fichier `.env` :
- `DATABASE_URL` : URL de connexion PostgreSQL (par défaut pré-configuré pour docker-compose)
- `ANTHROPIC_API_KEY` : Votre clé API Anthropic
- `OPENWEATHER_API_KEY` : Clé API OpenWeatherMap
- `CLOUDINARY_*` : Identifiants Cloudinary pour l'hébergement d'images

### 4. Démarrer les services (PostgreSQL & Redis)

```bash
docker compose up -d
```

### 5. Appliquer les migrations de base de données

```bash
npx prisma migrate dev
```

### 6. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## 📁 Structure du projet

```
copilote-jardin/
├── app/                  # Pages Next.js App Router & API routes
│   ├── dashboard/        # Vue quotidienne et météo
│   ├── jardin/           # Zones et plantes
│   ├── calendrier/       # Calendrier saisonnier & intentions de plantation
│   ├── observations/     # Historique & diagnostics photo
│   └── api/              # Endpoints API (IA, météo, jardin, photos, tâches)
├── components/           # Composants React (UI shadcn, dashboard, jardin...)
├── lib/                  # Clients Prisma, Anthropic, Cloudinary, météo
├── hooks/                # Hooks personnalisés
├── prisma/               # Schéma Prisma et migrations
├── public/               # Fichiers statiques et icônes PWA
└── types/                # Types TypeScript
```

---

## 🔒 Données et confidentialité

Ce dépôt ne conserve que le **code source** de l'application :
- Les fichiers de configuration sensibles (`.env`, clés d'API) sont exclus du versionnement.
- Les données utilisateurs, bases de données locales et photos téléversées (`public/uploads/`) ne sont pas stockées dans Git.
