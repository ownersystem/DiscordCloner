# DiscordCloner v8

🇷🇺 [Русский](#-русский) · 🇬🇧 [English](#-english)

---

## 🇷🇺 Русский

Консольный инструмент для клонирования структуры Discord-сервера: роли, каналы (с правами доступа), эмодзи, стикеры и базовые настройки сервера.

### Возможности

- Полное клонирование ролей (имена, цвета, разрешения, позиции)
- Клонирование каналов и категорий с правами доступа, сохранением иерархии
- Устойчивое создание каналов: при отказе Discord API (`400 Bad Request`) выполняется повтор с нормализованным названием, а при необходимости — без эмодзи/спецсимволов
- Автоматическая проверка `rtc_region` голосовых/трибунных каналов по актуальному списку регионов Discord — недопустимые/устаревшие регионы отбрасываются вместо падения запроса
- Клонирование эмодзи и стикеров с учётом лимитов сервера (буст-уровни)
- Копирование названия, аватарки и баннера сервера
- Отдельные режимы: полное клонирование, только эмодзи/стикеры, только роли (с гибкими настройками — с разрешениями/позициями или без)
- Подробный лог ошибок с реальной причиной от Discord API, а не общим "400"
- Интерфейс на русском и английском языках — выбор языка на самом первом экране, до ввода токена
- Сохранение отчёта о клонировании в лог-файл

### Установка

```bash
npm install
```

### Запуск

```bash
npm run dev
```

или сборка и запуск скомпилированной версии:

```bash
npm run build
npm start
```

### Использование

1. При первом запуске выберите язык интерфейса (🇷🇺 Русский / 🇬🇧 English).
2. Введите Discord-токен.
3. Укажите ID исходного сервера (с которого клонировать) и ID целевого сервера (куда клонировать).
4. Выберите режим клонирования и следуйте подсказкам.

> ⚠️ Полное клонирование удаляет все существующие каналы и роли на целевом сервере. Это действие необратимо — используйте инструмент только на серверах, где у вас есть на это право.

### Требования

- Node.js 18+
- Токен аккаунта или бота с необходимыми правами на обоих серверах

---

## 🇬🇧 English

A console tool for cloning the structure of a Discord server: roles, channels (with permission overwrites), emojis, stickers, and basic server settings.

### Features

- Full role cloning (names, colors, permissions, positions)
- Channel and category cloning with permission overwrites and preserved hierarchy
- Resilient channel creation: on a `400 Bad Request` from the Discord API, the tool retries with a normalized name and, if needed, with emojis/special characters stripped
- Automatic validation of `rtc_region` for voice/stage channels against Discord's current region list — invalid or deprecated regions are dropped instead of failing the request
- Emoji and sticker cloning that respects server limits (boost tiers)
- Copying the server name, icon, and banner
- Separate modes: full clone, emojis/stickers only, roles only (with or without permissions/positions)
- Detailed error log showing the actual reason from the Discord API, not a generic "400"
- Russian and English interface — language selection appears on the very first screen, before the token prompt
- Saves a clone report to a log file

### Installation

```bash
npm install
```

### Running

```bash
npm run dev
```

or build and run the compiled version:

```bash
npm run build
npm start
```

### Usage

1. On first launch, pick the interface language (🇷🇺 Русский / 🇬🇧 English).
2. Enter your Discord token.
3. Provide the source server ID (to clone from) and the target server ID (to clone into).
4. Pick a clone mode and follow the prompts.

> ⚠️ A full clone deletes all existing channels and roles on the target server. This action is irreversible — only use this tool on servers you're authorized to modify.

### Requirements

- Node.js 18+
- An account or bot token with the necessary permissions on both servers
