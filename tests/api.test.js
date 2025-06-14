import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import { TestDatabase } from './helpers/database.js'

// Create test app
function createTestApp(database) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // API Routes (copied from server/index.js but using test database)
  
  // Get all sound packs
  app.get('/api/sound-packs', async (req, res) => {
    try {
      const soundPacks = await database.query(`
        SELECT sp.*, c.name as category_name 
        FROM sound_packs sp 
        LEFT JOIN categories c ON sp.category_id = c.id 
        ORDER BY sp.is_default DESC, sp.created_at DESC
      `)
      res.json(soundPacks)
    } catch (error) {
      console.error('Error fetching sound packs:', error)
      res.status(500).json({ error: 'Failed to fetch sound packs' })
    }
  })

  // Get default sound pack
  app.get('/api/sound-packs/default', async (req, res) => {
    try {
      const soundPack = await database.get(`
        SELECT * FROM sound_packs WHERE is_default = 1 LIMIT 1
      `)
      
      if (!soundPack) {
        return res.status(404).json({ error: 'Default sound pack not found' })
      }

      res.json(soundPack)
    } catch (error) {
      console.error('Error fetching default sound pack:', error)
      res.status(500).json({ error: 'Failed to fetch default sound pack' })
    }
  })

  // Get sounds by sound pack
  app.get('/api/sound-packs/:id/sounds', async (req, res) => {
    try {
      const { id } = req.params
      const sounds = await database.query(`
        SELECT s.* FROM sounds s 
        JOIN sound_packs_sounds sps ON s.id = sps.sound_id 
        WHERE sps.sound_pack_id = ? 
        ORDER BY s.drum_type
      `, [id])
      res.json(sounds)
    } catch (error) {
      console.error('Error fetching sounds:', error)
      res.status(500).json({ error: 'Failed to fetch sounds' })
    }
  })

  // Get sounds for default sound pack
  app.get('/api/sounds/default', async (req, res) => {
    try {
      const sounds = await database.query(`
        SELECT s.* FROM sounds s 
        JOIN sound_packs_sounds sps ON s.id = sps.sound_id 
        JOIN sound_packs sp ON sps.sound_pack_id = sp.id 
        WHERE sp.is_default = 1 
        ORDER BY s.drum_type
      `)
      res.json(sounds)
    } catch (error) {
      console.error('Error fetching default sounds:', error)
      res.status(500).json({ error: 'Failed to fetch default sounds' })
    }
  })

  // Get all sound packs for a specific sound
  app.get('/api/sounds/:id/sound-packs', async (req, res) => {
    try {
      const { id } = req.params
      const soundPacks = await database.query(`
        SELECT sp.*, c.name as category_name 
        FROM sound_packs sp 
        LEFT JOIN categories c ON sp.category_id = c.id 
        JOIN sound_packs_sounds sps ON sp.id = sps.sound_pack_id 
        WHERE sps.sound_id = ? 
        ORDER BY sp.is_default DESC, sp.created_at DESC
      `, [id])
      res.json(soundPacks)
    } catch (error) {
      console.error('Error fetching sound packs for sound:', error)
      res.status(500).json({ error: 'Failed to fetch sound packs for sound' })
    }
  })

  // Add a sound to a sound pack
  app.post('/api/sound-packs/:packId/sounds/:soundId', async (req, res) => {
    try {
      const { packId, soundId } = req.params
      
      // Check if relationship already exists
      const existing = await database.get(`
        SELECT 1 FROM sound_packs_sounds 
        WHERE sound_pack_id = ? AND sound_id = ?
      `, [packId, soundId])
      
      if (existing) {
        return res.status(409).json({ error: 'Sound is already in this sound pack' })
      }
      
      await database.run(`
        INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
        VALUES (?, ?)
      `, [packId, soundId])
      
      res.json({ message: 'Sound added to sound pack successfully' })
    } catch (error) {
      console.error('Error adding sound to sound pack:', error)
      res.status(500).json({ error: 'Failed to add sound to sound pack' })
    }
  })

  // Remove a sound from a sound pack
  app.delete('/api/sound-packs/:packId/sounds/:soundId', async (req, res) => {
    try {
      const { packId, soundId } = req.params
      
      const result = await database.run(`
        DELETE FROM sound_packs_sounds 
        WHERE sound_pack_id = ? AND sound_id = ?
      `, [packId, soundId])
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Sound not found in this sound pack' })
      }
      
      res.json({ message: 'Sound removed from sound pack successfully' })
    } catch (error) {
      console.error('Error removing sound from sound pack:', error)
      res.status(500).json({ error: 'Failed to remove sound from sound pack' })
    }
  })

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}

describe('API Endpoints', () => {
  let testDb
  let app
  let testData

  beforeAll(async () => {
    testDb = new TestDatabase()
    await testDb.initialize()
    app = createTestApp(testDb)
  })

  afterAll(async () => {
    if (testDb) {
      testDb.close()
    }
  })

  beforeEach(async () => {
    await testDb.clear()
    testData = await testDb.seedTestData()
  })

  describe('Health Check', () => {
    test('GET /api/health should return status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('Sound Packs', () => {
    test('GET /api/sound-packs should return all sound packs', async () => {
      const response = await request(app)
        .get('/api/sound-packs')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toHaveProperty('name', 'Test Sound Pack')
      expect(response.body[0]).toHaveProperty('category_name', 'Test Category')
    })

    test('GET /api/sound-packs/default should return default sound pack', async () => {
      const response = await request(app)
        .get('/api/sound-packs/default')
        .expect(200)

      expect(response.body).toHaveProperty('name', 'Test Sound Pack')
      expect(response.body).toHaveProperty('is_default', 1)
    })

    test('GET /api/sound-packs/default should return 404 when no default pack exists', async () => {
      // Remove default flag
      await testDb.run('UPDATE sound_packs SET is_default = 0')

      const response = await request(app)
        .get('/api/sound-packs/default')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Default sound pack not found')
    })

    test('GET /api/sound-packs/:id/sounds should return sounds for a sound pack', async () => {
      const response = await request(app)
        .get(`/api/sound-packs/${testData.soundPackId}/sounds`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(3)
      
      const soundNames = response.body.map(s => s.name)
      expect(soundNames).toContain('Test Kick')
      expect(soundNames).toContain('Test Snare')
      expect(soundNames).toContain('Test Hi-Hat')
    })

    test('GET /api/sound-packs/:id/sounds should return empty array for non-existent pack', async () => {
      const response = await request(app)
        .get('/api/sound-packs/999/sounds')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })
  })

  describe('Sounds', () => {
    test('GET /api/sounds/default should return sounds from default pack', async () => {
      const response = await request(app)
        .get('/api/sounds/default')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(3)
      
      const soundNames = response.body.map(s => s.name)
      expect(soundNames).toContain('Test Kick')
      expect(soundNames).toContain('Test Snare')
      expect(soundNames).toContain('Test Hi-Hat')
    })

    test('GET /api/sounds/:id/sound-packs should return sound packs containing a sound', async () => {
      const soundId = testData.soundIds[0]
      
      const response = await request(app)
        .get(`/api/sounds/${soundId}/sound-packs`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toHaveProperty('name', 'Test Sound Pack')
    })

    test('GET /api/sounds/:id/sound-packs should return empty array for non-existent sound', async () => {
      const response = await request(app)
        .get('/api/sounds/999/sound-packs')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })
  })

  describe('Many-to-Many Relationships', () => {
    test('POST /api/sound-packs/:packId/sounds/:soundId should add sound to pack', async () => {
      // Create a second sound pack
      const pack2Result = await testDb.run(`
        INSERT INTO sound_packs (name, description, category_id, author, is_default)
        VALUES (?, ?, ?, ?, ?)
      `, ['Second Pack', 'Second test pack', testData.categoryId, 'Test Author', 0])

      const soundId = testData.soundIds[0]
      
      const response = await request(app)
        .post(`/api/sound-packs/${pack2Result.lastID}/sounds/${soundId}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Sound added to sound pack successfully')

      // Verify the relationship was created
      const relationships = await testDb.query(`
        SELECT * FROM sound_packs_sounds 
        WHERE sound_pack_id = ? AND sound_id = ?
      `, [pack2Result.lastID, soundId])

      expect(relationships).toHaveLength(1)
    })

    test('POST /api/sound-packs/:packId/sounds/:soundId should return 409 for duplicate relationship', async () => {
      const soundId = testData.soundIds[0]
      
      const response = await request(app)
        .post(`/api/sound-packs/${testData.soundPackId}/sounds/${soundId}`)
        .expect(409)

      expect(response.body).toHaveProperty('error', 'Sound is already in this sound pack')
    })

    test('DELETE /api/sound-packs/:packId/sounds/:soundId should remove sound from pack', async () => {
      const soundId = testData.soundIds[0]
      
      const response = await request(app)
        .delete(`/api/sound-packs/${testData.soundPackId}/sounds/${soundId}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Sound removed from sound pack successfully')

      // Verify the relationship was removed
      const relationships = await testDb.query(`
        SELECT * FROM sound_packs_sounds 
        WHERE sound_pack_id = ? AND sound_id = ?
      `, [testData.soundPackId, soundId])

      expect(relationships).toHaveLength(0)
    })

    test('DELETE /api/sound-packs/:packId/sounds/:soundId should return 404 for non-existent relationship', async () => {
      const response = await request(app)
        .delete('/api/sound-packs/999/sounds/999')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Sound not found in this sound pack')
    })
  })

  describe('Data Integrity', () => {
    test('should maintain referential integrity when sound is in multiple packs', async () => {
      // Create a second sound pack
      const pack2Result = await testDb.run(`
        INSERT INTO sound_packs (name, description, category_id, author, is_default)
        VALUES (?, ?, ?, ?, ?)
      `, ['Second Pack', 'Second test pack', testData.categoryId, 'Test Author', 0])

      const soundId = testData.soundIds[0]

      // Add sound to second pack
      await request(app)
        .post(`/api/sound-packs/${pack2Result.lastID}/sounds/${soundId}`)
        .expect(200)

      // Verify sound appears in both packs
      const pack1Sounds = await request(app)
        .get(`/api/sound-packs/${testData.soundPackId}/sounds`)
        .expect(200)

      const pack2Sounds = await request(app)
        .get(`/api/sound-packs/${pack2Result.lastID}/sounds`)
        .expect(200)

      expect(pack1Sounds.body.some(s => s.id === soundId)).toBe(true)
      expect(pack2Sounds.body.some(s => s.id === soundId)).toBe(true)

      // Verify sound shows both packs
      const soundPacks = await request(app)
        .get(`/api/sounds/${soundId}/sound-packs`)
        .expect(200)

      expect(soundPacks.body).toHaveLength(2)
    })

    test('should handle concurrent operations correctly', async () => {
      // Create multiple sound packs
      const pack2Result = await testDb.run(`
        INSERT INTO sound_packs (name, description, category_id, author, is_default)
        VALUES (?, ?, ?, ?, ?)
      `, ['Concurrent Pack', 'Concurrent test pack', testData.categoryId, 'Test Author', 0])

      const soundId = testData.soundIds[0]

      // Perform concurrent operations
      const operations = [
        request(app).post(`/api/sound-packs/${pack2Result.lastID}/sounds/${soundId}`),
        request(app).get(`/api/sounds/${soundId}/sound-packs`),
        request(app).get(`/api/sound-packs/${testData.soundPackId}/sounds`)
      ]

      const results = await Promise.all(operations)
      
      // First operation should succeed
      expect(results[0].status).toBe(200)
      
      // Other operations should also succeed
      expect(results[1].status).toBe(200)
      expect(results[2].status).toBe(200)
    })
  })
}) 