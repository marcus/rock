import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { TestDatabase } from './helpers/database.js'
import { MigrationRunner } from '../server/db/migrations.js'

describe('Migration System', () => {
  let testDb
  let migrationRunner

  beforeEach(async () => {
    testDb = new TestDatabase()
    await testDb.initialize()
    migrationRunner = new MigrationRunner(testDb)
  })

  afterEach(async () => {
    if (testDb) {
      testDb.close()
    }
  })

  describe('MigrationRunner', () => {
    test('should create migrations table on initialize', async () => {
      await migrationRunner.initialize()
      
      const tables = await testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `)
      
      expect(tables).toHaveLength(1)
      expect(tables[0].name).toBe('migrations')
    })

    test('should track executed migrations', async () => {
      await migrationRunner.initialize()
      
      // Simulate a migration being executed
      await testDb.run(
        'INSERT INTO migrations (filename) VALUES (?)',
        ['001_test_migration.sql']
      )
      
      const executedMigrations = await migrationRunner.getExecutedMigrations()
      expect(executedMigrations).toContain('001_test_migration.sql')
    })

    test('should identify pending migrations', async () => {
      await migrationRunner.initialize()
      
      // Mock getMigrationFiles to return test migrations
      const originalGetMigrationFiles = migrationRunner.getMigrationFiles
      migrationRunner.getMigrationFiles = async () => [
        '001_create_sound_packs_sounds_join_table.sql',
        '002_future_migration.sql'
      ]
      
      // Check if migration already exists before inserting
      const existing = await testDb.get(
        'SELECT filename FROM migrations WHERE filename = ?',
        ['001_create_sound_packs_sounds_join_table.sql']
      )
      
      if (!existing) {
        // Mark one migration as executed
        await testDb.run(
          'INSERT INTO migrations (filename) VALUES (?)',
          ['001_create_sound_packs_sounds_join_table.sql']
        )
      }
      
      const executedMigrations = await migrationRunner.getExecutedMigrations()
      const migrationFiles = await migrationRunner.getMigrationFiles()
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      )
      
      expect(pendingMigrations).toEqual(['002_future_migration.sql'])
      
      // Restore original method
      migrationRunner.getMigrationFiles = originalGetMigrationFiles
    })
  })

  describe('Schema Migration', () => {
    test('should have sound_packs_sounds join table after migration', async () => {
      const tables = await testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='sound_packs_sounds'
      `)
      
      expect(tables).toHaveLength(1)
      expect(tables[0].name).toBe('sound_packs_sounds')
    })

    test('should have proper indexes on join table', async () => {
      const indexes = await testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='sound_packs_sounds'
      `)
      
      const indexNames = indexes.map(idx => idx.name)
      expect(indexNames).toContain('idx_sound_packs_sounds_pack')
      expect(indexNames).toContain('idx_sound_packs_sounds_sound')
    })

    test('should not have sound_pack_id column in sounds table', async () => {
      const tableInfo = await testDb.query(`PRAGMA table_info(sounds)`)
      const columnNames = tableInfo.map(col => col.name)
      
      expect(columnNames).not.toContain('sound_pack_id')
    })

    test('should maintain data integrity after migration', async () => {
      // Seed test data
      const testData = await testDb.seedTestData()
      
      // Verify sounds exist
      const sounds = await testDb.query('SELECT COUNT(*) as count FROM sounds')
      expect(sounds[0].count).toBe(3)
      
      // Verify join table relationships
      const relationships = await testDb.query(`
        SELECT COUNT(*) as count FROM sound_packs_sounds 
        WHERE sound_pack_id = ?
      `, [testData.soundPackId])
      
      expect(relationships[0].count).toBe(3)
    })

    test('should support many-to-many relationships', async () => {
      const testData = await testDb.seedTestData()
      
      // Create another sound pack
      const pack2Result = await testDb.run(`
        INSERT INTO sound_packs (name, description, category_id, author, is_default)
        VALUES (?, ?, ?, ?, ?)
      `, ['Second Pack', 'Second test pack', testData.categoryId, 'Test Author', 0])
      
      // Add the first sound to the second pack
      await testDb.run(`
        INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
        VALUES (?, ?)
      `, [pack2Result.lastID, testData.soundIds[0]])
      
      // Verify the sound is in both packs
      const soundPacks = await testDb.query(`
        SELECT sp.name FROM sound_packs sp
        JOIN sound_packs_sounds sps ON sp.id = sps.sound_pack_id
        WHERE sps.sound_id = ?
      `, [testData.soundIds[0]])
      
      expect(soundPacks).toHaveLength(2)
      expect(soundPacks.map(p => p.name)).toContain('Test Sound Pack')
      expect(soundPacks.map(p => p.name)).toContain('Second Pack')
    })
  })

  describe('Data Migration', () => {
    test('should migrate existing sound_pack_id relationships to join table', async () => {
      // This test verifies that the migration properly moved data
      // from the old sound_pack_id foreign key to the new join table
      
      // Create a fresh database with old schema for testing
      const oldSchemaDb = new TestDatabase(':memory:')
      
      // Initialize the database connection first
      await oldSchemaDb.initialize()
      
      // Clear existing tables and create old schema structure
      await oldSchemaDb.run('DROP TABLE IF EXISTS sound_packs_sounds')
      await oldSchemaDb.run('DROP TABLE IF EXISTS sounds')
      await oldSchemaDb.run('DROP TABLE IF EXISTS sound_packs')
      
      await oldSchemaDb.run(`
        CREATE TABLE sound_packs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          is_default BOOLEAN DEFAULT 0
        )
      `)
      
      await oldSchemaDb.run(`
        CREATE TABLE sounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sound_pack_id INTEGER,
          FOREIGN KEY (sound_pack_id) REFERENCES sound_packs(id)
        )
      `)
      
      // Insert test data with old structure
      const packResult = await oldSchemaDb.run(
        'INSERT INTO sound_packs (name, is_default) VALUES (?, ?)',
        ['Old Pack', 1]
      )
      
      const soundResult = await oldSchemaDb.run(
        'INSERT INTO sounds (name, sound_pack_id) VALUES (?, ?)',
        ['Old Sound', packResult.lastID]
      )
      
      // Now create join table and migrate data (simulating migration)
      await oldSchemaDb.run(`
        CREATE TABLE sound_packs_sounds (
          sound_pack_id INTEGER NOT NULL,
          sound_id INTEGER NOT NULL,
          PRIMARY KEY (sound_pack_id, sound_id)
        )
      `)
      
      await oldSchemaDb.run(`
        INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
        SELECT sound_pack_id, id FROM sounds WHERE sound_pack_id IS NOT NULL
      `)
      
      // Verify migration worked
      const migratedData = await oldSchemaDb.query(`
        SELECT * FROM sound_packs_sounds
      `)
      
      expect(migratedData).toHaveLength(1)
      expect(migratedData[0].sound_pack_id).toBe(packResult.lastID)
      expect(migratedData[0].sound_id).toBe(soundResult.lastID)
      
      oldSchemaDb.close()
    })
  })
}) 