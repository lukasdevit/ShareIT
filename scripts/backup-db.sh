#!/bin/bash
# Backup SQLite database — run via cron:
#   0 3 * * * /path/to/backup-db.sh

BACKUP_DIR="${1:-./backups}"
DB_FILE="${DB_PATH:-./database.db}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp "$DB_FILE" "$BACKUP_DIR/database-$TIMESTAMP.db"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/database-*.db 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null

echo "Backup: $BACKUP_DIR/database-$TIMESTAMP.db"
