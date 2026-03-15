# My Service Portal

## Project Overview
My Service Portal is a monorepo for a service with a 3D model catalog and viewer, plus an admin area for content and data management.

## Technology Stack
Frontend (`my-service-portal`):
- React 19 + TypeScript
- Vite
- Redux Toolkit + React Router
- Three.js + React Three Fiber + Drei
- Sass

Backend (`my-service-portal-backend`):
- Fastify 5 + TypeScript
- Firebase Admin SDK
- Dotenv
- Fastify plugins (`@fastify/cors`, `@fastify/static`)
- TSX (development mode)

This monorepo contains two applications:
- `my-service-portal` - frontend (React + Vite)
- `my-service-portal-backend` - backend API (Fastify + TypeScript)

The application provides a 3D model catalog and viewer, as well as an admin section for content management.

## Requirements
- Node.js 20+
- npm 10+

## Quick Start
1. Install dependencies:
   ```bash
   cd my-service-portal-backend
   npm install

   cd ../my-service-portal
   npm install
   ```

2. Configure `.env` files:
   - Copy `my-service-portal-backend/.env.example` to `my-service-portal-backend/.env`
   - Copy `my-service-portal/.env.example` to `my-service-portal/.env`

3. Start the backend (Terminal 1):
   ```bash
   cd my-service-portal-backend
   npm run dev
   ```
   Base API URL: `http://localhost:8787`

4. Start the frontend (Terminal 2):
   ```bash
   cd my-service-portal
   npm run dev
   ```
   Default app URL: `http://localhost:5173`

## Build
Frontend:
```bash
cd my-service-portal
npm run build
```

Backend:
```bash
cd my-service-portal-backend
npm run build
```

## Frontend Deployment to Firebase Hosting
Already included in the repository:
- `firebase.json` (Hosting config, SPA rewrite, and predeploy build)
- `.firebaserc` (Firebase project ID, replace `your-firebase-project-id`)

Steps:
1. Prepare frontend production environment variables:
   - Copy `my-service-portal/.env.production.example` to `my-service-portal/.env.production`
   - Set the real `VITE_API_BASE_URL` (your API domain)

2. Sign in to Firebase CLI:
   ```bash
   npx firebase-tools login
   ```

3. Deploy from the repository root:
   ```bash
   npx firebase-tools deploy --only hosting
   ```
