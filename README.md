# Relational Blueprint

**Il tuo Manuale Operativo per le Relazioni**

Una web app che trasforma test psicologici validati in un "Manuale di Me" — istruzioni pratiche per capire come funzioni nelle relazioni e come migliorare la comunicazione con il partner.

## Setup

### 1. Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuovo progetto
3. **Authentication** → Sign-in method → Abilita **Google** e **GitHub**
4. **Firestore** → Crea database in modalità produzione
5. **Project Settings** → Your apps → Web app → Copia le credenziali in `firebase-config.js`

Per GitHub OAuth:
- Vai su github.com/settings/applications/new
- Authorization callback URL: `https://<tuo-auth-domain>/__/auth/handler`
- Copia Client ID e Secret in Firebase Auth → GitHub

### 2. Deployment su Vercel

```bash
npx vercel --prod
```

Il file `vercel.json` è già configurato per il routing SPA.

### 3. Regole Firestore

Copia il contenuto di `firestore.rules` nella console Firebase → Firestore → Rules.

## Struttura del Progetto

```
relational-blueprint/
├── index.html              # SPA container
├── style.css               # Design system (aesthetic: technical manual)
├── firebase-config.js      # ⚠️ NON committare — riempire con le tue keys
├── vercel.json             # Routing SPA
├── firestore.rules         # Regole di sicurezza Firestore
├── js/
│   ├── app.js              # Router principale + controller viste
│   ├── auth.js             # Firebase Auth (Google/GitHub)
│   ├── firebase.js         # Singleton Firebase
│   ├── db.js               # CRUD Firestore
│   ├── test-engine.js      # Rendering domande + navigazione test
│   ├── scoring.js          # Algoritmi di calcolo punteggi
│   ├── manual-generator.js # Generatore Manuale di Me + Report Coppia
│   └── ui.js               # Helpers UI (toast, loading, render)
└── data/
    ├── questions-it.json   # Domande in italiano (4 test)
    ├── questions-en.json   # Domande in inglese
    ├── manual-it.json      # Template istruzioni operative (IT)
    └── manual-en.json      # Template istruzioni operative (EN)
```

## I 4 Moduli

| Modulo | Scala | Dimensioni | Output |
|--------|-------|-----------|--------|
| Attaccamento (ECR-R) | 1–7 | Ansia, Evitamento | Sicuro / Ansioso / Evitante / Disorganizzato |
| Linguaggi Amore | 1–5 | 5 linguaggi | Linguaggio primario + secondario |
| Big Five OCEAN | 1–5 | O/C/E/A/N | Profilo tratti + dominante |
| Comunicazione | 1–5 | Rapport / Report | Stile comunicativo |

## Logica del Manuale

Il `manual-generator.js` prende i punteggi grezzi e li mappa su template di istruzioni operative in `data/manual-it.json`. Ogni capitolo include:

- Codice identificativo (es: `ATT-EVI`)
- Sommario del profilo
- Istruzioni operative specifiche (es: "In caso di conflitto, ho bisogno di 20 min di isolamento")

## Report di Interfaccia (Coppia)

Quando due utenti si collegano tramite Partner Code, l'app:

1. Confronta i 4 profili
2. Rileva pattern di attrito noti (es: Evitante + Ansioso)
3. Genera protocolli operativi specifici per quella coppia
