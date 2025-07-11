import sqlite3 from 'sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MigrationRunner } from './migrations.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class Database {
  constructor() {
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    // Enable verbose mode for debugging
    sqlite3.verbose()

    // Create database file in server directory
    const dbPath = join(__dirname, 'roysrock.db')

    this.db = new sqlite3.Database(dbPath, err => {
      if (err) {
        console.error('Error opening database:', err.message)
        throw err
      }
      console.log('Connected to SQLite database')
    })

    // Run migrations
    await this.runMigrations()
    this.isInitialized = true
    console.log('Database initialized successfully')
  }

  async runMigrations() {
    // First, check if this is a fresh database by looking for any tables
    const tables = await this.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)

    // If no tables exist, run the initial schema
    if (tables.length === 0) {
      console.log('Fresh database detected, running initial schema...')
      await this.runInitialSchema()
    }

    // Then run any pending migrations
    const migrationRunner = new MigrationRunner(this)
    await migrationRunner.runMigrations()
  }

  async runInitialSchema() {
    return new Promise((resolve, reject) => {
      // Read and execute the schema file
      const schemaPath = join(__dirname, './schema.sql')
      const schema = readFileSync(schemaPath, 'utf8')

      this.db.exec(schema, err => {
        if (err) {
          console.error('Error running initial schema:', err.message)
          reject(err)
        } else {
          console.log('Initial schema completed')
          resolve()
        }
      })
    })
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve({ lastID: this.lastID, changes: this.changes })
        }
      })
    })
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  close() {
    if (this.db) {
      this.db.close(err => {
        if (err) {
          console.error('Error closing database:', err.message)
        } else {
          console.log('Database connection closed')
        }
      })
    }
  }
}

export const database = new Database()
