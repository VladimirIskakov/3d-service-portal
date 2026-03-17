
---

# My Service Portal

## Обзор проекта

My Service Portal — это монорепозиторий сервиса с каталогом и просмотром 3D-моделей, а также административной панелью для управления контентом и данными.
Демо версию можно опробовать здесь: https://service-portal-3d-inspection.web.app/catalog

---

## Технологический стек

### Frontend (`my-service-portal`):

* React 19 + TypeScript
* Vite
* Redux Toolkit + React Router
* Three.js + React Three Fiber + Drei
* Sass

### Backend (`my-service-portal-backend`):

* Fastify 5 + TypeScript
* Firebase Admin SDK
* Dotenv
* Плагины Fastify (`@fastify/cors`, `@fastify/static`)
* TSX (режим разработки)

---

## Структура проекта

Этот монорепозиторий содержит два приложения:

* `my-service-portal` — frontend (React + Vite)
* `my-service-portal-backend` — backend API (Fastify + TypeScript)

Приложение предоставляет каталог и просмотр 3D-моделей, а также админ-панель для управления контентом.

---

## Требования

* Node.js 20+
* npm 10+

---

## Быстрый старт

### 1. Установка зависимостей:

```bash
cd my-service-portal-backend
npm install

cd ../my-service-portal
npm install
```

---

### 2. Настройка `.env` файлов:

* Скопируйте `my-service-portal-backend/.env.example` в `my-service-portal-backend/.env`
* Скопируйте `my-service-portal/.env.example` в `my-service-portal/.env`

---

### 3. Запуск backend (Терминал 1):

```bash
cd my-service-portal-backend
npm run dev
```

Базовый URL API:

```
http://localhost:8787
```

---

### 4. Запуск frontend (Терминал 2):

```bash
cd my-service-portal
npm run dev
```

Адрес приложения по умолчанию:

```
http://localhost:5173
```

---

## Сборка

### Frontend:

```bash
cd my-service-portal
npm run build
```

### Backend:

```bash
cd my-service-portal-backend
npm run build
```

---

## Деплой frontend в Firebase Hosting

Уже включено в репозиторий:

* `firebase.json` (конфиг хостинга, SPA rewrite и predeploy сборка)
* `.firebaserc` (ID проекта Firebase — замените `your-firebase-project-id`)

---

### Шаги:

1. Подготовьте переменные окружения для production:

   * Скопируйте `my-service-portal/.env.production.example` в `my-service-portal/.env.production`
   * Укажите реальный `VITE_API_BASE_URL` (домен вашего API)

---

2. Авторизуйтесь в Firebase CLI:

```bash
npx firebase-tools login
```

---

3. Выполните деплой из корня репозитория:

```bash
npx firebase-tools deploy --only hosting
```
