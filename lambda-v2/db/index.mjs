import pg from 'pg';

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

async function getConnection(credentials) {
  const { host, port, user, password, database, ssl } = credentials;
  const client = new pg.Client({
    host,
    port: port || 5432,
    user,
    password,
    database,
    ssl: ssl !== false ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 25000,
  });
  await client.connect();
  return client;
}

async function readSchema(credentials) {
  const client = await getConnection(credentials);
  try {
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const schema = {};
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Get columns
      const colsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);

      // Get sample rows
      const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 5`);

      schema[tableName] = {
        columns: colsResult.rows.map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
        })),
        rowCount: parseInt(countResult.rows[0].count),
        sample: sampleResult.rows,
      };
    }

    return schema;
  } finally {
    await client.end();
  }
}

async function executeQuery(credentials, sql) {
  validateQuery(sql);
  const client = await getConnection(credentials);
  try {
    const result = await client.query(sql);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
    };
  } finally {
    await client.end();
  }
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