-- Categories/Themes (e.g., Rock, Hip Hop, Jazz, Electronic)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#0000FF', -- For UI theming
    icon TEXT, -- Icon identifier for UI
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sound packs/kits (collections of related sounds)
CREATE TABLE sound_packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    author TEXT,
    version TEXT DEFAULT '1.0',
    is_default BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Main sounds table
CREATE TABLE sounds (
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

    -- Common metadata
    sound_pack_id INTEGER,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sound_pack_id) REFERENCES sound_packs(id) ON DELETE CASCADE
);

-- Tags for flexible categorization
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT, -- e.g., 'genre', 'mood', 'technique', 'era'
    color TEXT DEFAULT '#FFD700',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between sounds and tags
CREATE TABLE sound_tags (
    sound_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (sound_id, tag_id),
    FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_sounds_pack ON sounds(sound_pack_id);
CREATE INDEX idx_sounds_type ON sounds(type);
CREATE INDEX idx_sounds_drum_type ON sounds(drum_type);
CREATE INDEX idx_sound_tags_sound ON sound_tags(sound_id);
CREATE INDEX idx_sound_tags_tag ON sound_tags(tag_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_categories_timestamp 
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_sound_packs_timestamp 
AFTER UPDATE ON sound_packs
BEGIN
    UPDATE sound_packs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_sounds_timestamp 
AFTER UPDATE ON sounds
BEGIN
    UPDATE sounds SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Sample data insertion
INSERT INTO categories (name, description, color, sort_order) VALUES
('Rock', 'Classic and modern rock drums', '#FF0000', 1),
('Hip Hop', 'Boom bap to trap drums', '#FFD700', 2),
('Electronic', 'Synthesized and electronic drums', '#00FF00', 3),
('Jazz', 'Acoustic jazz drums and brushes', '#0000FF', 4),
('World', 'Global percussion and drums', '#FF00FF', 5);

INSERT INTO tags (name, category) VALUES
-- Genre tags
('vintage', 'genre'),
('modern', 'genre'),
('lo-fi', 'genre'),
('trap', 'genre'),
('boom-bap', 'genre'),
('techno', 'genre'),
('house', 'genre'),
-- Mood tags
('aggressive', 'mood'),
('smooth', 'mood'),
('punchy', 'mood'),
('warm', 'mood'),
('dark', 'mood'),
-- Technique tags
('acoustic', 'technique'),
('electronic', 'technique'),
('layered', 'technique'),
('compressed', 'technique'),
-- Era tags
('80s', 'era'),
('90s', 'era'),
('2000s', 'era'),
('2020s', 'era');
