# My Service Portal

Это монорепозиторий с двумя приложениями:
- `my-service-portal` - фронтенд (React + Vite)
- `my-service-portal-backend` - бэкенд API (Fastify + TypeScript)

Приложение предоставляет каталог и просмотр 3D-моделей, а также админ-раздел для управления контентом.

## Требования
- Node.js 20+
- npm 10+

## Быстрый запуск
1. Установите зависимости:
   ```bash
   cd my-service-portal-backend
   npm install

   cd ../my-service-portal
   npm install
   ```

2. Настройте `.env` файлы:
   - Скопируйте `my-service-portal-backend/.env.example` в `my-service-portal-backend/.env`
   - Скопируйте `my-service-portal/.env.example` в `my-service-portal/.env`

3. Запустите бэкенд (Терминал 1):
   ```bash
   cd my-service-portal-backend
   npm run dev
   ```
   Базовый URL API: `http://localhost:8787`

4. Запустите фронтенд (Терминал 2):
   ```bash
   cd my-service-portal
   npm run dev
   ```
   URL приложения по умолчанию: `http://localhost:5173`

## Сборка
Фронтенд:
```bash
cd my-service-portal
npm run build
```

Бэкенд:
```bash
cd my-service-portal-backend
npm run build
```

## Деплой фронтенда на Firebase Hosting
В репозитории уже добавлены:
- `firebase.json` (конфиг Hosting, SPA rewrite и predeploy build)
- `.firebaserc` (ID Firebase-проекта, замените `your-firebase-project-id`)

Порядок действий:
1. Подготовьте production-переменные фронтенда:
   - Скопируйте `my-service-portal/.env.production.example` в `my-service-portal/.env.production`
   - Укажите реальный `VITE_API_BASE_URL` (домен вашего API)

2. Авторизуйтесь в Firebase CLI:
   ```bash
   npx firebase-tools login
   ```

3. Из корня репозитория выполните деплой:
   ```bash
   npx firebase-tools deploy --only hosting
   ```
