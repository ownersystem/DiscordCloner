import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const SESSION_DIR = path.join(process.cwd(), "data");
const SESSION_FILE = path.join(SESSION_DIR, "session.enc.json");

const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 1 << 15;
const SCRYPT_BLOCKSIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface EncryptedPayload {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

interface SessionFile {
  version: 1;
  locale: string;
  savedAt: string;
  lastUsedAt: string;
  usageCount: number;
  payload: EncryptedPayload;
}

export interface SessionData {
  token: string;
  locale: string;
  savedAt: string;
  lastUsedAt: string;
  usageCount: number;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCKSIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
}

function encryptToken(token: string, password: string): EncryptedPayload {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptToken(payload: EncryptedPayload, password: string): string {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function sessionExists(): boolean {
  return fs.existsSync(SESSION_FILE);
}

export function isSessionExpired(): boolean {
  if (!sessionExists()) return false;
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8");
    const parsed = JSON.parse(raw) as SessionFile;
    const savedAt = new Date(parsed.savedAt).getTime();
    return Date.now() - savedAt > SESSION_TTL_MS;
  } catch {
    return true;
  }
}

export function saveSession(token: string, locale: string, password: string): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const now = new Date().toISOString();
  const payload = encryptToken(token, password);

  const file: SessionFile = {
    version: 1,
    locale,
    savedAt: now,
    lastUsedAt: now,
    usageCount: 1,
    payload,
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(file, null, 2), { mode: 0o600 });
}

export function loadSession(password: string): SessionData {
  const raw = fs.readFileSync(SESSION_FILE, "utf8");
  const parsed = JSON.parse(raw) as SessionFile;
  const token = decryptToken(parsed.payload, password);

  const usageCount = (parsed.usageCount ?? 0) + 1;
  const lastUsedAt = new Date().toISOString();

  const updated: SessionFile = {
    ...parsed,
    lastUsedAt,
    usageCount,
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(updated, null, 2), { mode: 0o600 });

  return {
    token,
    locale: parsed.locale,
    savedAt: parsed.savedAt,
    lastUsedAt,
    usageCount,
  };
}

export function peekSessionMeta(): { locale: string; savedAt: string; usageCount: number } | null {
  if (!sessionExists()) return null;
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8");
    const parsed = JSON.parse(raw) as SessionFile;
    return { locale: parsed.locale, savedAt: parsed.savedAt, usageCount: parsed.usageCount ?? 0 };
  } catch {
    return null;
  }
}

export function deleteSession(): boolean {
  if (!sessionExists()) return false;
  fs.unlinkSync(SESSION_FILE);
  return true;
}

export function backupSession(): string | null {
  if (!sessionExists()) return null;
  const backupPath = path.join(
    SESSION_DIR,
    `session.backup.${Date.now()}.enc.json`
  );
  fs.copyFileSync(SESSION_FILE, backupPath);
  return backupPath;
}
