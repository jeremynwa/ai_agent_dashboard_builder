import pg from 'pg';
import mysql from 'mysql2/promise';

const HEADERS = {
  'Content-Type': 'application/json',
};

const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });

function validateQuery(sql) {
  const trimmed = sql.trim().toUpperCase();
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const keyword of forbidden) {
    if (trimmed.startsWith(keyword)) {
      throw new Error(`Operation "${keyword}" non autorisee. Seules les requetes SELECT sont permises.`);
    }
  }
}

// ============ POSTGRESQL ============

async function pgConnect(credentials) {
  const client = new pg.Client({
    host: credentials.host,
    port: credentials.port || 5432,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    ssl: credentials.ssl !== false ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 25000,
  });
  await client.connect();
  return client;
}

async function pgReadSchema(credentials) {
  const client = await pgConnect(credentials);
  try {
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const schema = {};
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const colsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 5`);

      schema[tableName] = {
        columns: colsResult.rows.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES' })),
        rowCount: parseInt(countResult.rows[0].count),
        sample: sampleResult.rows,
      };
    }
    return schema;
  } finally {
    await client.end();
  }
}

async function pgQuery(credentials, sql) {
  validateQuery(sql);
  const client = await pgConnect(credentials);
  try {
    const result = await client.query(sql);
    return { rows: result.rows, rowCount: result.rowCount, fields: result.fields.map(f => ({ name: f.name })) };
  } finally {
    await client.end();
  }
}

// ============ MYSQL ============

async function mysqlConnect(credentials) {
  return mysql.createConnection({
    host: credentials.host,
    port: credentials.port || 3306,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    ssl: credentials.ssl !== false ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
  });
}

async function mysqlReadSchema(credentials) {
  const conn = await mysqlConnect(credentials);
  try {
    const [tables] = await conn.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [credentials.database]);

    const schema = {};
    for (const row of tables) {
      const tableName = row.TABLE_NAME || row.table_name;
      const [cols] = await conn.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `, [credentials.database, tableName]);

      const [countRows] = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const [sampleRows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);

      schema[tableName] = {
        columns: cols.map(c => ({
          name: c.COLUMN_NAME || c.column_name,
          type: c.DATA_TYPE || c.data_type,
          nullable: (c.IS_NULLABLE || c.is_nullable) === 'YES',
        })),
        rowCount: parseInt(countRows[0].count),
        sample: sampleRows,
      };
    }
    return schema;
  } finally {
    await conn.end();
  }
}

async function mysqlQuery(credentials, sql) {
  validateQuery(sql);
  const conn = await mysqlConnect(credentials);
  try {
    const [rows, fields] = await conn.query(sql);
    return { rows, rowCount: rows.length, fields: fields.map(f => ({ name: f.name })) };
  } finally {
    await conn.end();
  }
}

// ============ ROUTER ============

async function readSchema(credentials) {
  if (credentials.type === 'mysql') return mysqlReadSchema(credentials);
  return pgReadSchema(credentials);
}

async function executeQuery(credentials, sql) {
  if (credentials.type === 'mysql') return mysqlQuery(credentials, sql);
  return pgQuery(credentials, sql);
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  try {
    const body = JSON.parse(event.body || '{}');
    const path = event.requestContext?.http?.path || event.rawPath || '';

    if (path.endsWith('/db/schema')) {
      const { credentials } = body;
      if (!credentials?.host || !credentials?.database) {
        return reply(400, { error: 'Credentials requises (host, database, user, password)' });
      }
      const schema = await readSchema(credentials);
      return reply(200, { schema });
    }

    if (path.endsWith('/db/query')) {
      const { credentials, sql } = body;
      if (!credentials || !sql) {
        return reply(400, { error: 'Credentials et SQL requis' });
      }
      const result = await executeQuery(credentials, sql);
      return reply(200, result);
    }

    return reply(404, { error: 'Route non trouvee' });
  } catch (error) {
    console.error('DB error:', error);
    return reply(500, { error: error.message });
  }
};