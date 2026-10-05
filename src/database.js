const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

let db;

function initializeDatabase() {
  if (db) return db;

  const databasePath = path.join(
    app.getPath('userData'),
    'application-letter.sqlite',
  );

  db = new Database(databasePath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS applicant_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_name TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      birth_place TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      education TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  closeDatabase,
};
