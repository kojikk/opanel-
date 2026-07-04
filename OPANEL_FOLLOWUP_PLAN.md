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

### 3.2. Stage 4 – Новые возможности панели

**Цель:** поверх устоявшейся архитектуры добавить ключевые фичи: роли, бэкапы, историю мониторинга, шаблоны серверов.

- **3.2.1. Роли и права доступа**
  - [ ] Расширить Prisma‑модель пользователей:
    - Варианты: `UserRole` (`OWNER`, `ADMIN`, `MOD`, `VIEWER` и т.п.).
    - Отношение `User`–`Server` (например, владелец/доступ к конкретным серверам).
  - [ ] Расширить слой auth:
    - Выдача JWT с ролью и списком доступных серверов.
    - Middleware/guard’ы для API‑роутов с проверкой ролей.
  - [ ] UI:
    - Страница управления пользователями/ролями (минимально: список пользователей, изменение роли, привязка к серверам).

- **3.2.2. Бэкапы и snapshot’ы**
  - [ ] Продумать формат бэкапов:
    - Архивация директории `servers/<name>` (за вычетом ненужных логов).
    - Хранение метаданных в БД (дата, размер, тип сервера, пометка пользователя).
  - [ ] Добавить API:
    - `/api/servers/[serverId]/backups` (создать, список, удалить, восстановить).
  - [ ] UI:
    - Вкладка/страница «Backups» с таблицей, кнопками `Create backup`, `Restore`, `Delete`.

- **3.2.3. Исторический мониторинг**
  - [ ] Спроектировать модель для хранения time‑series (упрощённо, без тяжёлого TS‑хранилища):
    - Таблица `ServerMetric` c (serverId, timestamp, cpu, ram, tps, mspt, onlinePlayers, diskUsage…).
  - [ ] CRON‑задача:
    - Периодически считывать текущие метрики из Docker/RCON и записывать в БД.
  - [ ] UI:
    - На дашборде добавить переключатель «Realtime / Last 24h / Last 7d».
    - Рисовать графики из БД, а не только из текущих SSE/поллинга.

- **3.2.4. Шаблоны серверов (server templates)**
  - [ ] Ввести сущность `ServerTemplate`:
    - Базовые поля: `type`, `mcVersion`, `memory`, `javaVersion`, набор дефолтных gamerules и config‑файлов.
  - [ ] API:
    - CRUD для шаблонов.
    - Использование шаблона при `POST /api/servers` (создание сервера на основе шаблона).
  - [ ] UI:
    - При создании сервера: выбор шаблона, предпросмотр параметров и конфигов.

### 3.3. Полировка UX и DX

- [ ] Пройтись по всем страницам `/panel/[serverId]/…` и:
  - Проверить на мобильных/узких экранах (Tailwind breakpoints).
  - Унифицировать расположение кнопок `Save`, `Apply`, `Restart`, `Start/Stop`.
- [ ] Добавить подсказки/tooltip’ы для сложных элементов (cron, gamerules, JVM memory и т.п.).
- [ ] Улучшить сообщения об ошибках:
  - Docker‑ошибки, отсутствие Docker‑демона.
  - Недоступность RCON / плагина.
- [ ] Настроить дополнительные unit‑/integration‑тесты:
  - Больше кейсов для RCON‑парсеров.
  - Тесты на server‑manager (например, корректность autoStart/pluginInstalled).

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

