function initializeSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            email             TEXT UNIQUE NOT NULL,
            password_hash     TEXT NOT NULL,
            name              TEXT NOT NULL,
            role              TEXT NOT NULL DEFAULT 'student',
            department        TEXT,
            section           TEXT,
            roll_number       INTEGER,
            batch             TEXT,
            current_semester  INTEGER DEFAULT 1,
            mentor_id         INTEGER REFERENCES users(id),
            refresh_token     TEXT,
            is_active         INTEGER DEFAULT 1,
            last_login        TEXT,
            created_at        TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS diary_entries (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id              INTEGER NOT NULL REFERENCES users(id),
            week_number             INTEGER NOT NULL,
            academic_year           TEXT NOT NULL,
            semester                INTEGER NOT NULL,
            start_date              TEXT,
            end_date                TEXT,
            mood                    INTEGER NOT NULL,
            weekly_difficulty       INTEGER,
            attendance_pct          REAL,
            attendance_explanation  TEXT,
            reflection              TEXT NOT NULL,
            challenges              TEXT,
            attachment_url          TEXT,
            ai_risk_score           INTEGER DEFAULT 0,
            ai_sentiment            TEXT DEFAULT 'neutral',
            ai_flags                TEXT DEFAULT '[]',
            ai_summary              TEXT,
            ai_risk_level           TEXT DEFAULT 'low',
            ai_key_concerns         TEXT DEFAULT '[]',
            ai_confidence           REAL DEFAULT 0.56,
            is_flagged              INTEGER DEFAULT 0,
            mentor_response         TEXT,
            mentor_responded_at     TEXT,
            status                  TEXT DEFAULT 'submitted',
            created_at              TEXT DEFAULT (datetime('now')),
            updated_at              TEXT DEFAULT (datetime('now')),
            UNIQUE(student_id, week_number, academic_year, semester)
        );

        CREATE TABLE IF NOT EXISTS diary_subject_ratings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id     INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
            subject_name TEXT NOT NULL,
            rating       INTEGER NOT NULL,
            note         TEXT
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            department      TEXT NOT NULL,
            section         TEXT NOT NULL,
            roll_number     INTEGER NOT NULL,
            week_number     INTEGER NOT NULL,
            academic_year   TEXT NOT NULL,
            semester        INTEGER NOT NULL,
            cumulative_pct  REAL NOT NULL,
            weekly_pct      REAL NOT NULL,
            UNIQUE(department, section, roll_number, week_number, academic_year, semester)
        );

        CREATE TABLE IF NOT EXISTS marks_entries (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id       INTEGER NOT NULL REFERENCES users(id),
            semester         INTEGER NOT NULL,
            academic_year    TEXT NOT NULL,
            cgpa             REAL,
            submission_count INTEGER DEFAULT 1,
            created_at       TEXT DEFAULT (datetime('now')),
            updated_at       TEXT DEFAULT (datetime('now')),
            UNIQUE(student_id, semester, academic_year)
        );

        CREATE TABLE IF NOT EXISTS marks_subjects (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            marks_entry_id INTEGER NOT NULL REFERENCES marks_entries(id) ON DELETE CASCADE,
            subject_name   TEXT NOT NULL,
            grade          TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id    INTEGER NOT NULL REFERENCES users(id),
            semester      INTEGER NOT NULL,
            academic_year TEXT NOT NULL,
            type          TEXT NOT NULL,
            title         TEXT NOT NULL,
            description   TEXT,
            date          TEXT,
            proof_url     TEXT,
            created_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS mentoring_sessions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            mentor_id      INTEGER NOT NULL REFERENCES users(id),
            student_id     INTEGER NOT NULL REFERENCES users(id),
            scheduled_at   TEXT NOT NULL,
            duration_mins  INTEGER,
            location       TEXT,
            notes          TEXT,
            action_items   TEXT DEFAULT '[]',
            status         TEXT DEFAULT 'scheduled',
            created_at     TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id),
            type       TEXT NOT NULL,
            message    TEXT NOT NULL,
            is_read    INTEGER DEFAULT 0,
            related_id INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS weekly_insights (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id    INTEGER NOT NULL REFERENCES users(id),
            week_number   INTEGER NOT NULL,
            academic_year TEXT NOT NULL,
            semester      INTEGER NOT NULL,
            positive      TEXT,
            warning       TEXT,
            suggestion    TEXT,
            created_at    TEXT DEFAULT (datetime('now')),
            UNIQUE(student_id, week_number, academic_year, semester)
        );
    `);
}

module.exports = { initializeSchema };
