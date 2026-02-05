#!/usr/bin/env node

/**
 * Database backup script
 * Run: node scripts/backup-db.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(BACKUP_DIR, `nocram-backup-${timestamp}.sql`);

console.log('💾 Starting database backup...');
console.log(`Backup location: ${backupFile}\n`);

const command = `pg_dump "${DATABASE_URL}" > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    if (stderr) console.error(stderr);
    process.exit(1);
  }

  // Check file size
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ Backup completed successfully!');
  console.log(`📁 File: ${backupFile}`);
  console.log(`📊 Size: ${fileSizeMB} MB`);

  // Clean up old backups (keep last 7 days)
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(f => f.startsWith('nocram-backup-') && f.endsWith('.sql'));
  
  if (backupFiles.length > 7) {
    backupFiles
      .sort()
      .slice(0, backupFiles.length - 7)
      .forEach(file => {
        const filePath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed old backup: ${file}`);
      });
  }

  console.log('\n💡 To restore from this backup:');
  console.log(`   psql "$DATABASE_URL" < "${backupFile}"`);
});
