# My Service Portal

Интерактивный портал для инспекции 3D-модели оборудования (React + Three.js).

## Возможности
- Загрузка GLB-модели и интерактивная сцена.
- Фокус на детали по двойному клику (`fitToBox`).
- Режим разлёта деталей (explode) с плавной анимацией.
- Силуэт исходной модели в режиме разлёта (прозрачный корпус + рёбра).
- Линии между центром детали в силуэте и её текущей позицией.
- Подсветка детали при наведении.
- Панель управления с подсказками и горячими клавишами.
- Полноэкранный режим просмотра.
- Перемещение камеры `W/A/S/D` по горизонтальной плоскости.
- Demand-рендеринг с централизованным ограничением FPS для снижения нагрузки.

## Стек
- `React 19`
- `TypeScript`
- `Vite`
- `three`, `@react-three/fiber`, `@react-three/drei`
- `Redux Toolkit`, `react-redux`
- `React Router`
- `Sass (SCSS modules)`

## Быстрый старт
```bash
npm install
npm run dev
```

Открой страницу модели: `http://localhost:5173/model`

## Скрипты
- `npm run dev` — запуск dev-сервера
- `npm run build` — type-check + production build
- `npm run preview` — предпросмотр production-сборки
- `npm run lint` — проверка ESLint

## Управление
- `Esc` — сброс ракурса камеры
- `E` — включить/выключить разлёт
- `F` — полноэкранный режим
- `W/A/S/D` — перемещение камеры по плоскости
- `Двойной клик` по детали — фокус на детали
- `Клик` по пустой области — сброс камеры

## Структура проекта (FSD)
- `src/app` — инициализация приложения, роутинг, store
- `src/pages/ModelPage` — страница просмотра модели
- `src/features/scene-controls` — тулбар, хоткеи, управление камерой
- `src/entities/equipment` — сцена оборудования и отдельные части модели
- `src/shared` — общие UI-компоненты, хуки, утилиты Three.js

## Важные файлы
- `src/entities/equipment/ui/EquipmentScene.tsx` — построение сцены из GLB и расчёт разлёта
- `src/entities/equipment/ui/ModelPart.tsx` — логика детали (hover, explode, silhouette, линии)
- `src/features/scene-controls/model/useSceneControls.ts` — единая точка управления UI/хоткеями
- `src/shared/ui/CanvasLayout/CanvasLayout.tsx` — Canvas и базовый свет/окружение
- `src/shared/lib/three/invalidateCapped.ts` — централизованный менеджер invalidate с ограничением FPS

## Модель
По умолчанию используется файл:
- `public/assets/models/my_model.glb`

Чтобы подменить модель, замени файл или передай новый `modelUrl` в `EquipmentScene`.
