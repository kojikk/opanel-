## OPanel Standalone Panel – Follow‑up Plan

Этот файл описывает, что уже сделано в ветке `feature/standalone-panel`, и формализует план дальнейшей доработки, чтобы другая модель могла продолжить работу последовательно и предсказуемо.

---

## 1. Что уже сделано

- **Архитектура и окружение**
  - Панель вынесена в отдельный проект `frontend/` на Next.js 15 / React 19 / TypeScript, Tailwind v4, Radix UI.
  - Бекенд панели использует Docker Engine API (`dockerode`) для управления контейнерами с Minecraft‑серверами.
  - Используется PostgreSQL (через Prisma ORM) для хранения состояния серверов и задач.
  - Аутентификация: JWT (`jose`) + cookie‑based сессии, хеширование паролей через `bcryptjs`.
  - Добавлен CRON (`node-cron`) для фоновых задач (авто‑рестарт, периодические действия).

- **Интеграция с Docker и RCON**
  - Реализован слой `frontend/lib/docker/client.ts`:
    - Создание/запуск/остановка/удаление контейнеров.
    - Получение статуса и статистики контейнеров (CPU, RAM, IO).
    - Стриминг логов (для терминала и мониторинга).
    - Функции `restartContainer`, `isDockerAvailable`, `waitForRcon`.
  - Реализован слой `frontend/lib/server-manager`:
    - Создание сервера: генерация путей, портов, имен, запись в Prisma, запуск контейнера.
    - Работа с RCON (через `rcon-client`) для выполнения команд.
    - Поле `pluginInstalled` и логика авто‑установки плагина в папку `plugins/` сервера.
  - При создании сервера автоматически подтягивается образ `itzg/minecraft-server`.

- **Миграция менеджера пакетов и сборки**
  - Frontend переведен с `npm` на **pnpm**:
    - В `frontend/package.json` добавлено `"packageManager": "pnpm@10.6.2"`.
    - Скрипты `dev`, `build`, `db:*`, `postinstall` переведены на `pnpm`/`prisma` без `npx`.
    - Удалён `package-lock.json`, добавлен `pnpm-lock.yaml`.
  - `frontend/Dockerfile` обновлён:
    - Используется `corepack` для активации `pnpm`.
    - На этапе deps: `pnpm install --frozen-lockfile --ignore-scripts`.
    - Сборка через `pnpm prisma generate` и `pnpm build`.
  - GitHub Actions `.github/workflows/build.yml`:
    - `frontend` job использует pnpm (`pnpm/action-setup@v4`, кеш по `pnpm-lock.yaml`).
    - `build` шагается через `pnpm build`.

- **Выделение Java‑плагина в `plugin/`**
  - В корне создан каталог `plugin/`.
  - Через `git mv` перенесены:
    - Корневые Gradle‑файлы: `build.gradle`, `settings.gradle`, `gradlew`, `gradlew.bat`, `gradle.properties`, папка `gradle/`.
    - Все Java‑модули плагина:
      - `core/`
      - `bukkit-helper/`
      - `fabric-helper/`, `fabric-1.19/`, `fabric-1.19.4/`, `fabric-1.20/`, `fabric-1.20.2/`, `fabric-1.20.3/`, `fabric-1.20.5/`, `fabric-1.21/`, `fabric-1.21.2/`, `fabric-1.21.5/`, `fabric-1.21.9/`, `fabric-1.21.11/`
      - `forge-helper/`, `forge-1.19.4/`, `forge-1.20.1/`, `forge-1.20.2/`, `forge-1.20.3/`, `forge-1.20.6/`, `forge-1.21/`, `forge-1.21.3/`, `forge-1.21.5/`, `forge-1.21.8/`, `forge-1.21.9/`, `forge-1.21.11/`
      - `neoforge-1.21.1/`
      - `spigot-1.16.1/`, `spigot-1.19.4/`, `spigot-1.20/`, `spigot-1.20.5/`, `spigot-1.21/`, `spigot-1.21.9/`
      - `folia-1.20/`, `folia-1.20.5/`, `folia-1.21/`, `folia-1.21.11/`
  - Обновлён `.github/workflows/build.yml`:
    - Job `jar` теперь с `defaults.run.working-directory: ./plugin`.
    - Артефакты: `./plugin/build/libs/*`.
  - Обновлён корневой `.gitignore`:
    - `/plugin/core/src/main/resources/web/` (старая web‑часть из Java‑проекта).
    - Добавлен `servers/` (локальные данные докер‑серверов).

- **Prisma и модель серверов**
  - `frontend/prisma/schema.prisma` – модель `Server` расширена:
    - `description?: String`, `javaVersion: String @default("21")`,
      `autoStart: Boolean @default(false)`, `pluginInstalled: Boolean @default(false)`.
  - Исправлены проблемы с подключением к БД и генерацией Prisma Client в Docker.

- **API‑слой Next.js**
  - Реализованы маршруты:
    - `/api/servers` (создание, список).
    - `/api/servers/[serverId]` (инфо, действия start/stop/restart/delete).
    - `/api/servers/[serverId]/terminal` (SSE‑логи + RCON команды).
    - `/api/servers/[serverId]/monitor` (CPU/RAM из Docker + TPS/MSPT через плагин или RCON‑fallback).
    - `/api/servers/[serverId]/players`, `/whitelist`, `/plugins`, `/saves`, `/logs`, `/tasks`, `/gamerules`, `/icon`.
  - Иконки и плагины исправлены по типам:
    - Ответы с бинарными данными используют `new Uint8Array(buffer)` для совместимости с `BodyInit`.

- **RCON‑утилиты и тесты**
  - Вынесены парсеры RCON‑ответов в `frontend/lib/rcon/parsers.ts`:
    - `parseTps`, `parseMspt`, `parsePlayerList`.
    - Учёт разных форматов (например, `50ms` без пробела, корректная выборка значения после двоеточия, игнор `*`).
  - Настроен Vitest (`frontend/vitest.config.ts`) с `@`‑alias и `__tests__`:
    - Тесты для RCON‑парсеров.
    - Тесты для общих утилит (валидация IP, чисел, генерация строк, пр.).
    - Тесты для server‑manager (sanitizeName, имена контейнеров).
  - Все тесты проходят.

- **UI и UX панели**
  - Введён `ServerContext` в `app/panel/[serverId]/layout.tsx`:
    - Хранит данные выбранного сервера (тип, версия, порты, статус, autoStart, pluginInstalled).
    - Обновляет `VersionContext` на основе данных сервера.
  - Адаптированы страницы под `app/panel/[serverId]/…` (multi‑server):
    - **Dashboard**: карточки статуса сервера, uptime, список игроков, графики CPU/RAM/TPS, мини‑терминал.
    - **Terminal**: полный лог с SSE, ввод RCON‑команд, история, фильтры уровней логов, fullscreen‑режим.
    - **Players**: таблица онлайн‑игроков, экшены (kick/ban/op/deop), вкладка банов, управление whitelist (enable/disable/add/remove/reload).
    - **Plugins**: список включённых/отключенных плагинов, поиск, drag‑and‑drop загрузка `.jar`, переключение enable/disable, удаление.
    - **Saves**: список миров/сейвов, размер, удаление.
    - **Logs**: список лог‑файлов, просмотр с ANSI‑цветами, удаление старых логов.
    - **Gamerules**: поиск по gamerules, inline‑редактирование, массовое сохранение (Ctrl+S), индикатор несохранённых изменений.
    - **Tasks**: планировщик задач с cron, создание/редактирование/удаление, включение/выключение.
    - **Settings**: объединённая страница конфигов (`server.properties`, bukkit.yml, spigot.yml, paper.yml и пр.) через Monaco Editor, Ctrl+S, индикатор несохранённых изменений, фильтрация файлов по типу сервера.
  - Sidebar (`components/app-sidebar.tsx`):
    - Пункт `Bukkit Config` заменён на `Settings` с путём `/panel/[serverId]/settings`.
    - В i18n добавлен ключ `"sidebar.config.settings"`.
  - `SubPage` и layout’ы:
    - Добавлен `hideNavbar` и корректная работа с `max-h-screen`, чтобы не прятался Navbar на дашборде.
  - Логин‑страница:
    - Полностью переработан layout: фон как абсолютный блок с оверлеем, форма логина по центру (`justify-center items-center`), фикс выезжающей/смещённой формы.

- **Линтер и типы**
  - Исправлено большинство предупреждений ESLint:
    - `import/order`, `react-hooks/exhaustive-deps`, `no-unused-vars`, `consistent-type-imports`.
  - Типы API‑роутов и React‑компонентов доведены до успешного `next build --no-lint-errors` (остались только «разрешённые» предупреждения, не блокирующие build).

---

## 2. Краткий чек‑лист текущего состояния

- [x] Панель вынесена в `frontend/`, Java‑плагин — в `plugin/`.
- [x] Docker‑интеграция (создание/управление серверами, лог‑стриминг, мониторинг).
- [x] RCON‑интеграция и fallback‑логика без плагина.
- [x] Prisma‑схема обновлена под Docker‑серверы.
- [x] UI всех основных страниц адаптирован к `/panel/[serverId]/…`.
- [x] Unit‑тесты (Vitest) настроены и проходят.
- [x] Миграция на pnpm завершена, CI и Docker обновлены.
- [x] Плагин полностью вынесен в `plugin/`, Gradle‑сборка оттуда работает.
- [x] Tailwind v4 + shadcn/ui (New York, `components/ui/`) подключены и используются.

---

## 3. План доработок (Stage 3–4 и далее)

Этот раздел — ориентир для следующей модели. Пункты можно выполнять по очереди, помечая как `done` по мере выполнения.

### 3.1. Stage 3 – Очистка и вынос legacy‑логики

**Цель:** избавиться от дублирования между старым Java‑web (внутри плагина) и новой Next.js‑панелью, оставить в плагине только то, что действительно нужно для глубокой интеграции с сервером.

- **3.1.1. Выпилить legacy‑web из Java‑плагина**
  - [ ] Проанализировать в `plugin/core` и связанных модулях:
    - Контроллеры `controller/api/*`, Javalin routes, старые HTML/JS ресурсы.
  - [ ] Убедиться, что всё, что сейчас делает панель (`/panel/...`, `/api/...` в Next.js), не требует HTTP‑эндпоинтов из плагина.
  - [ ] Пометить и затем удалить/задепрекейтить:
    - Старый HTTP‑сервер плагина (если ещё активен).
    - Старые REST/WS‑эндпоинты, которые полностью переехали в панель.
  - [ ] Оставить в плагине только:
    - API для получения TPS/MSPT, инвентарей, NBT, ивентов.
    - WebSocket/endpoint для push‑событий (если ещё нужен для терминала/инвентаря).

- **3.1.2. Упорядочить Java‑модули**
  - [ ] Проверить, какие модули реально нужны для первой версии standalone‑панели (например, только текущие версии Fabric/Forge/Spigot, без старых).
  - [ ] Рассмотреть возможность:
    - Явного помечания legacy‑модулей (названием/комментарием).
    - Или их полного удаления/выноса в отдельную ветку, если они не будут поддерживаться.

- **3.1.3. Удалить/почистить неиспользуемый frontend‑код**
  - [ ] Найти старые страницы `app/panel/...` без `[serverId]` (если ещё остались) и удалить их.
  - [ ] Убедиться, что старый API‑клиент (если остался из Java‑версии) не используется.
  - [ ] Удалить/упростить любые временные заглушки, использованные при миграции.

### 3.2. Stage 4 – Дизайн и UX

**Цель:** привести визуальную часть к единому стилю Liquid Glass, заменить разрозненные UI‑паттерны на модальные диалоги, довести компонентную базу shadcn до полноты.

- **3.2.1. Дизайн‑система Liquid Glass**
  - [ ] Определить CSS‑переменные / Tailwind‑токены для стиля:
    - `backdrop-blur`, полупрозрачные фоны (`bg-white/10`, `bg-black/20`), мягкие тени, `border-white/20`.
    - Переменные для светлой и тёмной темы.
  - [ ] Обновить `app/globals.css` и shadcn‑токены под новый стиль.
  - [ ] Пройтись по всем страницам `/panel/[serverId]/…` и применить токены:
    - Карточки, сайдбар, хедер, таблицы, редактор.

- **3.2.2. Модальные диалоги**
  - [ ] Аудит текущих inline‑форм и подтверждений — определить, что должно стать модалкой:
    - Создание сервера, удаление сервера, импорт сервера, управление пользователями, создание бэкапа.
  - [ ] Реализовать модалки через `@radix-ui/react-dialog` (уже в shadcn):
    - Единый `<ConfirmDialog>` для деструктивных действий.
    - Полноценные формы внутри `<Dialog>` с `react-hook-form` + zod‑валидацией.
  - [ ] Унифицировать расположение кнопок `Save`, `Apply`, `Restart`, `Start/Stop` во всех диалогах.

### 3.3. Stage 5 – Auth и роли

**Цель:** заменить текущую простую JWT‑auth на OAuth 2.0 и добавить полноценную систему ролей.

- **3.3.1. OAuth 2.0 с JWT**
  - [ ] Выбрать провайдеров (Discord, GitHub — наиболее уместны для аудитории).
  - [ ] Интегрировать через **NextAuth.js v5** (Auth.js) поверх существующего `jose`‑слоя:
    - Провайдеры: Discord, GitHub + credentials (email/password как fallback).
    - Сессии: JWT‑стратегия, access token в cookie.
  - [ ] Обновить Prisma‑схему:
    - Добавить модели `Account`, `Session` (стандарт Auth.js).
  - [ ] Убрать текущие ручные `bcryptjs`‑роуты `/api/auth/*`, заменить на Auth.js handlers.
  - [ ] UI:
    - Страница логина: кнопки «Войти через Discord / GitHub» + форма email/пароль.

- **3.3.2. Система ролей**
  - [ ] Расширить Prisma‑модель:
    - `UserRole` enum: `OWNER`, `ADMIN`, `MOD`, `VIEWER`.
    - Таблица `ServerAccess` (`userId`, `serverId`, `role`) — доступ к конкретным серверам.
  - [ ] JWT‑payload расширить: `role`, `serverId[]` (список доступных серверов).
  - [ ] Middleware (`middleware.ts`) с проверкой ролей для `/panel/*` и `/api/servers/*`.
  - [ ] UI:
    - Страница управления пользователями (только для `OWNER`/`ADMIN`): список, изменение роли, привязка к серверам.
    - Скрывать/блокировать деструктивные кнопки для `VIEWER` / `MOD`.

### 3.4. Stage 6 – Функциональные фичи

**Цель:** закрыть ключевые пользовательские сценарии, которых не хватает.

- **3.4.1. Иконка сервера и MOTD**
  - [ ] API `/api/servers/[serverId]/icon` уже есть — проверить read/write.
  - [ ] API для MOTD: чтение/запись поля `motd` в `server.properties` через RCON или прямую запись файла.
  - [ ] UI на странице Settings (или отдельная карточка на Dashboard):
    - Загрузка/смена PNG‑иконки (64×64), предпросмотр.
    - Inline‑редактирование MOTD с поддержкой Minecraft‑цветовых кодов (`§`) и превью.

- **3.4.2. Автоматическая сборка и установка плагина OPanel**
  - [ ] При создании сервера (или по кнопке в Settings):
    - Триггерить Gradle‑сборку плагина (`./gradlew build` в `plugin/`) через `child_process` или Docker‑контейнер с JDK.
    - Копировать собранный `.jar` из `plugin/build/libs/` в папку `plugins/` сервера.
  - [ ] Статус сборки отображать в UI (прогресс / лог / ошибка).
  - [ ] Поле `pluginInstalled` в Prisma обновлять по результату.

- **3.4.3. Импорт существующего сервера из папки**
  - [ ] API `POST /api/servers/import`:
    - Принимает путь к папке на хосте (или zip‑архив через upload).
    - Считывает `server.properties` (port, level-name, version если есть).
    - Создаёт Docker‑контейнер с volume на указанную папку (или копирует содержимое в `servers/<name>/`).
    - Записывает запись в Prisma.
  - [ ] UI: модалка «Импортировать сервер» с полем пути / drag‑and‑drop архива, предпросмотром найденных параметров.

- **3.4.4. Бэкапы и snapshot’ы**
  - [ ] Продумать формат:
    - Архивация `servers/<name>` (без логов).
    - Метаданные в БД: дата, размер, тип сервера, метка пользователя.
  - [ ] API `/api/servers/[serverId]/backups` (создать, список, удалить, восстановить).
  - [ ] UI: вкладка «Backups» с таблицей, кнопками `Create`, `Restore`, `Delete`.

- **3.4.5. Исторический мониторинг**
  - [ ] Prisma‑модель `ServerMetric` (serverId, timestamp, cpu, ram, tps, mspt, players, disk).
  - [ ] CRON‑задача: периодически писать метрики из Docker/RCON в БД.
  - [ ] UI: переключатель «Realtime / 24h / 7d» на дашборде, графики из БД.

- **3.4.6. Шаблоны серверов**
  - [ ] Сущность `ServerTemplate`: type, mcVersion, memory, javaVersion, дефолтные gamerules и config‑файлы.
  - [ ] CRUD API для шаблонов.
  - [ ] При создании сервера: выбор шаблона, предпросмотр параметров.

### 3.5. Полировка DX и тесты

- [ ] Улучшить сообщения об ошибках: Docker‑демон недоступен, RCON‑таймаут, плагин не установлен.
- [ ] Tooltip’ы для cron, gamerules, JVM memory.
- [ ] Адаптив: проверить все страницы на мобильных breakpoints.
- [ ] Дополнительные Vitest‑тесты: RCON‑парсеры (edge‑cases), server‑manager (autoStart, pluginInstalled, import).

---

## 4. Как использовать этот план другой модели

- Начинать с **раздела 3**, выполнять подпункты по порядку.
- Перед каждой крупной задачей:
  - Просмотреть соответствующий код (указанные директории и файлы).
  - Обновить этот файл, пометив выполненные пункты как `[x]` и при необходимости добавив подзадачи.
- Соблюдать существующую архитектуру:
  - Frontend — только в `frontend/`.
  - Java‑плагин — только в `plugin/`.
  - Docker/Prisma конфигурация не должна ломать текущую работу `docker-compose.dev.yml` и production‑compose.

