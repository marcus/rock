import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class MigrationRunner {
  constructor(database) {
    this.db = database
    this.migrationsDir = join(__dirname, 'migrations')
  }

  async initialize() {
    // Create migrations table if it doesn't exist
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async getExecutedMigrations() {
    const rows = await this.db.query('SELECT filename FROM migrations ORDER BY id')
    return rows.map(row => row.filename)
  }

  async getMigrationFiles() {
    try {
      const files = readdirSync(this.migrationsDir)
      return files
        .filter(file => file.endsWith('.sql'))
        .sort() // Ensure migrations run in order
    } catch (error) {
      // If migrations directory doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  async runMigrations() {
    await this.initialize()
    
    const executedMigrations = await this.getExecutedMigrations()
    const migrationFiles = await this.getMigrationFiles()
    
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    )

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`)

    for (const migrationFile of pendingMigrations) {
      await this.runMigration(migrationFile)
    }

    console.log('All migrations completed successfully')
  }

  async runMigration(filename) {
    console.log(`Running migration: ${filename}`)
    
    try {
      const migrationPath = join(this.migrationsDir, filename)
      const migrationSql = readFileSync(migrationPath, 'utf8')
      
      // Execute the migration using exec for better multi-statement support
      await new Promise((resolve, reject) => {
        this.db.db.exec('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err)
          
          this.db.db.exec(migrationSql, (err) => {
            if (err) {
              this.db.db.exec('ROLLBACK', () => {})
              return reject(err)
            }
            resolve()
          })
        })
      })
      
      // Record that this migration was executed and commit
      await new Promise((resolve, reject) => {
        this.db.db.run(
          'INSERT INTO migrations (filename) VALUES (?)',
          [filename],
          (err) => {
            if (err) return reject(err)
            
            this.db.db.exec('COMMIT', (err) => {
              if (err) return reject(err)
              resolve()
            })
          }
        )
      })
      
      console.log(`✓ Migration ${filename} completed successfully`)
      
    } catch (error) {
      console.error(`✗ Migration ${filename} failed:`, error.message)
      throw error
    }
  }
} 