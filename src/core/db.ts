import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "snapshots.sqlite");

function isPackagedExe(): boolean {
  return Boolean((process as unknown as { pkg?: unknown }).pkg);
}

function resolveWasmPath(): string {
  if (isPackagedExe()) {
    return path.join(__dirname, "sql-wasm.wasm");
  }
  return path.join(__dirname, "..", "..", "wasm", "sql-wasm.wasm");
}

let dbInstance: Database | null = null;

async function loadEngine(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const wasmPath = resolveWasmPath();
  const nodeBuffer = fs.readFileSync(wasmPath);
  const wasmBinary = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  ) as ArrayBuffer;
  const SQL = await initSqlJs({ wasmBinary });

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      source_guild_id TEXT NOT NULL,
      source_guild_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `);

  persist();
  return dbInstance;
}

function persist(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

export interface SnapshotRecord {
  id: number;
  label: string;
  sourceGuildId: string;
  sourceGuildName: string;
  kind: "clone" | "backup";
  createdAt: string;
}

export async function insertSnapshot(
  label: string,
  sourceGuildId: string,
  sourceGuildName: string,
  kind: "clone" | "backup",
  data: unknown
): Promise<number> {
  const db = await loadEngine();
  const createdAt = new Date().toISOString();
  const json = JSON.stringify(data);

  db.run(
    `INSERT INTO snapshots (label, source_guild_id, source_guild_name, kind, created_at, data) VALUES (?, ?, ?, ?, ?, ?);`,
    [label, sourceGuildId, sourceGuildName, kind, createdAt, json]
  );

  const result = db.exec("SELECT last_insert_rowid() AS id;");
  const id = result[0]?.values[0]?.[0] as number;

  persist();
  return id;
}

export async function listSnapshots(kind?: "clone" | "backup"): Promise<SnapshotRecord[]> {
  const db = await loadEngine();

  const query = kind
    ? `SELECT id, label, source_guild_id, source_guild_name, kind, created_at FROM snapshots WHERE kind = ? ORDER BY created_at DESC;`
    : `SELECT id, label, source_guild_id, source_guild_name, kind, created_at FROM snapshots ORDER BY created_at DESC;`;

  const stmt = db.prepare(query);
  if (kind) stmt.bind([kind]);

  const rows: SnapshotRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      id: row.id as number,
      label: row.label as string,
      sourceGuildId: row.source_guild_id as string,
      sourceGuildName: row.source_guild_name as string,
      kind: row.kind as "clone" | "backup",
      createdAt: row.created_at as string,
    });
  }
  stmt.free();

  return rows;
}

export async function getSnapshotData<T>(id: number): Promise<T | null> {
  const db = await loadEngine();
  const stmt = db.prepare(`SELECT data FROM snapshots WHERE id = ?;`);
  stmt.bind([id]);

  let data: T | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    data = JSON.parse(row.data as string) as T;
  }
  stmt.free();

  return data;
}

export async function deleteSnapshot(id: number): Promise<void> {
  const db = await loadEngine();
  db.run(`DELETE FROM snapshots WHERE id = ?;`, [id]);
  persist();
}

export function snapshotsDbExists(): boolean {
  return fs.existsSync(DB_FILE);
}
