CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'hold',
  token TEXT NOT NULL UNIQUE,
  ip TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE (date, time)
);
