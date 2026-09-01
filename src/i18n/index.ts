export type Locale = "ru" | "en";

export interface LanguageOption {
  code: Locale;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

let currentLocale: Locale = "ru";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

type Dict = Record<string, Record<Locale, string>>;

const dict: Dict = {
  "lang.promptTitle": {
    ru: "Выберите язык интерфейса / Select interface language",
    en: "Выберите язык интерфейса / Select interface language",
  },
  "lang.enterNumber": { ru: "Введите номер", en: "Enter a number" },

  "app.sessionEnded": { ru: "Сессия завершена.", en: "Session ended." },
  "app.interrupted": { ru: "Прервано пользователем.", en: "Interrupted by user." },
  "app.uncaughtException": { ru: "Необработанное исключение", en: "Uncaught exception" },
  "app.unhandledRejection": { ru: "Необработанный отказ", en: "Unhandled rejection" },

  "banner.system": { ru: "система", en: "system" },
  "banner.version": { ru: "версия", en: "version" },
  "banner.owner": { ru: "владелец", en: "owner" },
  "banner.build": { ru: "сборка", en: "build" },
  "banner.hint": {
    ru: "Введите ID серверов и токен для начала клонирования.",
    en: "Enter the server IDs and token to start cloning.",
  },

  "prompt.token": { ru: "Discord Токен", en: "Discord Token" },
  "prompt.tokenEmpty": { ru: "Токен не может быть пустым", en: "Token cannot be empty" },
  "prompt.authRetry": {
    ru: "Ошибка аутентификации. Попробуйте снова или нажмите Ctrl+C для выхода.",
    en: "Authentication failed. Try again or press Ctrl+C to exit.",
  },
  "prompt.sourceGuildId": {
    ru: "ID Исходного Сервера (сервер для клонирования)",
    en: "Source Server ID (server to clone)",
  },
  "prompt.targetGuildId": {
    ru: "ID Целевого Сервера (сервер для копирования)",
    en: "Target Server ID (server to copy into)",
  },
  "prompt.invalidGuildId": {
    ru: "Неверный формат ID сервера. Должен содержать 17-20 цифр.",
    en: "Invalid server ID format. Must be 17-20 digits.",
  },
  "prompt.sameGuildError": {
    ru: "Исходный и целевой серверы не могут совпадать.",
    en: "Source and target servers cannot be the same.",
  },
  "prompt.cloneSuccessNoErrors": {
    ru: "Клонирование завершено без ошибок.",
    en: "Cloning completed with no errors.",
  },
  "prompt.cloneSuccessWithErrors": {
    ru: "Клонирование завершено с {count} ошибок(ами).",
    en: "Cloning completed with {count} error(s).",
  },
  "prompt.criticalCloneError": {
    ru: "Критическая ошибка клонирования",
    en: "Critical cloning error",
  },
  "prompt.cloneAnother": { ru: "Клонировать другой сервер?", en: "Clone another server?" },
  "prompt.yesNoHint": { ru: "Введите {yes} (да) или {no} (нет).", en: "Enter {yes} (yes) or {no} (no)." },
  "prompt.invalidChoice": {
    ru: "Неверный выбор. Введите число от 1 до {max}.",
    en: "Invalid choice. Enter a number from 1 to {max}.",
  },

  "auth.checking": { ru: "Проверка учётных данных...", en: "Verifying credentials..." },
  "auth.success": { ru: "Аутентификация успешна", en: "Authentication successful" },
  "auth.invalidToken": {
    ru: "Недействительный токен — аутентификация отклонена",
    en: "Invalid token — authentication rejected",
  },
  "auth.connectionError": { ru: "Ошибка соединения: {message}", en: "Connection error: {message}" },
  "auth.genericError": { ru: "Ошибка аутентификации", en: "Authentication error" },

  "spinner.genericError": { ru: "Произошла ошибка", en: "An error occurred" },
  "spinner.tokenPhase1": {
    ru: "Инициализация защищённого соединения",
    en: "Initializing secure connection",
  },
  "spinner.tokenPhase2": {
    ru: "Отправка запроса аутентификации",
    en: "Sending authentication request",
  },
  "spinner.tokenPhase3": { ru: "Проверка подписи токена", en: "Verifying token signature" },
  "spinner.tokenPhase4": { ru: "Получение данных аккаунта", en: "Fetching account data" },
  "spinner.tokenPhase5": { ru: "Установка сессии", en: "Establishing session" },

  "logger.loggedInAs": { ru: "Вход выполнен как", en: "Logged in as" },
  "logger.sourceStatsTitle": {
    ru: "СТАТИСТИКА ИСХОДНОГО СЕРВЕРА",
    en: "SOURCE SERVER STATISTICS",
  },
  "logger.roles": { ru: "Ролей", en: "Roles" },
  "logger.channels": { ru: "Каналов", en: "Channels" },
  "logger.emojis": { ru: "Эмодзи", en: "Emojis" },
  "logger.stickers": { ru: "Стикеров", en: "Stickers" },
  "logger.estimatedTime": { ru: "Расчётное время", en: "Estimated time" },
  "logger.estimatedFinish": { ru: "Завершение около", en: "Estimated finish" },
  "logger.summaryTitle": { ru: "ИТОГИ КЛОНИРОВАНИЯ", en: "CLONE SUMMARY" },
  "logger.rolesCloned": { ru: "Ролей клонировано", en: "Roles cloned" },
  "logger.channelsCloned": { ru: "Каналов клонировано", en: "Channels cloned" },
  "logger.permissionsApplied": { ru: "Разрешений применено", en: "Permissions applied" },
  "logger.emojisCloned": { ru: "Эмодзи клонировано", en: "Emojis cloned" },
  "logger.stickersCloned": { ru: "Стикеров клонировано", en: "Stickers cloned" },
  "logger.errors": { ru: "Ошибки", en: "Errors" },
  "logger.duration": { ru: "Длительность", en: "Duration" },
  "logger.durationMinSec": { ru: "{min} мин {sec} сек", en: "{min} min {sec} sec" },
  "logger.durationSec": { ru: "{sec} сек", en: "{sec} sec" },
  "logger.durationSuffix": { ru: "с", en: "s" },

  "api.timeout": { ru: "Превышено время ожидания операции", en: "Operation timed out" },

  "cloner.waitingStabilization": {
    ru: 'Ожидание стабилизации API после раздела "{label}"...',
    en: 'Waiting for API to stabilize after "{label}" section...',
  },
  "cloner.loadingGuildInfo": { ru: "Загрузка информации о серверах...", en: "Loading server info..." },
  "cloner.guildsLoaded": { ru: "Серверы загружены", en: "Servers loaded" },
  "cloner.guildsLoadError": { ru: "Ошибка загрузки данных серверов", en: "Failed to load server data" },
  "cloner.guildsFetchError": { ru: "Ошибка получения серверов: {message}", en: "Failed to fetch servers: {message}" },
  "cloner.collectingStats": { ru: "Сбор статистики сервера...", en: "Collecting server statistics..." },
  "cloner.sourceServer": { ru: "Исходный сервер", en: "Source server" },
  "cloner.targetServer": { ru: "Целевой сервер", en: "Target server" },

  "cloner.modeTitle": { ru: "РЕЖИМ КЛОНИРОВАНИЯ", en: "CLONE MODE" },
  "cloner.modeFull": {
    ru: "Клонировать всё — роли, каналы, настройки  (без эмодзи и стикеров)",
    en: "Clone everything — roles, channels, settings  (no emojis or stickers)",
  },
  "cloner.modeMedia": {
    ru: "Только эмодзи и стикеры  (эмодзи: {emojis}, стикеры: {stickers})",
    en: "Emojis and stickers only  (emojis: {emojis}, stickers: {stickers})",
  },
  "cloner.modeRolesBasic": {
    ru: "Только роли  (имена, цвета, настройки)  (ролей: {roles})",
    en: "Roles only  (names, colors, settings)  (roles: {roles})",
  },
  "cloner.modeRolesPerms": {
    ru: "Только роли + разрешения  (ролей: {roles})",
    en: "Roles + permissions only  (roles: {roles})",
  },
  "cloner.modeRolesFull": {
    ru: "Только роли + разрешения + позиции  (ролей: {roles})",
    en: "Roles + permissions + positions only  (roles: {roles})",
  },

  "cloner.emojisToCopy": { ru: "Эмодзи для копирования", en: "Emojis to copy" },
  "cloner.stickersToCopy": { ru: "Стикеров для копирования", en: "Stickers to copy" },
  "cloner.confirmMedia": {
    ru: "Начать копирование эмодзи и стикеров?",
    en: "Start copying emojis and stickers?",
  },
  "cloner.cancelled": { ru: "Копирование отменено.", en: "Copying cancelled." },
  "cloner.emojisSectionTitle": { ru: "ЭМОДЗИ", en: "EMOJIS" },
  "cloner.stickersSectionTitle": { ru: "СТИКЕРЫ", en: "STICKERS" },
  "cloner.rolesSectionTitle": { ru: "РОЛИ", en: "ROLES" },
  "cloner.channelsSectionTitle": { ru: "КАНАЛЫ", en: "CHANNELS" },
  "cloner.settingsSectionTitle": { ru: "НАСТРОЙКИ СЕРВЕРА", en: "SERVER SETTINGS" },
  "cloner.settingsShort": { ru: "НАСТРОЙКИ", en: "SETTINGS" },
  "cloner.emojisCopied": { ru: "{count} эмодзи успешно скопировано", en: "{count} emojis copied successfully" },
  "cloner.stickersCopied": { ru: "{count} стикеров успешно скопировано", en: "{count} stickers copied successfully" },

  "cloner.modeLabelRolesBasic": {
    ru: "только роли (имена, цвета, настройки)",
    en: "roles only (names, colors, settings)",
  },
  "cloner.modeLabelRolesPerms": { ru: "роли с разрешениями", en: "roles with permissions" },
  "cloner.modeLabelRolesFull": {
    ru: "роли с разрешениями и позициями",
    en: "roles with permissions and positions",
  },
  "cloner.rolesModeLabel": { ru: "Режим копирования ролей", en: "Role copy mode" },
  "cloner.rolesToCopy": { ru: "Ролей для копирования", en: "Roles to copy" },
  "cloner.confirmRoles": { ru: "Начать копирование ролей ({mode})?", en: "Start copying roles ({mode})?" },
  "cloner.rolesCopied": { ru: "{count} ролей успешно скопировано", en: "{count} roles copied successfully" },

  "cloner.destructiveWarning1": {
    ru: "Эта операция УДАЛИТ все существующие каналы и роли на целевом сервере.",
    en: "This operation will DELETE all existing channels and roles on the target server.",
  },
  "cloner.destructiveWarning2": { ru: "Это действие НЕОБРАТИМО.", en: "This action is IRREVERSIBLE." },
  "cloner.confirmCopyName": { ru: "Скопировать название сервера? ({name})", en: "Copy server name? ({name})" },
  "cloner.confirmCopyIcon": { ru: "Скопировать аватарку сервера?", en: "Copy server icon?" },
  "cloner.confirmCopyBanner": { ru: "Скопировать баннер сервера?", en: "Copy server banner?" },
  "cloner.confirmFull": { ru: "Подтвердить клонирование?", en: "Confirm cloning?" },
  "cloner.rolesCloned": { ru: "{count} ролей успешно клонировано", en: "{count} roles cloned successfully" },
  "cloner.channelsCloned": { ru: "{count} каналов успешно клонировано", en: "{count} channels cloned successfully" },

  "cloner.copyingName": { ru: "Копирование названия сервера...", en: "Copying server name..." },
  "cloner.copyingIcon": { ru: "Копирование аватарки сервера...", en: "Copying server icon..." },
  "cloner.iconError": { ru: "Ошибка загрузки аватарки: {message}", en: "Failed to upload icon: {message}" },
  "cloner.iconErrorShort": { ru: "Ошибка загрузки аватарки", en: "Failed to upload icon" },
  "cloner.copyingBanner": { ru: "Копирование баннера сервера...", en: "Copying server banner..." },
  "cloner.bannerError": { ru: "Ошибка загрузки баннера: {message}", en: "Failed to upload banner: {message}" },
  "cloner.bannerErrorShort": { ru: "Ошибка загрузки баннера", en: "Failed to upload banner" },
  "cloner.settingsSynced": { ru: "Настройки сервера синхронизированы", en: "Server settings synced" },
  "cloner.settingsError": {
    ru: "Ошибка синхронизации настроек сервера: {message}",
    en: "Failed to sync server settings: {message}",
  },
  "cloner.settingsErrorShort": { ru: "Ошибка синхронизации настроек сервера", en: "Failed to sync server settings" },

  "roles.loading": { ru: "Загрузка ролей...", en: "Loading roles..." },
  "roles.deletingExisting": {
    ru: "Удаление {count} существующих ролей с целевого сервера",
    en: "Deleting {count} existing roles from the target server",
  },
  "roles.deleted": { ru: "Роль удалена", en: "Role deleted" },
  "roles.deleteError": { ru: "Ошибка удаления роли: {name}", en: "Failed to delete role: {name}" },
  "roles.cloningInOrder": { ru: "Клонирование {count} ролей по порядку...", en: "Cloning {count} roles in order..." },
  "roles.created": { ru: "Роль создана", en: "Role created" },
  "roles.createError": { ru: 'Ошибка создания роли "{name}": {message}', en: 'Failed to create role "{name}": {message}' },
  "roles.createErrorShort": { ru: "Ошибка создания роли", en: "Failed to create role" },
  "roles.sortingPositions": { ru: "Сортировка позиций ролей...", en: "Sorting role positions..." },
  "roles.positionsApplied": { ru: "Позиции ролей применены", en: "Role positions applied" },
  "roles.positionsError": { ru: "Ошибка изменения порядка ролей", en: "Failed to reorder roles" },

  "emojis.loading": { ru: "Загрузка эмодзи...", en: "Loading emojis..." },
  "emojis.deletingExisting": {
    ru: "Удаление {count} существующих эмодзи с целевого сервера",
    en: "Deleting {count} existing emojis from the target server",
  },
  "emojis.deleted": { ru: "Эмодзи удалён", en: "Emoji deleted" },
  "emojis.deleteError": { ru: "Ошибка удаления эмодзи: {name}", en: "Failed to delete emoji: {name}" },
  "emojis.cloning": { ru: "Клонирование {count} эмодзи...", en: "Cloning {count} emojis..." },
  "emojis.batchPause": {
    ru: "Пауза перед следующей партией ({current}/{total})...",
    en: "Pausing before next batch ({current}/{total})...",
  },
  "emojis.created": { ru: "Эмодзи создан", en: "Emoji created" },
  "emojis.limitReached": {
    ru: "Достигнут лимит эмодзи сервера — скопировано {cloned} из {total}",
    en: "Server emoji limit reached — copied {cloned} of {total}",
  },
  "emojis.limitSkipped": { ru: "пропущено {count} шт.", en: "{count} skipped" },
  "emojis.limitBoostHint": {
    ru: "Для увеличения лимита повысьте уровень буста целевого сервера",
    en: "To increase the limit, boost the target server",
  },
  "emojis.limitTiers": {
    ru: "Уровень 1 → 100 | Уровень 2 → 150 | Уровень 3 → 250",
    en: "Level 1 → 100 | Level 2 → 150 | Level 3 → 250",
  },
  "emojis.limitError": {
    ru: "Лимит эмодзи сервера достигнут на {current}/{total} — скопировано {cloned}",
    en: "Server emoji limit reached at {current}/{total} — copied {cloned}",
  },
  "emojis.cloneError": { ru: 'Ошибка клонирования эмодзи "{name}": {message}', en: 'Failed to clone emoji "{name}": {message}' },
  "emojis.cloneErrorShort": { ru: "Ошибка клонирования эмодзи", en: "Failed to clone emoji" },

  "stickers.loading": { ru: "Загрузка стикеров...", en: "Loading stickers..." },
  "stickers.deletingExisting": {
    ru: "Удаление {count} существующих стикеров с целевого сервера",
    en: "Deleting {count} existing stickers from the target server",
  },
  "stickers.deleted": { ru: "Стикер удалён", en: "Sticker deleted" },
  "stickers.deleteError": { ru: "Ошибка удаления стикера: {name}", en: "Failed to delete sticker: {name}" },
  "stickers.cloning": { ru: "Клонирование {count} стикеров...", en: "Cloning {count} stickers..." },
  "stickers.created": { ru: "Стикер создан", en: "Sticker created" },
  "stickers.cloneError": {
    ru: 'Ошибка клонирования стикера "{name}": {message}',
    en: 'Failed to clone sticker "{name}": {message}',
  },
  "stickers.cloneErrorShort": { ru: "Ошибка клонирования стикера", en: "Failed to clone sticker" },

  "channels.deletingExisting": {
    ru: "Удаление {count} существующих каналов с целевого сервера",
    en: "Deleting {count} existing channels from the target server",
  },
  "channels.deleted": { ru: "Канал удалён", en: "Channel deleted" },
  "channels.deleteError": { ru: "Ошибка удаления канала: {name}", en: "Failed to delete channel: {name}" },
  "channels.creatingCategories": { ru: "Создание {count} категорий...", en: "Creating {count} categories..." },
  "channels.categoryCreated": { ru: "Категория создана", en: "Category created" },
  "channels.categoryCreateError": {
    ru: 'Ошибка создания категории "{name}": {message}',
    en: 'Failed to create category "{name}": {message}',
  },
  "channels.categoryCreateErrorShort": { ru: "Ошибка создания категории", en: "Failed to create category" },
  "channels.creatingChannels": { ru: "Создание {count} каналов...", en: "Creating {count} channels..." },
  "channels.created": { ru: "Канал создан", en: "Channel created" },
  "channels.normalizedNameWarning": {
    ru: "Создан с нормализованным названием",
    en: "Created with a normalized name",
  },
  "channels.strippedNameWarning": {
    ru: 'Создан без эмодзи/спецсимволов ("{name}")',
    en: 'Created without emojis/special characters ("{name}")',
  },
  "channels.resetParamsWarning": {
    ru: "Создан без тегов/реакций (параметры сброшены)",
    en: "Created without tags/reactions (options reset)",
  },
  "channels.fallbackTextWarning": {
    ru: "Создан как текстовый (нужно Сообщество)",
    en: "Created as a text channel (Community feature required)",
  },
  "channels.createError": {
    ru: 'Ошибка создания канала "{name}": {message}',
    en: 'Failed to create channel "{name}": {message}',
  },
  "channels.createErrorShort": { ru: "Ошибка создания канала", en: "Failed to create channel" },
  "channels.unnamed": { ru: "без-имени", en: "unnamed" },

  "unknown.error": { ru: "Неизвестная ошибка", en: "Unknown error" },

  "session.setMasterPasswordIntro": {
    ru: "Придумайте мастер-пароль для шифрования сохранённых данных.",
    en: "Create a master password to encrypt your saved data.",
  },
  "session.setMasterPasswordPrompt": {
    ru: "Мастер-пароль (мин. 8 символов)",
    en: "Master password (min. 8 characters)",
  },
  "session.confirmMasterPasswordPrompt": { ru: "Повторите мастер-пароль", en: "Confirm master password" },
  "session.masterPasswordMismatch": { ru: "Пароли не совпадают, попробуйте снова.", en: "Passwords don't match, try again." },
  "session.masterPasswordTooShort": {
    ru: "Пароль должен быть не короче 8 символов.",
    en: "Password must be at least 8 characters long.",
  },
  "session.unlockPrompt": {
    ru: "Мастер-пароль для расшифровки сохранённых данных",
    en: "Master password to decrypt saved data",
  },
  "session.unlockFailed": { ru: "Неверный пароль или повреждённые данные.", en: "Wrong password or corrupted data." },
  "session.unlockAttemptsLeft": { ru: "Осталось попыток: {count}", en: "Attempts left: {count}" },
  "session.unlockExhausted": {
    ru: "Превышено количество попыток. Сохранённые данные будут удалены.",
    en: "Too many failed attempts. The saved data will be deleted.",
  },
  "session.expired": {
    ru: "Сохранённая сессия истекла (более 30 дней). Требуется повторный вход.",
    en: "The saved session has expired (older than 30 days). Please log in again.",
  },
  "session.autoLoginSaved": { ru: "🔓 Вход из сохранённых данных", en: "🔓 Signed in from saved data" },
  "session.autoLoginNew": { ru: "🔑 Новый вход по токену", en: "🔑 New login with token" },
  "session.tokenInvalidSaved": {
    ru: "Сохранённый токен больше не действителен. Войдите заново.",
    en: "The saved token is no longer valid. Please log in again.",
  },
  "session.savePrompt": {
    ru: "Сохранить данные для входа (токен и язык) в зашифрованном виде?",
    en: "Save login data (token and language) in encrypted form?",
  },
  "session.saved": { ru: "Данные для входа сохранены (зашифровано)", en: "Login data saved (encrypted)" },
  "session.saveFailed": { ru: "Не удалось сохранить данные для входа", en: "Failed to save login data" },
  "session.resetFlagDone": { ru: "Сохранённые данные удалены (--reset).", en: "Saved data deleted (--reset)." },

  "menu.title": { ru: "ГЛАВНОЕ МЕНЮ", en: "MAIN MENU" },
  "menu.clone": { ru: "Начать клонирование сервера", en: "Start server cloning" },
  "menu.deleteData": { ru: "Удалить сохранённые данные", en: "Delete saved data" },
  "menu.switchAccount": { ru: "Сменить аккаунт", en: "Switch account" },
  "menu.history": { ru: "История клонирований", en: "Cloning history" },
  "menu.exit": { ru: "Выход", en: "Exit" },
  "menu.accountInfo": {
    ru: "Аккаунт {tag}   ·   сохранено {date}   ·   использований: {count}",
    en: "Account {tag}   ·   saved {date}   ·   uses: {count}",
  },

  "delete.warning": {
    ru: "Это удалит сохранённый токен и язык с этого устройства. При следующем запуске потребуется авторизация заново.",
    en: "This will delete the saved token and language from this device. The next launch will require logging in again.",
  },
  "delete.confirm": { ru: "Удалить сохранённые данные?", en: "Delete saved data?" },
  "delete.typeToConfirm": { ru: 'Для подтверждения введите "{word}"', en: 'To confirm, type "{word}"' },
  "delete.confirmWord": { ru: "УДАЛИТЬ", en: "DELETE" },
  "delete.wrongWord": { ru: "Введено неверное слово. Удаление отменено.", en: "Wrong word entered. Deletion cancelled." },
  "delete.backupOffer": {
    ru: "Сохранить зашифрованную резервную копию перед удалением?",
    en: "Save an encrypted backup before deleting?",
  },
  "delete.backupSaved": { ru: "Резервная копия сохранена: {path}", en: "Backup saved: {path}" },
  "delete.done": {
    ru: "Сохранённые данные удалены. При следующем запуске потребуется войти заново.",
    en: "Saved data deleted. The next launch will require logging in again.",
  },
  "delete.nothingToDelete": { ru: "Сохранённых данных не найдено.", en: "No saved data found." },

  "switch.confirm": { ru: "Выйти из текущего аккаунта и войти в другой?", en: "Log out of the current account and sign in with another?" },

  "history.title": { ru: "ИСТОРИЯ КЛОНИРОВАНИЙ", en: "CLONING HISTORY" },
  "history.empty": { ru: "История пуста — клонирований ещё не было.", en: "History is empty — no clones yet." },
  "history.entry": {
    ru: "{date}   {source} → {target}   ошибок: {errors}",
    en: "{date}   {source} → {target}   errors: {errors}",
  },
  "history.backToMenu": { ru: "Нажмите Enter, чтобы вернуться в меню", en: "Press Enter to return to the menu" },
};

export function t(key: keyof typeof dict, params?: Record<string, string | number>): string {
  const entry = dict[key];
  const template = entry[currentLocale];
  if (!params) return template;
  let result = template;
  for (const paramKey of Object.keys(params)) {
    result = result.split(`{${paramKey}}`).join(String(params[paramKey]));
  }
  return result;
}
