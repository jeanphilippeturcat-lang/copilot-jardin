# CLAUDE.md — Copilote de Jardin

## Vision du projet

Créer un assistant intelligent de jardinage qui connaît le jardin de l'utilisateur,
suit son évolution dans le temps et fournit des recommandations personnalisées basées
sur la météo, la saison, l'historique des interventions et l'analyse d'images.

L'application est une **PWA (Progressive Web App)** — accessible depuis le navigateur
du téléphone sans installation, avec support offline partiel via Service Worker.

---

## Stack technique

### Frontend + Backend — Next.js fullstack
- **Next.js 15** (App Router) — frontend et API Routes dans le même projet
- **TypeScript** obligatoire partout
- **Tailwind CSS** pour le style
- **shadcn/ui** pour les composants UI (boutons, cards, modals, formulaires)
- **TanStack Query (React Query)** pour le cache et les appels API côté client
- **Zustand** pour l'état global léger (jardin actif, préférences)
- **next-pwa** pour le Service Worker et le manifest PWA

> Il n'y a pas de backend séparé. Tout passe par les **API Routes Next.js**
> (dossier `app/api/`). Pas de serveur Fastify ou Express.

### Base de données
- **PostgreSQL** comme base de données principale
- **Prisma** comme ORM (schéma, migrations, client typé)
- **Redis** pour le cache (tâches du jour, données météo) — optionnel en MVP,
  remplaçable par un cache in-memory ou `unstable_cache` de Next.js

### IA & Analyse
- **API Anthropic** (`claude-sonnet-4-6`) appelée depuis les API Routes Next.js (côté serveur uniquement)
  - Recommandations personnalisées quotidiennes
  - Analyse d'images de plantes malades (vision multimodale)
  - Génération du calendrier saisonnier
- Modèle : `claude-sonnet-4-6`
- Max tokens : 1024 pour les recommandations, 2048 pour les diagnostics photo

### Météo
- **API OpenWeatherMap** (endpoint `/forecast` pour 5 jours)
- Appel serveur uniquement (API Route Next.js) pour protéger la clé API
- Cache de 3h via `next/cache` ou Redis

### PWA
- **next-pwa** pour générer le Service Worker automatiquement
- `manifest.json` avec icônes, couleur thème vert jardin, `display: standalone`
- Cache offline des pages statiques et du dashboard (Workbox)
- L'utilisateur peut "Ajouter à l'écran d'accueil" depuis Safari/Chrome mobile

### Stockage photos
- **Cloudinary** pour l'upload et le stockage des photos de plantes
- Upload via une API Route Next.js (signed upload, clé API jamais exposée au client)

### Infrastructure
- **Docker** + `docker-compose` pour PostgreSQL et Redis
- Déploiement : **serveur local** sur le réseau WiFi (Raspberry Pi, NAS, ou PC fixe)
- Accessible depuis le téléphone via l'IP locale (ex: `http://192.168.1.X:3000`)
- Pas de déploiement cloud nécessaire

---

## Structure du projet

```
copilote-jardin/
├── app/
│   ├── dashboard/           # Tableau de bord quotidien
│   ├── jardin/              # Gestion zones et plantes
│   ├── calendrier/          # Calendrier saisonnier
│   ├── observations/        # Historique et photos
│   ├── layout.tsx           # Layout racine avec nav mobile-first
│   ├── api/
│   │   ├── jardin/          # CRUD zones et plantes
│   │   ├── taches/          # Tâches et tableau de bord
│   │   ├── meteo/           # Proxy météo OpenWeatherMap
│   │   ├── ia/
│   │   │   ├── recommandations/ # Appel Anthropic pour le dashboard
│   │   │   └── diagnostic/      # Analyse photo via Anthropic vision
│   │   └── photos/          # Upload Cloudinary
│   └── manifest.ts          # Web App Manifest dynamique
├── components/
│   ├── ui/                  # Composants shadcn/ui
│   ├── jardin/              # CarteZone, ListePlantes, FormulaireAjout...
│   ├── dashboard/           # TachesDuJour, MeteoWidget, AlerteIA...
│   └── layout/              # NavBar, SideBar, BottomNav (mobile)
├── lib/
│   ├── prisma.ts            # Client Prisma singleton
│   ├── anthropic.ts         # Client Anthropic configuré
│   ├── meteo.ts             # Fonctions appel OpenWeatherMap
│   └── cloudinary.ts        # Fonctions upload Cloudinary
├── hooks/                   # Custom hooks React (useJardin, useTaches...)
├── types/                   # Types TypeScript partagés
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── icons/               # Icônes PWA (192x192, 512x512)
│   └── screenshots/         # Screenshots pour le manifest
├── docker-compose.yml       # PostgreSQL + Redis en dev
├── next.config.ts           # Config Next.js + next-pwa
└── CLAUDE.md                # Ce fichier
```

---

## Modèle de données (Prisma)

```prisma
model Zone {
  id          String   @id @default(cuid())
  nom         String
  type        String   // potager | verger | massif | serre | pelouse
  surface     Float?   // m²
  exposition  String?  // nord | sud | est | ouest | mi-ombre
  plantes     Plante[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Plante {
  id            String         @id @default(cuid())
  nom           String
  nomLatine     String?
  type          String         // légume | arbre | arbuste | fleur | aromatique
  datePlantee   DateTime?
  zone          Zone           @relation(fields: [zoneId], references: [id])
  zoneId        String
  observations  Observation[]
  taches        Tache[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Observation {
  id          String   @id @default(cuid())
  plante      Plante   @relation(fields: [planteId], references: [id])
  planteId    String
  note        String
  photoUrl    String?  // URL Cloudinary
  diagnostic  String?  // Résultat analyse IA
  createdAt   DateTime @default(now())
}

model Tache {
  id           String    @id @default(cuid())
  titre        String
  description  String?
  type         String    // arrosage | taille | semis | traitement | récolte | autre
  statut       String    @default("a_faire") // a_faire | faite | ignoree
  dateEcheance DateTime?
  planteId     String?
  plante       Plante?   @relation(fields: [planteId], references: [id])
  source       String    @default("ia") // ia | manuelle
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Intervention {
  id          String   @id @default(cuid())
  type        String
  description String
  date        DateTime @default(now())
  planteId    String?
  zoneId      String?
}

// Intention de plantation déclarée par l'utilisateur.
// L'IA génère automatiquement un calendrier de préparation à partir de cette intention.
model IntentionPlantation {
  id              String   @id @default(cuid())
  nomPlante       String   // Nom libre saisi par l'utilisateur (pas encore une Plante en DB)
  zone            Zone     @relation(fields: [zoneId], references: [id])
  zoneId          String
  notes           String?  // Contexte fourni par l'utilisateur (exposition, sol, etc.)
  periodeOptimale String?  // Réponse de l'IA : "novembre 2026"
  raisonnement    String?  // Explication de l'IA
  statut          String   @default("planifiee") // planifiee | realisee | annulee
  taches          Tache[]  // Tâches de préparation générées par l'IA
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## Conventions de code

- **Nommage** : camelCase pour variables/fonctions, PascalCase pour composants et types
- **Fichiers** : kebab-case (`dashboard-page.tsx`, `plante-service.ts`)
- **Commentaires** : en français
- **Commits** : en français, format conventionnel (`feat:`, `fix:`, `refactor:`, `docs:`)
- **Pas de `any`** TypeScript — types explicites partout
- Les **Server Components** sont la valeur par défaut — ajouter `"use client"` seulement si nécessaire
- Les **appels Prisma** se font uniquement dans les Server Components ou les API Routes, jamais côté client
- Les **appels Anthropic** se font uniquement dans les API Routes (jamais exposer la clé)
- **shadcn/ui** pour tous les composants UI — ne pas recréer des boutons/inputs from scratch

---

## Design — Mobile-first PWA

L'interface doit fonctionner parfaitement sur téléphone dans le navigateur :
- Navigation principale en **bottom bar** sur mobile (icônes : Dashboard, Jardin, Calendrier, Observations)
- Navigation en **sidebar** sur desktop
- Cartes larges et boutons avec zones tactiles suffisantes (min 44px)
- Couleurs : vert naturel (`#2d6a4f`, `#40916c`), fond crème (`#fefae0`)
- Police : Inter (déjà dans Tailwind/shadcn)

---

## Appels IA — instructions pour Claude Code

### API Route : recommandation quotidienne
**Endpoint** : `POST /api/ia/recommandations`

Construire le prompt avec :
- Liste des plantes et zones du jardin
- Météo des 3 prochains jours (depuis `/api/meteo`)
- Mois en cours et région : **Sud de la France, climat méditerranéen**
- Dernières interventions (30 derniers jours)

Réponse attendue (JSON strict) :
```json
{
  "taches": [{ "titre": "...", "type": "...", "urgence": "haute|moyenne|faible", "planteId": "..." }],
  "alertes": [{ "message": "...", "niveau": "info|warning|danger" }],
  "conseil_du_jour": "..."
}
```

### API Route : diagnostic photo
**Endpoint** : `POST /api/ia/diagnostic`

Body : `{ planteId, photoUrl, description? }`

Construire le prompt avec l'image Cloudinary (fetch + base64) + nom de la plante.

Réponse attendue (JSON strict) :
```json
{
  "diagnostic": "...",
  "causes_probables": ["..."],
  "traitements": ["..."],
  "urgence": "faible|moyenne|haute"
}
```

### API Route : intention de plantation
**Endpoint** : `POST /api/ia/planifier-plantation`

L'utilisateur n'ajoute pas une tâche manuellement — il exprime une **intention** :
> "Je veux installer un plan de vigne dans la zone Potager."

L'IA prend en charge toute la planification :
1. Elle détermine la **période optimale** de plantation (selon l'espèce, le climat méditerranéen, la saison)
2. Elle génère un **calendrier de préparation** remontant depuis cette date :
   - Analyse et amendement du sol
   - Travail de la terre, aération
   - Arrosages préalables
   - Achat du plant, commande si besoin
   - Jour J : plantation + arrosage d'installation
3. Toutes ces tâches sont **créées automatiquement dans le calendrier** avec les bonnes dates
4. Un message de réponse explique le raisonnement à l'utilisateur ("La vigne se plante idéalement en novembre en région méditerranéenne. J'ai planifié les préparations à partir de septembre.")

**Body** :
```json
{
  "nomPlante": "Vigne",
  "zoneId": "...",
  "notes": "exposition plein sud, sol argileux"
}
```

**Réponse attendue de l'IA (JSON strict)** :
```json
{
  "periode_optimale": "novembre 2026",
  "raisonnement": "La vigne se plante idéalement en automne...",
  "taches": [
    { "titre": "...", "type": "préparation sol|plantation|autre", "dateEcheance": "2026-09-15", "description": "..." },
    ...
  ]
}
```

**Modèle de données associé** : `IntentionPlantation` (voir schéma Prisma ci-dessous).
Les tâches générées sont liées à cette intention via `intentionId` pour pouvoir les afficher groupées.

**UI — formulaire d'intention** :
- Accessible depuis le calendrier (bouton "Planifier une plantation") ou depuis la page Jardin
- Champs : nom de la plante (libre), zone (select), notes/contexte (optionnel)
- Après soumission : l'IA répond avec le raisonnement + les tâches créées s'affichent dans le calendrier
- L'intention reste visible dans le calendrier comme un "projet" avec son avancement

### Règles générales IA
- Toujours demander une réponse **JSON valide uniquement**, sans balises markdown
- Gérer le parsing JSON avec try/catch et fallback texte brut
- Contexte géographique toujours présent : **Sud de la France, climat méditerranéen**

---

## Variables d'environnement

```env
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/copilote_jardin

# IA
ANTHROPIC_API_KEY=...

# Météo
OPENWEATHER_API_KEY=...

# Stockage photos
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Redis (optionnel en dev)
REDIS_URL=redis://localhost:6379
```

---

## Fonctionnalités MVP (dans l'ordre d'implémentation)

- [x] **1. Setup** — Init Next.js + Prisma + Docker + shadcn/ui + next-pwa
- [x] **2. Gestion du jardin** — CRUD zones et plantes
- [x] **3. Intégration météo** — API Route proxy OpenWeatherMap + widget dashboard
- [x] **4. Tableau de bord IA** — Appel Anthropic pour tâches et alertes du jour
- [x] **5. Calendrier saisonnier** — Vue mensuelle avec navigation et gestion des tâches
- [x] **5b. Intentions de plantation** — Formulaire d'intention → l'IA génère le calendrier de préparation complet (voir section "API Route : intention de plantation")
- [x] **6. Upload photos** — Formulaire observation + upload local (`public/uploads/`) + indicateur "dernière observation" sur les plantes
- [x] **7. Diagnostic IA** — Bouton manuel "Analyser avec l'IA" sur les observations avec photo (Anthropic vision)
- [ ] **8. PWA** — Manifest + Service Worker + test "Ajouter à l'écran d'accueil"

---

## Ce qu'il ne faut PAS faire

- Ne pas créer de backend séparé — tout dans les API Routes Next.js
- Ne pas appeler Anthropic ou Cloudinary côté client — toujours passer par une API Route
- Ne pas exposer les clés API dans le code ou dans les props client
- Ne pas ajouter de système d'auth — l'app tourne en réseau local privé, aucune auth requise
- Ne pas utiliser `useEffect` pour les appels de données — préférer Server Components ou React Query
- Ne pas créer de composants UI from scratch si shadcn/ui couvre le besoin
- Ne pas générer les migrations Prisma manuellement — utiliser `npx prisma migrate dev`
- Ne pas utiliser l'App Router de Next.js avec `getServerSideProps` (c'est Pages Router)

---

## Évolutions prévues (hors MVP — ne pas implémenter maintenant)

- Cartographie interactive du jardin (canvas ou Leaflet.js)
- Capteurs IoT (Raspberry Pi / ESP32) via MQTT ou webhook
- Jumeau numérique du jardin
- Notifications push via Web Push API (PWA)
- Apprentissage des habitudes et performances sur plusieurs saisons

---

## État actuel du projet

> Mettre à jour cette section après chaque session de travail.

- **Dernière mise à jour** : 2026-11-25 — Ajout de l'onglet **BD** hebdomadaire (bande dessinée verticale noir & blanc générée via Gemini avec personnages animaux récurrents et fiches de référence)
- **Prochaine tâche** : étape 8 — PWA (manifest + Service Worker + test "Ajouter à l'écran d'accueil")

---

### Ce qui est en place

**Infrastructure**
- Next.js 16 (App Router, TypeScript, Tailwind CSS) — version réelle installée : 16.2.9
- Prisma **7** + schéma complet (Zone, Plante, Observation, Tache, Intervention)
- docker-compose : PostgreSQL 16 + Redis 7
- shadcn/ui initialisé (button, card, dialog, input, label, select, badge, textarea, form)
- next-pwa configuré (désactivé en dev, actif en prod)

**Fichiers clés**
- `lib/prisma.ts` — singleton Prisma avec `@prisma/adapter-pg` (obligatoire en Prisma 7)
- `lib/anthropic.ts` — client Anthropic (`claude-sonnet-4-6`)
- `lib/meteo.ts` — appel OpenWeatherMap
- `lib/stockage.ts` — sauvegarde photos locale (`public/uploads/`, remplace Cloudinary)
- `app/manifest.ts` — PWA manifest (vert jardin, standalone)
- `components/providers.tsx` — SWRConfig global (fetcher, revalidateOnMount, revalidateOnFocus)
- `components/layout/BottomNav.tsx` — navigation mobile bas d'écran

**CRUD zones et plantes**
- `app/api/jardin/zones/route.ts` — GET liste + POST
- `app/api/jardin/zones/[id]/route.ts` — GET, PUT, DELETE (cascade sur plantes)
- `app/api/jardin/plantes/route.ts` — GET (filtre ?zoneId) + POST
- `app/api/jardin/plantes/[id]/route.ts` — GET, PUT, DELETE
- `app/jardin/page.tsx` — page liste zones + plantes (SWR client)
- `components/jardin/CarteZone.tsx` — carte zone avec édition/suppression
- `components/jardin/FormulaireZone.tsx` — formulaire zone (react-hook-form + zod)
- `components/jardin/FormulairePlante.tsx` — formulaire plante

---

### Commandes de démarrage

```bash
docker compose up -d   # démarre PostgreSQL + Redis (à faire une fois)
npm run dev            # applique les migrations puis lance l'app
```

`npm run dev` fait `prisma migrate deploy && next dev` — la migration est automatique.

---

### Points techniques importants (découverts en session)

**Prisma 7 — breaking changes**
- Le fichier `schema.prisma` ne supporte plus `url = env("DATABASE_URL")` dans le datasource
- L'URL de connexion se configure dans `prisma.config.ts` (via dotenv)
- Le client nécessite un **driver adapter** : `@prisma/adapter-pg` + `pg`
- `previewFeatures = ["driverAdapters"]` requis dans le generator
- Utiliser `prisma migrate deploy` (pas `migrate dev`) pour appliquer les migrations en prod/auto

**Next.js 16 — accès mobile en WSL2**
- En WSL2, le serveur tourne sur `172.21.78.12` (IP interne WSL2)
- Le mobile accède via l'IP WiFi Windows (`192.168.1.X`) **sans** port forwarding
  (WSL2 forwarde automatiquement les ports depuis Windows)
- ⚠️ **Ne pas** utiliser `netsh interface portproxy` : ça "vole" le port et empêche WSL2 de le binder
- `--hostname 0.0.0.0` dans le script dev pour exposer correctement
- `--webpack` à la place de Turbopack (Turbopack bloque la hydratation React sur mobile)
- `allowedDevOrigins: ["192.168.1.59"]` dans `next.config.ts` pour autoriser le HMR mobile
- `next-pwa` ajoute une config webpack → ajouter `turbopack: {}` dans next.config pour silencer le warning

**SWRConfig**
- Toujours `useMemo` pour la valeur passée à `SWRConfig` (sinon boucle de re-render infinie)

---

**Météo + Dashboard IA**
- `app/api/meteo/route.ts` — proxy OpenWeatherMap (GET ?ville=)
- `app/api/ia/recommandations/route.ts` — prompt Anthropic avec jardin + météo + historique + plantations futures planifiées sur 90j
- `app/api/taches/route.ts` + `app/api/taches/[id]/route.ts` — CRUD tâches + PATCH statut
- `components/dashboard/MeteoWidget.tsx`, `TachesDuJour.tsx`, `AlerteIA.tsx`
- `app/dashboard/page.tsx` (Server) + `DashboardClient.tsx` (Client avec bouton "Actualiser IA")

**Calendrier + Intentions de plantation**
- `app/calendrier/page.tsx` — charge tâches + plantes + intentions depuis Prisma
- `components/calendrier/VueMensuelle.tsx` — grille mensuelle, pastilles colorées par type, détail jour, boutons "Plantation" (IA) et "Tâche" (manuelle)
- `components/calendrier/DialogIntention.tsx` — dialog formulaire IA (nomPlante, zone, notes) + affichage résultat
- `components/calendrier/ProjetsPlantation.tsx` — liste des intentions en cours avec barre de progression et cases à cocher par tâche
- `app/api/ia/planifier-plantation/route.ts` — GET liste + POST (appel Anthropic, transaction Prisma)

**Observations + Photos + Diagnostic IA**
- `lib/stockage.ts` — sauvegarde/suppression photos sur disque local (`public/uploads/`)
- `app/api/photos/route.ts` — POST upload multipart (jpg/png/webp, max 10 Mo)
- `app/api/observations/route.ts` — GET liste + POST création
- `app/api/observations/[id]/route.ts` — DELETE (+ supprime fichier) + PATCH (sauvegarde diagnostic)
- `app/api/ia/diagnostic/route.ts` — POST analyse photo via Anthropic vision (manuel)
- `app/observations/page.tsx` + `ObservationsClient.tsx` — journal chronologique
- `components/observations/FormulaireObservation.tsx` — formulaire avec aperçu photo
- `components/observations/CarteObservation.tsx` — carte avec photo, bouton diagnostic IA, résultat expandable
- `components/jardin/CarteZone.tsx` — indicateur "Obs. il y a X j" sur chaque plante (orange si > 30j)

**BD hebdomadaire du jardin (Noir & Blanc — The Garden Chronicle)**
- `prisma/schema.prisma` — modèle `BandeDessinee` (clé ISO `semaineCle`, `actionsJson`, `promptImage`, `imageUrl` optionnelle, `batchJobName`, `batchStatut`)
- `lib/semaine.ts` — calcul des semaines ISO (lundi → dimanche)
- `lib/bd-personnages.ts` — casting récurrent d'animaux méditerranéens du Sud de la France par opération (Marcel le sanglier de la garrigue pour plantation/semis/sol, Mireille le flamant de Camargue pour l'arrosage, Léon le lézard de Provence pour la taille, Margot la mante religieuse pour les soins/traitements, César la cigale pour la récolte, Ragoût le lapin pour le désherbage, Gizelle la tourterelle pour les prévisions météo, Bastien la tortue d'Hermann pour l'entretien)
- `lib/bd-prompt.ts` — gabarit « The Garden Chronicle » (une de journal vintage 16:9 N&B ligne claire) + données complètes du jardin incluses dans le copier-coller
- `lib/gemini.ts` + `lib/bd-generateur.ts` — modèle image par défaut `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite, 1K 16:9), support Gemini Batch API (`client.batches.create()` / `get()`, -50%), requête unique stateless avec au maximum 1 image de référence JPEG compressée via `sharp` (`reference-layout.jpg`, ≤ 1024 px, q=72). Génération automatique d'image hebdomadaire désactivée par défaut (`mode="prompt"`).
- `app/api/bd/route.ts`, `app/api/bd/generer/route.ts`, `app/api/bd/batch/verifier/route.ts`, `app/api/bd/reference/route.ts`, `app/api/bd/[id]/route.ts`, `app/api/bd/[id]/image/route.ts`, `app/api/bd/image/[...chemin]/route.ts`
- `app/bd/page.tsx` + `app/bd/BdClient.tsx` + `components/bd/PromptRecommande.tsx` + `components/bd/EquipePersonnages.tsx` — onglet `BD` avec prompt+données copiable/éditable, import manuel, Batch API (-50%), référence JPEG unique compressée, visionneuse plein écran et archives hebdomadaires

### Blocages en cours
Aucun — toutes les étapes MVP 1 à 7 sont terminées. Reste l'étape 8 (PWA).
