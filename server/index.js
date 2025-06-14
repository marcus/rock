import express from 'express'
import cors from 'cors'
import { database } from './db/database.js'
import { seedDefaultSoundPack } from './seedData.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

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
    const sounds = await database.query(`
      SELECT * FROM sounds WHERE sound_pack_id = ? ORDER BY drum_type
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
      JOIN sound_packs sp ON s.sound_pack_id = sp.id 
      WHERE sp.is_default = 1 
      ORDER BY s.drum_type
    `)
    res.json(sounds)
  } catch (error) {
    console.error('Error fetching default sounds:', error)
    res.status(500).json({ error: 'Failed to fetch default sounds' })
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