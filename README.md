# Plánování směn

## Požadavky

- Node.js
- Vyplněný `backend/.env` (databáze, JWT secret, SMTP)

## Spuštění

```bash
<<<<<<< HEAD
# 1. Nainstaluj závislosti a připrav databázi
npm install
npm run setup

# 2. Spusť aplikaci
npm run dev
```

Frontend běží na [http://localhost:3000](http://localhost:3000), backend na [http://localhost:3001](http://localhost:3001).
=======
npm install        # nainstaluje concurrently
npm run setup      # nainstaluje deps + prisma generate + migrate
npm run dev        # spustí backend i frontend najednou


npm install
npm run setup
npm run dev
>>>>>>> 7e5d1022323ac685bc92eef40499795ba3bdf270
