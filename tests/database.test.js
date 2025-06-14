import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { TestDatabase } from './helpers/database.js'

describe('Database Class', () => {
  let testDb

  beforeEach(async () => {
    testDb = new TestDatabase()
    await testDb.initialize()
  })

  afterEach(async () => {
    if (testDb) {
      testDb.close()
    }
  })

  describe('Initialization', () => {
    test('should initialize database with proper schema', async () => {
      const tables = await testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)
      
      const tableNames = tables.map(t => t.name)
      expect(tableNames).toContain('categories')
      expect(tableNames).toContain('sound_packs')
      expect(tableNames).toContain('sounds')
      expect(tableNames).toContain('sound_packs_sounds')
      expect(tableNames).toContain('tags')
      expect(tableNames).toContain('sound_tags')
      expect(tableNames).toContain('migrations')
    })

    test('should create proper indexes', async () => {
      const indexes = await testDb.query(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `)
      
      const indexNames = indexes.map(idx => idx.name)
      expect(indexNames).toContain('idx_sound_packs_sounds_pack')
      expect(indexNames).toContain('idx_sound_packs_sounds_sound')
      expect(indexNames).toContain('idx_sounds_type')
      expect(indexNames).toContain('idx_sounds_drum_type')
    })

    test('should create proper triggers', async () => {
      const triggers = await testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='trigger'
      `)
      
      const triggerNames = triggers.map(t => t.name)
      expect(triggerNames).toContain('update_sounds_timestamp')
      expect(triggerNames).toContain('update_categories_timestamp')
      expect(triggerNames).toContain('update_sound_packs_timestamp')
    })
  })

  describe('CRUD Operations', () => {
    test('should insert and retrieve data', async () => {
      const result = await testDb.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        ['Test Category', 'Test description']
      )
      
      expect(result.lastID).toBeGreaterThan(0)
      
      const category = await testDb.get(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastID]
      )
      
      expect(category).toBeTruthy()
      expect(category.name).toBe('Test Category')
      expect(category.description).toBe('Test description')
    })

    test('should update data and trigger timestamp update', async () => {
      // Insert initial data
      const result = await testDb.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        ['Original Name', 'Original description']
      )
      
      const originalCategory = await testDb.get(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastID]
      )
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Update the category
      await testDb.run(
        'UPDATE categories SET name = ? WHERE id = ?',
        ['Updated Name', result.lastID]
      )
      
      const updatedCategory = await testDb.get(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastID]
      )
      
      expect(updatedCategory.name).toBe('Updated Name')
      expect(updatedCategory.updated_at).not.toBe(originalCategory.updated_at)
    })

    test('should delete data', async () => {
      const result = await testDb.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        ['To Delete', 'Will be deleted']
      )
      
      const deleteResult = await testDb.run(
        'DELETE FROM categories WHERE id = ?',
        [result.lastID]
      )
      
      expect(deleteResult.changes).toBe(1)
      
      const deletedCategory = await testDb.get(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastID]
      )
      
      expect(deletedCategory).toBeUndefined()
    })

    test('should handle transactions', async () => {
      // This test verifies that our migration system's transaction handling works
      try {
        await testDb.run('BEGIN TRANSACTION')
        
        await testDb.run(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          ['Transaction Test', 'Test description']
        )
        
        // Simulate an error
        await testDb.run('INVALID SQL STATEMENT')
        
        await testDb.run('COMMIT')
      } catch (error) {
        await testDb.run('ROLLBACK')
      }
      
      // Verify the transaction was rolled back
      const categories = await testDb.query(
        'SELECT * FROM categories WHERE name = ?',
        ['Transaction Test']
      )
      
      expect(categories).toHaveLength(0)
    })
  })

  describe('Constraints and Validation', () => {
    test('should enforce foreign key constraints', async () => {
      // Try to insert a sound with non-existent sound_pack_id in join table
      const soundResult = await testDb.run(
        'INSERT INTO sounds (name, type, drum_type) VALUES (?, ?, ?)',
        ['Test Sound', 'synthesis', 'kick']
      )
      
      // This should fail due to foreign key constraint
      await expect(
        testDb.run(
          'INSERT INTO sound_packs_sounds (sound_pack_id, sound_id) VALUES (?, ?)',
          [999, soundResult.lastID]
        )
      ).rejects.toThrow()
    })

    test('should enforce check constraints', async () => {
      // Try to insert sound with invalid type
      await expect(
        testDb.run(
          'INSERT INTO sounds (name, type, drum_type) VALUES (?, ?, ?)',
          ['Invalid Sound', 'invalid_type', 'kick']
        )
      ).rejects.toThrow()
      
      // Try to insert sound with invalid energy level
      await expect(
        testDb.run(
          'INSERT INTO sounds (name, type, drum_type, energy_level) VALUES (?, ?, ?, ?)',
          ['Invalid Energy', 'synthesis', 'kick', 10]
        )
      ).rejects.toThrow()
    })

    test('should enforce unique constraints', async () => {
      await testDb.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        ['Unique Category', 'First instance']
      )
      
      // Try to insert duplicate category name
      await expect(
        testDb.run(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          ['Unique Category', 'Second instance']
        )
      ).rejects.toThrow()
    })
  })

  describe('Complex Queries', () => {
    test('should handle joins correctly', async () => {
      const testData = await testDb.seedTestData()
      
      const result = await testDb.query(`
        SELECT s.name as sound_name, sp.name as pack_name, c.name as category_name
        FROM sounds s
        JOIN sound_packs_sounds sps ON s.id = sps.sound_id
        JOIN sound_packs sp ON sps.sound_pack_id = sp.id
        JOIN categories c ON sp.category_id = c.id
        WHERE sp.id = ?
      `, [testData.soundPackId])
      
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('sound_name')
      expect(result[0]).toHaveProperty('pack_name', 'Test Sound Pack')
      expect(result[0]).toHaveProperty('category_name', 'Test Category')
    })

    test('should handle aggregation queries', async () => {
      const testData = await testDb.seedTestData()
      
      const result = await testDb.query(`
        SELECT sp.name, COUNT(sps.sound_id) as sound_count
        FROM sound_packs sp
        LEFT JOIN sound_packs_sounds sps ON sp.id = sps.sound_pack_id
        GROUP BY sp.id, sp.name
      `)
      
      expect(result).toHaveLength(1)
      expect(result[0].sound_count).toBe(3)
    })

    test('should handle subqueries', async () => {
      const testData = await testDb.seedTestData()
      
      const result = await testDb.query(`
        SELECT * FROM sounds 
        WHERE id IN (
          SELECT sound_id FROM sound_packs_sounds 
          WHERE sound_pack_id = ?
        )
        ORDER BY name
      `, [testData.soundPackId])
      
      expect(result).toHaveLength(3)
      expect(result.map(s => s.name)).toEqual(['Test Hi-Hat', 'Test Kick', 'Test Snare'])
    })
  })

  describe('Performance', () => {
    test('should handle bulk operations efficiently', async () => {
      // Clear existing categories first
      await testDb.run('DELETE FROM categories')
      
      const startTime = Date.now()
      
      // Insert many categories
      for (let i = 0; i < 100; i++) {
        await testDb.run(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [`Category ${i}`, `Description ${i}`]
        )
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds
      
      // Verify all were inserted
      const count = await testDb.query('SELECT COUNT(*) as count FROM categories')
      expect(count[0].count).toBe(100)
    })

    test('should use indexes for queries', async () => {
      const testData = await testDb.seedTestData()
      
      // Query that should use the drum_type index
      const result = await testDb.query(`
        SELECT * FROM sounds WHERE drum_type = ?
      `, ['kick'])
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Kick')
    })
  })
}) 