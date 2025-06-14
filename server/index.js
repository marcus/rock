import express from 'express'
import cors from 'cors'
import { database } from './db/database.js'
import { seedDefaultSoundPack } from './seedData.js'
import { SoundGenerationService } from './services/soundGeneration.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize sound generation service
let soundGenerationService
try {
  soundGenerationService = new SoundGenerationService()
} catch (error) {
  console.warn('Sound generation service not available:', error.message)
}

// Initialize database on startup
async function initializeServer() {
  try {
    await database.initialize()
    await seedDefaultSoundPack()
    console.log('Server initialization complete')
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

// API Routes

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
    const sounds = await database.query(
      `
      SELECT s.* FROM sounds s 
      JOIN sound_packs_sounds sps ON s.id = sps.sound_id 
      WHERE sps.sound_pack_id = ? 
      ORDER BY s.drum_type
    `,
      [id]
    )
    res.json(sounds)
  } catch (error) {
    console.error('Error fetching sounds:', error)
    res.status(500).json({ error: 'Failed to fetch sounds' })
  }
})

// Get all sounds
app.get('/api/sounds', async (req, res) => {
  try {
    const sounds = await database.query(`
      SELECT * FROM sounds 
      ORDER BY drum_type, name
    `)
    res.json(sounds)
  } catch (error) {
    console.error('Error fetching all sounds:', error)
    res.status(500).json({ error: 'Failed to fetch sounds' })
  }
})

// Get sounds for default sound pack
app.get('/api/sounds/default', async (req, res) => {
  try {
    console.log('Fetching default sounds...')
    const sounds = await database.query(`
      SELECT s.* FROM sounds s 
      JOIN sound_packs_sounds sps ON s.id = sps.sound_id 
      JOIN sound_packs sp ON sps.sound_pack_id = sp.id 
      WHERE sp.is_default = 1 
      ORDER BY s.drum_type
    `)
    console.log(`Found ${sounds.length} default sounds`)
    res.json(sounds)
  } catch (error) {
    console.error('Error fetching default sounds:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ error: 'Failed to fetch default sounds' })
  }
})

// Get all sound packs for a specific sound
app.get('/api/sounds/:id/sound-packs', async (req, res) => {
  try {
    const { id } = req.params
    const soundPacks = await database.query(
      `
      SELECT sp.*, c.name as category_name 
      FROM sound_packs sp 
      LEFT JOIN categories c ON sp.category_id = c.id 
      JOIN sound_packs_sounds sps ON sp.id = sps.sound_pack_id 
      WHERE sps.sound_id = ? 
      ORDER BY sp.is_default DESC, sp.created_at DESC
    `,
      [id]
    )
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
    const existing = await database.get(
      `
      SELECT 1 FROM sound_packs_sounds 
      WHERE sound_pack_id = ? AND sound_id = ?
    `,
      [packId, soundId]
    )

    if (existing) {
      return res.status(409).json({ error: 'Sound is already in this sound pack' })
    }

    await database.run(
      `
      INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
      VALUES (?, ?)
    `,
      [packId, soundId]
    )

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

    const result = await database.run(
      `
      DELETE FROM sound_packs_sounds 
      WHERE sound_pack_id = ? AND sound_id = ?
    `,
      [packId, soundId]
    )

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sound not found in this sound pack' })
    }

    res.json({ message: 'Sound removed from sound pack successfully' })
  } catch (error) {
    console.error('Error removing sound from sound pack:', error)
    res.status(500).json({ error: 'Failed to remove sound from sound pack' })
  }
})

// Generate sound endpoint
app.post('/api/sounds/generate', async (req, res) => {
  try {
    if (!soundGenerationService) {
      return res.status(503).json({
        error:
          'Sound generation service not available. Please check ELEVENLABS_API_KEY environment variable.',
      })
    }

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

    // Generate the sound using ElevenLabs
    const generatedSound = await soundGenerationService.generateSound(prompt, duration)

    // Get the Generated category ID
    const generatedCategory = await database.get(`
      SELECT id FROM categories WHERE name = 'Generated' LIMIT 1
    `)

    if (!generatedCategory) {
      return res
        .status(500)
        .json({ error: 'Generated category not found. Please run database migrations.' })
    }

    // Create a sound pack for generated sounds if it doesn't exist
    let generatedSoundPack = await database.get(`
      SELECT id FROM sound_packs WHERE name = 'Generated Sounds' LIMIT 1
    `)

    if (!generatedSoundPack) {
      const result = await database.run(
        `
        INSERT INTO sound_packs (name, description, category_id, author)
        VALUES ('Generated Sounds', 'AI-generated drum sounds', ?, 'AI Generated')
      `,
        [generatedCategory.id]
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

    // Add the sound to the sound pack
    await database.run(
      `
      INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
      VALUES (?, ?)
    `,
      [generatedSoundPack.id, soundResult.lastID]
    )

    // Return the complete sound object
    const newSound = await database.get(
      `
      SELECT * FROM sounds WHERE id = ?
    `,
      [soundResult.lastID]
    )

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...')
  database.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...')
  database.close()
  process.exit(0)
})
