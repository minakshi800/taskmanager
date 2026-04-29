const { Pool } = require('pg');

// If DATABASE_URL is not set, fallback to a local Postgres connection string (for local development)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/taskmanager';

const pool = new Pool({
  connectionString,
  // Required for Railway / Heroku postgres
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getDb() {
  const client = await pool.connect();
  
  try {
    // Initialize schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        avatar_color VARCHAR(50) DEFAULT '#7c3aed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes (Postgres syntax)
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)');

    console.log('PostgreSQL database connected and schema initialized.');
  } finally {
    client.release();
  }
}

// Helper: run a query that returns all rows
async function queryAll(sql, params = []) {
  // Convert sqlite parameter format ? to postgres format $1, $2, etc.
  let pgSql = sql;
  let counter = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${counter++}`);
  
  const res = await pool.query(pgSql, params);
  return res.rows;
}

// Helper: run a query that returns one row
async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run an INSERT/UPDATE/DELETE and return { changes, lastInsertRowid }
// Note: Postgres INSERT needs 'RETURNING id' to get the last inserted ID.
async function runSql(sql, params = [], returnId = false) {
  let pgSql = sql;
  let counter = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${counter++}`);

  if (returnId) {
    if (!pgSql.includes('RETURNING id')) {
      pgSql += ' RETURNING id';
    }
  }

  const res = await pool.query(pgSql, params);
  
  let lastInsertRowid = 0;
  if (returnId && res.rows.length > 0 && res.rows[0].id) {
    lastInsertRowid = res.rows[0].id;
  }

  return { changes: res.rowCount, lastInsertRowid };
}

// Helper: run multiple statements in a transaction
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client); // Notice: we pass client to fn so it can use the same connection
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getDb, queryAll, queryOne, runSql, transaction, pool };
