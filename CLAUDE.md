# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roy's Rock Machine is a browser-based drum sequencer built with React, Vite, and Tone.js. It features a dynamic track system supporting up to 40 tracks with both synthesized and sample-based audio playback. All drum sounds are loaded dynamically from a REST API and database.

## Development Commands

```bash
# Start development server (both frontend and backend)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview

# Run tests
npm test
```

## Architecture

### Dynamic Track System
The application now supports dynamic track management:

- **Scalable Tracks**: Support for 1-40 tracks (configurable maximum)
- **Sound Selection**: Modal interface for adding sounds from database
- **Track Management**: Add/remove tracks with automatic pattern adjustment
- **Real-time Updates**: Immediate audio availability after adding sounds

### Audio System
The audio architecture uses Tone.js for cross-browser compatibility and precise timing:

- **Timing**: Uses `Tone.Transport` and `Tone.Sequence` instead of `setTimeout` for audio-accurate scheduling
- **Dynamic Sound Loading**: All drum sounds are loaded from `/api/sounds` and `/api/sounds/default` endpoints
- **API-Based Audio**: `DrumSoundsAPI` class manages sound initialization, loading, and playback from database configurations
- **Sample Management**: MP3 files are loaded via API configuration with automatic fallback to synthesis if samples fail to load

### Sound Configuration
- **Database-Driven**: Sound packs, individual sounds, and their parameters are stored in SQLite database
- **Synthesis Parameters**: Tone.js synthesis configurations stored as JSON in database
- **Sample Integration**: File paths for audio samples stored in database with automatic loading
- **Default Pack**: System includes a default synthesis pack with standard drum sounds
- **Dynamic Loading**: New sounds can be added at runtime via `DrumSoundsAPI.addSound()`

### State Management
- **Dynamic Pattern State**: Variable-length arrays for step programming, volumes, and mute states
- **Ref Management**: Uses `useRef` for audio-critical state (`currentStepRef`, `patternRef`, `tracksRef`) to avoid React rendering delays during playback
- **Real-time Updates**: Pattern changes (volume, mute, steps) update immediately during playback via ref synchronization
- **Track Synchronization**: Track list and pattern arrays stay synchronized when adding/removing tracks

### Component Structure
- **App.jsx**: Main sequencer logic, dynamic track management, audio initialization, and state management
- **TrackManager.jsx**: Handles dynamic track list with add/remove functionality and step grid
- **SoundSelector.jsx**: Modal for selecting sounds from database with filtering
- **Controls**: Transport controls (play/stop, tempo, master volume)
- **MasterVolumeControl**: Master volume and mute controls

### Browser Compatibility
- **Safari Issue**: Safari has timing offset issues - the current implementation addresses this with Tone.js Transport
- **Chrome**: Works correctly with standard timing
- **Responsive Design**: Uses viewport units (`vw`, `vh`) for scaling across screen sizes

### API Integration
Sound management is fully API-driven:
- **Initialization**: `DrumSoundsAPI.initialize()` fetches sound configuration from `/api/sounds/default`
- **All Sounds**: `/api/sounds` endpoint provides complete sound library for selection
- **Dynamic Addition**: `DrumSoundsAPI.addSound(soundData)` adds new sounds at runtime
- **Playback**: `drumSoundsInstance.playSoundScheduled(soundKey, volume, time)` handles both synthesis and sample playback
- **Unique Keys**: Dynamic sounds use `drum_type_id` format for unique identification

### Key Implementation Details
- **Scheduling**: `setupToneSequence()` creates a repeating 16-step sequence using `Tone.Sequence`
- **Visual Sync**: `Tone.Draw.schedule()` ensures UI updates align with audio timing
- **State Persistence**: Pattern state persists during tempo/volume changes via `patternRef.current`
- **Dynamic Patterns**: Pattern arrays automatically resize when tracks are added/removed
- **Cleanup**: Proper disposal of Tone.js objects on component unmount and playback stop
- **API Initialization**: Drum sounds API is initialized early in app lifecycle to ensure sounds are available for playback

### New Components

#### TrackManager
- Renders dynamic list of tracks with step grids
- Handles add/remove track functionality
- Integrates volume controls and mute buttons
- Responsive design for mobile devices

#### SoundSelector
- Modal interface for sound selection
- Fetches available sounds from `/api/sounds`
- Filters out sounds already in use
- Category-based filtering (kick, snare, hihat, etc.)
- Clean, accessible UI with keyboard navigation

### Database Schema
The application uses SQLite with the following key tables:
- `sounds`: Individual drum sounds with synthesis parameters or sample paths
- `sound_packs`: Collections of sounds (default pack system)
- `sound_packs_sounds`: Many-to-many relationship between packs and sounds

### Performance Considerations
- **Lazy Loading**: Sounds are only loaded when added to the sequencer
- **Memory Management**: Proper cleanup of Tone.js objects and event listeners
- **Efficient Rendering**: Uses React keys and memoization where appropriate
- **Audio Optimization**: Persistent Tone.Player instances for samples to avoid latency