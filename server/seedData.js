import { database } from './db/database.js'

// DrumSounds.js synthesis parameters mapped to database format
const defaultSounds = [
  {
    name: 'Kick Drum',
    type: 'synthesis',
    drum_type: 'kick',
    synthesis_params: JSON.stringify({
      synthType: 'MembraneSynth',
      config: {
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      },
      note: 'C1',
      duration: '8n',
      cleanup_delay: 2000
    }),
    synthesis_engine: 'tone.js',
    energy_level: 5,
    color: '#FF0000'
  },
  {
    name: 'Snare Drum',
    type: 'synthesis',
    drum_type: 'snare',
    synthesis_params: JSON.stringify({
      synthType: 'NoiseSynth',
      config: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      },
      filter: {
        frequency: 1000,
        type: 'bandpass'
      },
      duration: '8n',
      cleanup_delay: 1000
    }),
    synthesis_engine: 'tone.js',
    energy_level: 4,
    color: '#FFD700'
  },
  {
    name: 'Closed Hi-Hat',
    type: 'synthesis',
    drum_type: 'hihat_closed',
    synthesis_params: JSON.stringify({
      synthType: 'NoiseSynth',
      config: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
      },
      filter: {
        frequency: 8000,
        type: 'highpass'
      },
      duration: '32n',
      cleanup_delay: 500
    }),
    synthesis_engine: 'tone.js',
    energy_level: 2,
    color: '#00FF00'
  },
  {
    name: 'Open Hi-Hat',
    type: 'synthesis',
    drum_type: 'hihat_open',
    synthesis_params: JSON.stringify({
      synthType: 'NoiseSynth',
      config: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0 }
      },
      filter: {
        frequency: 6000,
        type: 'highpass'
      },
      duration: '4n',
      cleanup_delay: 1000
    }),
    synthesis_engine: 'tone.js',
    energy_level: 3,
    color: '#00FFFF'
  },
  {
    name: 'Crash Cymbal',
    type: 'synthesis',
    drum_type: 'crash',
    synthesis_params: JSON.stringify({
      synthType: 'NoiseSynth',
      config: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 1.5, sustain: 0 }
      },
      filter: {
        frequency: 3000,
        type: 'highpass'
      },
      duration: '2n',
      cleanup_delay: 2000
    }),
    synthesis_engine: 'tone.js',
    energy_level: 5,
    color: '#FF00FF'
  },
  {
    name: 'Hand Clap',
    type: 'synthesis',
    drum_type: 'clap',
    synthesis_params: JSON.stringify({
      synthType: 'NoiseSynth',
      config: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0 }
      },
      filter: {
        frequency: 1100,
        type: 'bandpass',
        Q: -12
      },
      duration: '64n',
      multiple_hits: [0, 0.01, 0.02],
      cleanup_delay: 500
    }),
    synthesis_engine: 'tone.js',
    energy_level: 3,
    color: '#FFA500'
  },
  {
    name: 'Cowbell',
    type: 'synthesis',
    drum_type: 'cowbell',
    synthesis_params: JSON.stringify({
      synthType: 'Dual',
      synth1: {
        type: 'Synth',
        config: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }
        },
        note: 'D4',
        filter: { frequency: 800, type: 'bandpass', Q: 8 }
      },
      synth2: {
        type: 'Synth',
        config: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.2 }
        },
        note: 'A4',
        filter: { frequency: 1200, type: 'bandpass', Q: 6 }
      },
      duration: '4n',
      cleanup_delay: 1500
    }),
    synthesis_engine: 'tone.js',
    energy_level: 4,
    color: '#FFFF00'
  },
  {
    name: 'Tom Drum',
    type: 'synthesis',
    drum_type: 'tom_mid',
    synthesis_params: JSON.stringify({
      synthType: 'MembraneSynth',
      config: {
        pitchDecay: 0.1,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1 }
      },
      note: 'G2',
      duration: '4n',
      cleanup_delay: 1500
    }),
    synthesis_engine: 'tone.js',
    energy_level: 4,
    color: '#8B4513'
  }
]

export async function seedDefaultSoundPack() {
  try {
    // Check if default sound pack already exists
    const existingPack = await database.get('SELECT id FROM sound_packs WHERE is_default = 1')
    
    if (existingPack) {
      console.log('Default sound pack already exists, skipping seed')
      return
    }

    console.log('Creating default sound pack...')

    // Get or create Electronic category
    let category = await database.get('SELECT id FROM categories WHERE name = ?', ['Electronic'])
    if (!category) {
      const result = await database.run(
        'INSERT INTO categories (name, description, color, sort_order) VALUES (?, ?, ?, ?)',
        ['Electronic', 'Synthesized and electronic drums', '#00FF00', 3]
      )
      category = { id: result.lastID }
    }

    // Create default sound pack
    const packResult = await database.run(`
      INSERT INTO sound_packs (name, description, category_id, author, is_default)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'Default Synthesis Pack',
      'Default synthesized drum sounds from Roy\'s Rock Machine',
      category.id,
      'Roy\'s Rock Machine',
      1
    ])

    const soundPackId = packResult.lastID

    // Insert all default sounds
    for (const sound of defaultSounds) {
      await database.run(`
        INSERT INTO sounds (
          name, type, synthesis_params, synthesis_engine, 
          sound_pack_id, drum_type, energy_level, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sound.name,
        sound.type,
        sound.synthesis_params,
        sound.synthesis_engine,
        soundPackId,
        sound.drum_type,
        sound.energy_level,
        sound.color
      ])
    }

    console.log(`Successfully created default sound pack with ${defaultSounds.length} sounds`)
  } catch (error) {
    console.error('Error seeding default sound pack:', error)
    throw error
  }
}