// Real SQLite running in the browser (sql.js / WASM), persisted to localStorage.
// We keep the whole database as a base64 blob under one key and re-save on every
// committed write. This is the "use an existing library instead of a custom
// solution" approach: SQL schema + queries, not hand-rolled object storage.
import initSqlJs from 'sql.js';

// The .wasm is served as a plain asset from /public so the emscripten loader
// fetches it with the correct application/wasm MIME type (the Vite `?url`
// transform serves it behind a query string that the loader can't instantiate).
const wasmUrl = `${import.meta.env.BASE_URL}sql-wasm.wasm`;

const STORAGE_KEY = 'sport_session_db_v1';
let db = null;

/* ---------- base64 <-> bytes (chunked to avoid call-stack overflow) ---------- */
function bytesToB64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, bytesToB64(db.export()));
}

/* ---------- schema ---------- */
function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS tubes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      brand        TEXT NOT NULL,
      bought_date  TEXT,
      price        REAL NOT NULL,            -- price paid per tube
      pcs_per_tube INTEGER NOT NULL DEFAULT 12,
      remaining    INTEGER NOT NULL DEFAULT 12,
      created_at   TEXT
    );
    CREATE TABLE IF NOT EXISTS friends (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT NOT NULL,          -- ISO yyyy-mm-dd
      time           TEXT,                   -- HH:MM
      location       TEXT,
      court_rental   REAL NOT NULL DEFAULT 0,
      other_expenses REAL NOT NULL DEFAULT 0,
      duration_hr    REAL NOT NULL DEFAULT 0,
      num_people     INTEGER NOT NULL DEFAULT 1,
      shuttle_cost   REAL NOT NULL DEFAULT 0,
      total_cost     REAL NOT NULL DEFAULT 0,
      created_at     TEXT
    );
    CREATE TABLE IF NOT EXISTS session_shuttles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      tube_id    INTEGER,
      brand      TEXT,
      pcs_used   INTEGER NOT NULL,
      cost       REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session_people (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      name       TEXT,
      is_payer   INTEGER NOT NULL DEFAULT 0,
      amount     REAL NOT NULL DEFAULT 0,
      paid       INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/* ---------- query helpers ---------- */
export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
export function one(sql, params = []) {
  return all(sql, params)[0] || null;
}
/** run + persist (single statement) */
export function run(sql, params = []) {
  db.run(sql, params);
  persist();
}
/** run without persisting — for use inside tx() */
function exec(sql, params = []) {
  db.run(sql, params);
}
export function lastId() {
  return one('SELECT last_insert_rowid() AS id').id;
}
/** Wrap multiple writes in a transaction; persist once on commit. */
export function tx(fn) {
  db.run('BEGIN');
  try {
    const result = fn({ exec, lastId });
    db.run('COMMIT');
    persist();
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

/* ---------- settings ---------- */
export function getSetting(key, fallback = null) {
  const r = one('SELECT value FROM settings WHERE key = ?', [key]);
  return r ? r.value : fallback;
}
export function setSetting(key, value) {
  run(
    `INSERT INTO settings(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  );
}

/* ---------- seed (only on a brand-new database) ---------- */
function seed() {
  const now = new Date().toISOString();
  exec(`INSERT INTO settings(key,value) VALUES ('currency','MYR'),('player_name','You'),('default_pcs_per_tube','12')`);

  exec(
    `INSERT INTO tubes(brand,bought_date,price,pcs_per_tube,remaining,created_at) VALUES
       ('Yonex Aerosensa 50','2024-05-12',110,12,7,?),
       ('Yonex Aerosensa 50','2024-05-18',125,12,12,?),
       ('Li-Ning A+300','2024-05-10',95,12,8,?)`,
    [now, now, now]
  );

  exec(`INSERT INTO friends(name,created_at) VALUES ('Friend 1',?),('Friend 2',?),('Friend 3',?)`, [now, now, now]);

  // A few past sessions so History/Stats are populated on first run.
  const seedSessions = [
    { date: '2024-05-18', time: '19:00', location: 'JB Badminton Center - Court 5', court: 120, other: 0, dur: 2.0, people: 4, brand: 'Yonex Aerosensa 50', pcs: 12, scost: 110 },
    { date: '2024-05-15', time: '20:30', location: 'Power Badminton Arena - Court 2', court: 70, other: 0, dur: 1.5, people: 3, brand: 'Li-Ning No.7', pcs: 12, scost: 110 },
    { date: '2024-05-11', time: '18:00', location: 'Champion Sports - Court 3', court: 110, other: 0, dur: 2.0, people: 4, brand: 'Victor Champion No.1', pcs: 12, scost: 110 },
    { date: '2024-05-08', time: '21:00', location: 'Elite Badminton - Court 1', court: 55, other: 0, dur: 1.0, people: 2, brand: 'Yonex Aerosensa 30', pcs: 6, scost: 55 },
    { date: '2024-04-28', time: '17:00', location: 'JB Badminton Center - Court 6', court: 100, other: 10, dur: 2.0, people: 4, brand: 'RSL No.4', pcs: 12, scost: 100 },
  ];
  for (const s of seedSessions) {
    const total = s.court + s.other + s.scost;
    exec(
      `INSERT INTO sessions(date,time,location,court_rental,other_expenses,duration_hr,num_people,shuttle_cost,total_cost,created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [s.date, s.time, s.location, s.court, s.other, s.dur, s.people, s.scost, total, now]
    );
    const sid = one('SELECT last_insert_rowid() AS id').id;
    exec(`INSERT INTO session_shuttles(session_id,tube_id,brand,pcs_used,cost) VALUES(?,?,?,?,?)`, [sid, null, s.brand, s.pcs, s.scost]);
    const share = total / s.people;
    exec(`INSERT INTO session_people(session_id,name,is_payer,amount,paid) VALUES(?, 'You', 1, ?, 1)`, [sid, share]);
    for (let i = 2; i <= s.people; i++) {
      exec(`INSERT INTO session_people(session_id,name,is_payer,amount,paid) VALUES(?,?,0,?,0)`, [sid, 'Friend ' + (i - 1), share]);
    }
  }
}

/* ---------- init ---------- */
export async function initDb() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    db = new SQL.Database(b64ToBytes(saved));
    migrate(); // ensure new tables exist for older saves
  } else {
    db = new SQL.Database();
    migrate();
    seed();
    persist();
  }
  return db;
}

/** Wipe everything and reseed (used by Settings → reset). */
export function resetDb() {
  localStorage.removeItem(STORAGE_KEY);
  db.run('DROP TABLE IF EXISTS settings; DROP TABLE IF EXISTS tubes; DROP TABLE IF EXISTS friends; DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS session_shuttles; DROP TABLE IF EXISTS session_people;');
  migrate();
  seed();
  persist();
}

export function exportBytes() {
  return db.export();
}
