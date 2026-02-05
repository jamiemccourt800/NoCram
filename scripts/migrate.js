#!/usr/bin/env node

/**
 * Database migration script for production
 * Run: node scripts/migrate.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    console.log('Usage: DATABASE_URL="postgresql://..." node scripts/migrate.js');
    process.exit(1);
  }

  console.log('🔄 Starting database migration...\n');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Running schema.sql...');
    await client.query(schema);
    console.log('✅ Schema applied successfully');

    // Check if tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Database tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
