# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roy's Rock Machine is a browser-based drum sequencer built with React, Vite, and Tone.js. It features an 8-track, 16-step grid interface with both synthesized and sample-based audio playback. All drum sounds are loaded dynamically from a REST API and database.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Audio System
The audio architecture uses Tone.js for cross-browser compatibility and precise timing:

- **Timing**: Uses `Tone.Transport` and `Tone.Sequence` instead of `setTimeout` for audio-accurate scheduling
- **Dynamic Sound Loading**: All drum sounds are loaded from `/api/sounds/default` endpoint with both synthesized and sample-based sounds
- **API-Based Audio**: `DrumSoundsAPI` class manages sound initialization, loading, and playback from database configurations
- **Sample Management**: MP3 files are loaded via API configuration with automatic fallback to synthesis if samples fail to load

### Sound Configuration
- **Database-Driven**: Sound packs, individual sounds, and their parameters are stored in SQLite database
- **Synthesis Parameters**: Tone.js synthesis configurations stored as JSON in database
- **Sample Integration**: File paths for audio samples stored in database with automatic loading
- **Default Pack**: System includes a default synthesis pack with standard drum sounds

### State Management
- **Pattern State**: 8×16 boolean array for step programming, plus volume/mute arrays
- **Ref Management**: Uses `useRef` for audio-critical state (`currentStepRef`, `patternRef`) to avoid React rendering delays during playback
- **Real-time Updates**: Pattern changes (volume, mute, steps) update immediately during playback via ref synchronization
- **Dynamic Sound Names**: Sound names are loaded asynchronously after API initialization

### Component Structure
- **App.jsx**: Main sequencer logic, audio initialization, API sound loading, and state management
- **SequencerGrid**: 16×8 step button grid with visual feedback
- **Controls**: Transport controls (play/stop, tempo, master volume)
- **VolumeControls**: Per-track volume sliders and mute buttons
- **TrackLabels**: Static track name display

### Browser Compatibility
- **Safari Issue**: Safari has timing offset issues - the current implementation attempts to address this with Tone.js Transport
- **Chrome**: Works correctly with standard timing
- **Responsive Design**: Uses viewport units (`vw`, `vh`) for scaling across screen sizes

### API Integration
Sound management is now fully API-driven:
- **Initialization**: `DrumSoundsAPI.initialize()` fetches sound configuration from `/api/sounds/default`
- **Playback**: `drumSoundsInstance.playSound(soundName, options)` handles both synthesis and sample playback
- **Dynamic Loading**: Sound names and configurations are loaded at runtime, not hardcoded

### Key Implementation Details
- **Scheduling**: `setupToneSequence()` creates a repeating 16-step sequence using `Tone.Sequence`
- **Visual Sync**: `Tone.Draw.schedule()` ensures UI updates align with audio timing
- **State Persistence**: Pattern state persists during tempo/volume changes via `patternRef.current`
- **Cleanup**: Proper disposal of Tone.js objects on component unmount and playback stop
- **API Initialization**: Drum sounds API is initialized early in app lifecycle to ensure sounds are available for playback