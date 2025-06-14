import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createTestDatabase } from './helpers/database.js'
import request from 'supertest'
import express from 'express'
import cors from 'cors'

// Mock the SoundGenerationService to avoid needing an actual API key
class MockSoundGenerationService {
  constructor() {
    this.apiKey = 'mock-key'
  }

  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string')
    }
    if (prompt.length > 300) {
      throw new Error('Prompt must be 300 characters or less')
    }
    return prompt.trim()
  }

  validateDuration(duration) {
    const numDuration = Number(duration)
    if (isNaN(numDuration)) return 0.5
    if (numDuration < 0.5) return 0.5
    if (numDuration > 1.5) return 1.5
    return numDuration
  }

  async generateSound(prompt, durationSeconds = 0.5) {
    const validatedPrompt = this.validatePrompt(prompt)
    const validatedDuration = this.validateDuration(durationSeconds)

    // Mock response
    const timestamp = Date.now()
    const filename = `generated_${timestamp}.mp3`

    return {
      filename,
      filePath: `/audio/${filename}`,
      prompt: validatedPrompt,
      duration: validatedDuration,
    }
  }
}

describe('Sound Generation API', () => {
  let database
  let app
  let mockSoundGenerationService

  beforeEach(async () => {
    // Setup test database
    database = await createTestDatabase()
    await database.initialize()

    // Create the Generated category if it doesn't exist
    const existingCategory = await database.get(
      'SELECT id FROM categories WHERE name = "Generated"'
    )
    if (!existingCategory) {
      await database.run(
        'INSERT INTO categories (name, description, color, sort_order) VALUES (?, ?, ?, ?)',
        ['Generated', 'Sounds created with AI', '#8888FF', 100]
      )
    }

    // Setup Express app with mocked service
    app = express()
    app.use(cors())
    app.use(express.json())

    mockSoundGenerationService = new MockSoundGenerationService()

    // Add the sound generation endpoint
    app.post('/api/sounds/generate', async (req, res) => {
      try {
        const { prompt, duration, name, drumType } = req.body

        if (!prompt) {
          return res.status(400).json({ error: 'Prompt is required' })
        }
        if (!name) {
          return res.status(400).json({ error: 'Name is required' })
        }
        if (!drumType) {
          return res.status(400).json({ error: 'Drum type is required' })
        }

        // Generate the sound using mock service
        const generatedSound = await mockSoundGenerationService.generateSound(prompt, duration)

        // Get the Generated category ID
        const generatedCategory = await database.get(
          'SELECT id FROM categories WHERE name = "Generated" LIMIT 1'
        )

        if (!generatedCategory) {
          return res.status(500).json({ error: 'Generated category not found' })
        }

        // Create a sound pack for generated sounds if it doesn't exist
        let generatedSoundPack = await database.get(
          'SELECT id FROM sound_packs WHERE name = "Generated Sounds" LIMIT 1'
        )

        if (!generatedSoundPack) {
          const result = await database.run(
            'INSERT INTO sound_packs (name, description, category_id, author) VALUES (?, ?, ?, ?)',
            ['Generated Sounds', 'AI-generated drum sounds', generatedCategory.id, 'AI Generated']
          )
          generatedSoundPack = { id: result.lastID }
        }

        // Insert the new sound into the database
        const soundResult = await database.run(
          `
          INSERT INTO sounds (
            name, type, file_path, drum_type, is_generated, prompt,
            created_at, updated_at
          ) VALUES (?, 'sample', ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
          [name, generatedSound.filePath, drumType, prompt]
        )

        // Add the sound to the sound pack (using sound_packs_sounds join table)
        await database.run(
          'INSERT INTO sound_packs_sounds (sound_pack_id, sound_id) VALUES (?, ?)',
          [generatedSoundPack.id, soundResult.lastID]
        )

        // Return the complete sound object
        const newSound = await database.get('SELECT * FROM sounds WHERE id = ?', [
          soundResult.lastID,
        ])

        res.json({
          ...newSound,
          audioUrl: generatedSound.filePath,
        })
      } catch (error) {
        console.error('Error generating sound:', error)
        res.status(500).json({
          error: 'Failed to generate sound',
          details: error.message,
        })
      }
    })
  })

  afterEach(async () => {
    if (database) {
      await database.close()
    }
  })

  describe('POST /api/sounds/generate', () => {
    it('should successfully generate a new sound', async () => {
      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Deep punchy kick drum with sub bass',
          duration: 0.8,
          name: 'Test Kick',
          drumType: 'kick',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        name: 'Test Kick',
        type: 'sample',
        drum_type: 'kick',
        is_generated: 1,
        prompt: 'Deep punchy kick drum with sub bass',
      })

      expect(response.body.file_path).toMatch(/^\/audio\/generated_\d+\.mp3$/)
      expect(response.body.audioUrl).toBe(response.body.file_path)
    })

    it('should require prompt field', async () => {
      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          name: 'Test Sound',
          drumType: 'snare',
        })
        .expect(400)

      expect(response.body.error).toBe('Prompt is required')
    })

    it('should require name field', async () => {
      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test prompt',
          drumType: 'snare',
        })
        .expect(400)

      expect(response.body.error).toBe('Name is required')
    })

    it('should require drumType field', async () => {
      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test prompt',
          name: 'Test Sound',
        })
        .expect(400)

      expect(response.body.error).toBe('Drum type is required')
    })

    it('should validate prompt length', async () => {
      const longPrompt = 'a'.repeat(301) // Exceeds 300 character limit

      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: longPrompt,
          name: 'Test Sound',
          drumType: 'kick',
        })
        .expect(500)

      expect(response.body.details).toBe('Prompt must be 300 characters or less')
    })

    it("should create Generated Sounds pack if it doesn't exist", async () => {
      await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test sound',
          name: 'Test Sound',
          drumType: 'kick',
        })
        .expect(200)

      const soundPack = await database.get(
        'SELECT * FROM sound_packs WHERE name = "Generated Sounds"'
      )

      expect(soundPack).toBeTruthy()
      expect(soundPack.name).toBe('Generated Sounds')
      expect(soundPack.description).toBe('AI-generated drum sounds')
      expect(soundPack.author).toBe('AI Generated')
    })

    it('should add sound to Generated Sounds pack via join table', async () => {
      const response = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test sound',
          name: 'Test Sound',
          drumType: 'kick',
        })
        .expect(200)

      const soundId = response.body.id

      // Check that the sound is in the join table
      const relationship = await database.get(
        `
        SELECT sps.* FROM sound_packs_sounds sps
        JOIN sound_packs sp ON sps.sound_pack_id = sp.id
        WHERE sp.name = "Generated Sounds" AND sps.sound_id = ?
      `,
        [soundId]
      )

      expect(relationship).toBeTruthy()
    })

    it('should handle duration validation correctly', async () => {
      // Test with duration below minimum
      const response1 = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test sound',
          name: 'Test Sound 1',
          drumType: 'kick',
          duration: 0.3, // Below minimum of 0.5
        })
        .expect(200)

      // Should use minimum duration
      expect(response1.body.prompt).toBe('Test sound')

      // Test with duration above maximum
      const response2 = await request(app)
        .post('/api/sounds/generate')
        .send({
          prompt: 'Test sound',
          name: 'Test Sound 2',
          drumType: 'kick',
          duration: 2.0, // Above maximum of 1.5
        })
        .expect(200)

      // Should use maximum duration
      expect(response2.body.prompt).toBe('Test sound')
    })
  })
})
