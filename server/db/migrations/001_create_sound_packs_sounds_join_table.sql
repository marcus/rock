-- Migration: Create sound_packs_sounds join table and migrate existing data
-- This migration removes the sound_pack_id foreign key from sounds table
-- and creates a many-to-many relationship via a join table

-- Step 1: Create the new join table
CREATE TABLE sound_packs_sounds (
    sound_pack_id INTEGER NOT NULL,
    sound_id INTEGER NOT NULL,
    PRIMARY KEY (sound_pack_id, sound_id),
    FOREIGN KEY (sound_pack_id) REFERENCES sound_packs(id) ON DELETE CASCADE,
    FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_sound_packs_sounds_pack ON sound_packs_sounds(sound_pack_id);
CREATE INDEX idx_sound_packs_sounds_sound ON sound_packs_sounds(sound_id);

-- Step 3: Migrate existing data from sounds.sound_pack_id to the join table
INSERT INTO sound_packs_sounds (sound_pack_id, sound_id)
SELECT sound_pack_id, id 
FROM sounds 
WHERE sound_pack_id IS NOT NULL;

-- Step 4: Create a new sounds table without the sound_pack_id column
CREATE TABLE sounds_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sample', 'synthesis')),

    -- For samples
    file_path TEXT, -- Path to MP3/WAV file
    file_size INTEGER, -- In bytes
    duration REAL, -- In seconds
    sample_rate INTEGER,
    format TEXT CHECK (format IN ('mp3', 'wav', 'ogg', 'flac', NULL)),

    -- For synthesis
    synthesis_params JSON, -- JSON blob for synthesis parameters
    synthesis_engine TEXT, -- e.g., 'tone.js', 'web-audio', 'custom'

    -- Common metadata (removed sound_pack_id)
    drum_type TEXT CHECK (drum_type IN ('kick', 'snare', 'hihat_closed', 'hihat_open', 
                                        'crash', 'clap', 'cowbell', 'tom_low', 'tom_mid', 
                                        'tom_high', 'ride', 'percussion', 'fx', 'other')),

    -- Audio characteristics
    pitch_key TEXT, -- Musical key if applicable (e.g., 'C', 'F#')
    bpm INTEGER, -- For loops/rhythmic samples
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5), -- 1=soft, 5=hard hitting

    -- UI/Display
    waveform_data JSON, -- Pre-calculated waveform for visualization
    color TEXT, -- Hex color for UI

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Copy all data from old sounds table to new sounds table (excluding sound_pack_id)
INSERT INTO sounds_new (
    id, name, type, file_path, file_size, duration, sample_rate, format,
    synthesis_params, synthesis_engine, drum_type, pitch_key, bpm, energy_level,
    waveform_data, color, created_at, updated_at
)
SELECT 
    id, name, type, file_path, file_size, duration, sample_rate, format,
    synthesis_params, synthesis_engine, drum_type, pitch_key, bpm, energy_level,
    waveform_data, color, created_at, updated_at
FROM sounds;

-- Step 6: Drop the old sounds table and rename the new one
DROP TABLE sounds;
ALTER TABLE sounds_new RENAME TO sounds;

-- Step 7: Recreate the indexes and triggers for the sounds table
CREATE INDEX idx_sounds_type ON sounds(type);
CREATE INDEX idx_sounds_drum_type ON sounds(drum_type);

CREATE TRIGGER update_sounds_timestamp 
AFTER UPDATE ON sounds
BEGIN
    UPDATE sounds SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Step 8: Update the sound_tags foreign key constraint (recreate the table to ensure proper constraints)
CREATE TABLE sound_tags_new (
    sound_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (sound_id, tag_id),
    FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Copy existing sound_tags data
INSERT INTO sound_tags_new (sound_id, tag_id)
SELECT sound_id, tag_id FROM sound_tags;

-- Replace the old sound_tags table
DROP TABLE sound_tags;
ALTER TABLE sound_tags_new RENAME TO sound_tags;

-- Recreate sound_tags indexes
CREATE INDEX idx_sound_tags_sound ON sound_tags(sound_id);
CREATE INDEX idx_sound_tags_tag ON sound_tags(tag_id);