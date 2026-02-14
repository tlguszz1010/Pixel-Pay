import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../storage/seller.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      image_url TEXT NOT NULL,
      local_path TEXT,
      price TEXT DEFAULT '0.01',
      sold INTEGER DEFAULT 0,
      sold_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nfts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL,
      image_id TEXT NOT NULL,
      owner TEXT NOT NULL,
      tx_hash TEXT,
      metadata_uri TEXT,
      minted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (image_id) REFERENCES images(id)
    );

    CREATE TABLE IF NOT EXISTS token_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_address TEXT NOT NULL,
      image_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'success',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
