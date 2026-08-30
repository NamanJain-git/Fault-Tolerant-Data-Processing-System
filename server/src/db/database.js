const Database = require("better-sqlite3");

const db = new Database("events.db");

console.log("Database connected");

db.exec(`
    CREATE TABLE IF NOT EXISTS raw_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        raw_payload TEXT NOT NULL,
        received_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        amount REAL NOT NULL,
        timestamp TEXT NOT NULL,
        dedupe_key TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
`);

module.exports = db;