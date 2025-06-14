import sqlite3 from 'sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MigrationRunner } from '../../server/db/migrations.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class TestDatabase {
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    // Enable verbose mode for debugging
    sqlite3.verbose()

    this.db = new sqlite3.Database(this.dbPath, err => {
      if (err) {
        console.error('Error opening test database:', err.message)
        throw err
      }
    })

    // Enable foreign key constraints
    await this.run('PRAGMA foreign_keys = ON')

    // Run initial schema
    await this.runInitialSchema()

    // Run migrations
    const migrationRunner = new MigrationRunner(this)
    await migrationRunner.runMigrations()

    this.isInitialized = true
  }

  async runInitialSchema() {
    return new Promise((resolve, reject) => {
      const schemaPath = join(__dirname, '../../server/db/schema.sql')
      const schema = readFileSync(schemaPath, 'utf8')

      this.db.exec(schema, err => {
        if (err) {
          console.error('Error running initial schema:', err.message)
          reject(err)
        } else {
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

  async seedTestData() {
    // Create test category
    const categoryResult = await this.run(
      'INSERT INTO categories (name, description, color, sort_order) VALUES (?, ?, ?, ?)',
      ['Test Category', 'Test category for testing', '#FF0000', 1]
    )

    // Create test sound pack
    const packResult = await this.run(
      `
      INSERT INTO sound_packs (name, description, category_id, author, is_default)
      VALUES (?, ?, ?, ?, ?)
    `,
      ['Test Sound Pack', 'Test sound pack for testing', categoryResult.lastID, 'Test Author', 1]
    )

    // Create test sounds
    const sounds = [
      { name: 'Test Kick', drum_type: 'kick', color: '#FF0000' },
      { name: 'Test Snare', drum_type: 'snare', color: '#00FF00' },
      { name: 'Test Hi-Hat', drum_type: 'hihat_closed', color: '#0000FF' },
    ]

    const soundIds = []
    for (const sound of sounds) {
      const soundResult = await this.run(
        `
        INSERT INTO sounds (name, type, synthesis_params, synthesis_engine, drum_type, energy_level, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          sound.name,
          'synthesis',
          '{"synthType":"TestSynth"}',
          'tone.js',
          sound.drum_type,
          3,
          sound.color,
        ]
      )

      soundIds.push(soundResult.lastID)

      // Create relationship in join table
      await this.run(
        `
        INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
        VALUES (?, ?)
      `,
        [packResult.lastID, soundResult.lastID]
      )
    }

    return {
      categoryId: categoryResult.lastID,
      soundPackId: packResult.lastID,
      soundIds,
    }
  }

  async clear() {
    if (!this.db) return

    // Disable foreign key constraints temporarily for cleanup
    await this.run('PRAGMA foreign_keys = OFF')

    const tables = [
      'sound_packs_sounds',
      'sounds',
      'sound_packs',
      'categories',
      'sound_tags',
      'tags',
      'migrations',
    ]

    for (const table of tables) {
      try {
        await this.run(`DELETE FROM ${table}`)
      } catch (error) {
        // Ignore errors for tables that might not exist
      }
    }

    // Re-enable foreign key constraints
    await this.run('PRAGMA foreign_keys = ON')
  }

  close() {
    if (this.db) {
      this.db.close(err => {
        if (err) {
          console.error('Error closing test database:', err.message)
        }
      })
    }
  }
}

export async function createTestDatabase() {
  const testDb = new TestDatabase()
  await testDb.initialize()
  return testDb
}
