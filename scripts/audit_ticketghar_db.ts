import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function auditTicketGhar() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NONE');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('--- CONNECTED TO TICKETGHAR DATABASE ---');

  // 1. List all tables in public schema
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`\n=== TOTAL TABLES IN PUBLIC SCHEMA: ${tablesRes.rows.length} ===`);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  console.log(tableNames.join('\n'));

  // 2. Details for each table
  for (const tableName of tableNames) {
    console.log(`\n----------------------------------------`);
    console.log(`TABLE: ${tableName}`);
    console.log(`----------------------------------------`);

    // Columns
    const colsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    console.log('Columns:');
    colsRes.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    });

    // Constraints
    const constRes = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1;
    `, [tableName]);

    if (constRes.rows.length > 0) {
      console.log('Constraints / Keys:');
      constRes.rows.forEach(c => {
        if (c.constraint_type === 'FOREIGN KEY') {
          console.log(`  - FK [${c.constraint_name}]: ${c.column_name} -> ${c.foreign_table_name}(${c.foreign_column_name})`);
        } else if (c.constraint_type === 'PRIMARY KEY') {
          console.log(`  - PK [${c.constraint_name}]: ${c.column_name}`);
        } else {
          console.log(`  - ${c.constraint_type} [${c.constraint_name}]: ${c.column_name}`);
        }
      });
    }

    // Row Count
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${tableName}";`);
      console.log(`Row count: ${countRes.rows[0].count}`);
    } catch (e: any) {
      console.log(`Row count error: ${e.message}`);
    }
  }

  // 3. Triggers & Functions
  console.log('\n========================================');
  console.log('FUNCTIONS & TRIGGERS IN PUBLIC SCHEMA');
  console.log('========================================');

  const triggersRes = await client.query(`
    SELECT event_object_table, trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);

  if (triggersRes.rows.length === 0) {
    console.log('No user-defined triggers found in public schema.');
  } else {
    triggersRes.rows.forEach(t => {
      console.log(`Trigger [${t.trigger_name}] on ${t.event_object_table} (${t.event_manipulation}): ${t.action_statement}`);
    });
  }

  const funcRes = await client.query(`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);

  console.log('Routines/Functions in public schema:');
  funcRes.rows.forEach(f => {
    console.log(`  - ${f.routine_name} (${f.routine_type})`);
  });

  // 4. Migration & History tables across all schemas
  console.log('\n========================================');
  console.log('ALL SCHEMAS AND MIGRATION/SYSTEM TABLES');
  console.log('========================================');
  const schemasRes = await client.query(`
    SELECT schema_name FROM information_schema.schemata;
  `);
  console.log('Schemas:', schemasRes.rows.map(s => s.schema_name).join(', '));

  const migRes = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name LIKE '%migration%' OR table_name LIKE '%schema%' OR table_name LIKE '%drizzle%' OR table_name LIKE '%history%' OR table_name LIKE '%log%'
    ORDER BY table_schema, table_name;
  `);
  migRes.rows.forEach(m => console.log(`  - ${m.table_schema}.${m.table_name}`));

  // 5. RLS Policies
  console.log('\n========================================');
  console.log('RLS POLICIES IN PUBLIC SCHEMA');
  console.log('========================================');
  const polRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public';
  `);
  if (polRes.rows.length === 0) {
    console.log('No RLS policies found in public schema.');
  } else {
    polRes.rows.forEach(p => {
      console.log(`Policy [${p.policyname}] on table [${p.tablename}] (${p.cmd}): ${p.qual}`);
    });
  }

  await client.end();
}

auditTicketGhar().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
