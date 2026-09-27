# ft_Clock

Application web pour suivre son **logtime** à 42 : on fixe un objectif d'heures mensuel, on renseigne (ou on synchronise depuis l'intra) ses heures jour par jour, et l'app calcule ce qu'il reste à faire et la moyenne quotidienne nécessaire pour atteindre l'objectif.

🌐 En ligne : [ftclock.dev](https://ftclock.dev)

## Fonctionnalités

- **Compte utilisateur** : inscription / connexion par email + mot de passe (Firebase Authentication).
- **Calendrier mensuel** : navigation mois par mois, saisie des heures d'un jour en cliquant dessus (formats acceptés : `7`, `7.5`, `7h30`, `7:30`…).
- **Jours off** : un jour peut être marqué comme non travaillé, il est alors exclu du calcul.
- **Samedi optionnel** : inclure ou non les samedis dans les jours de travail.
- **Objectif mensuel** réglable (160 h par défaut).
- **Statistiques** : heures faites, heures restantes, heures requises et moyenne par jour restant.
- **Objectif du jour** : indique combien d'heures il reste à faire aujourd'hui, ou « ✓ Objectif atteint ».
- **Sync 42** : récupère le logtime réel depuis l'API de l'intra 42 (`/v2/users/:login/locations_stats`) et remplit automatiquement le mois affiché.
- **Sauvegarde dans le cloud** : les données sont stockées par utilisateur et par mois dans Firestore.

## Stack

| Partie   | Technologies |
|----------|--------------|
| Frontend | HTML / CSS / JavaScript vanilla (modules ES), Firebase Auth + Firestore |
| Backend  | Node.js, Express, `helmet`, `cors`, `express-rate-limit`, `node-fetch` |
| API      | API 42 (OAuth2 *client credentials*) |
| Hébergement | Railway |

## Structure

```
ft_Clock/
├── railway.toml          # config de déploiement Railway
├── firebase.json         # config Firebase
└── server/
    ├── index.js          # serveur Express + proxy vers l'API 42
    ├── package.json
    └── public/           # frontend servi en statique
        ├── index.html
        ├── style.css
        ├── app.js        # logique de l'app (auth, calendrier, stats, sync)
        ├── firebase.js   # initialisation Firebase
        └── img/
```

Le backend sert le frontend et expose un petit proxy vers l'API 42, ce qui permet de garder le secret OAuth côté serveur.

## Lancer en local

### Prérequis

- Node.js 18+
- Une application OAuth créée sur l'intra 42 (*Settings → API → Register a new app*) pour obtenir un `CLIENT_ID` et un `CLIENT_SECRET`

### Installation

```bash
cd server
npm install
```

Créer un fichier `server/.env` :

```env
CLIENT_ID_42=ton_client_id
CLIENT_SECRET_42=ton_client_secret
PORT=2441
```

### Démarrage

```bash
npm start
```

L'application est alors accessible sur [http://localhost:2441](http://localhost:2441).

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Vérifie que le serveur tourne |
| `GET` | `/api/logtime/:login` | Renvoie le logtime par jour d'un login 42 |

Les routes `/api/*` sont limitées à 100 requêtes par minute et par IP. Le login est validé (`[a-z0-9-]`, 20 caractères max) avant d'être transmis à l'API 42. Le token OAuth est mis en cache et renouvelé automatiquement avant son expiration.

## Sécurité

- Les secrets de l'API 42 ne sont jamais envoyés au client (`.env` ignoré par git).
- En-têtes HTTP sécurisés via `helmet`, CORS restreint aux domaines de production.
- Les données de chaque utilisateur sont stockées sous `users/{uid}/…` dans Firestore.

## Auteur

**asdiallo** — 42
