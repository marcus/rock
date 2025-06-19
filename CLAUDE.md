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
- **Effects System**: Integrated audio effects chain supporting reverb, delay, bitcrush, and filtering with real-time parameter control

### Sound Configuration

- **Database-Driven**: Sound packs, individual sounds, and their parameters are stored in SQLite database
- **Synthesis Parameters**: Tone.js synthesis configurations stored as JSON in database
- **Sample Integration**: File paths for audio samples stored in database with automatic loading
- **Default Pack**: System includes a default synthesis pack with standard drum sounds
- **Dynamic Loading**: New sounds can be added at runtime via `DrumSoundsAPI.addSound()`
- **AI Sound Generation**: ElevenLabs integration for creating custom drum sounds via text prompts

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
- **Sound Generation**: `POST /api/sounds/generate` creates AI-generated sounds via ElevenLabs API

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
- AI-generated sound filtering and creation
- Clean, accessible UI with keyboard navigation

#### SoundGenerationModal

- AI-powered sound creation interface using ElevenLabs API
- Prompt input with 300-character limit and real-time validation
- Duration slider (0.5-1.5 seconds) for sound length control
- Audio preview and accept/reject workflow
- Integration with existing sound pack system

### Database Schema

The application uses SQLite with the following key tables:

- `sounds`: Individual drum sounds with synthesis parameters or sample paths, includes `is_generated` and `prompt` fields for AI-generated sounds
- `sound_packs`: Collections of sounds (default pack system)
- `sound_packs_sounds`: Many-to-many relationship between packs and sounds (NO sound_pack_id column in sounds table)
- `categories`: Sound categorization including "Generated" category for AI-created sounds

**IMPORTANT**: The `sounds` table does NOT have a `sound_pack_id` column. Sound pack relationships are managed via the `sound_packs_sounds` join table.

### Audio Effects System

The application features a comprehensive effects chain system for per-track audio processing:

#### Effects Architecture

- **Dual Signal Path**: Maintains separate dry/wet signal chains for effect routing
- **Lazy Initialization**: Effects are only initialized when first used (when parameters are non-default)
- **Real-time Parameter Control**: All effect parameters can be adjusted in real-time during playback
- **Smooth Transitions**: Uses `rampTo()` instead of `setValueAtTime()` for zipper-noise-free parameter changes
- **Automatic Cleanup**: Temporary effect instances are properly disposed after use

#### Available Effects

1. **Gain Control**: 
   - Range: -60dB to +12dB
   - Applied as linear gain multiplier to track volume

2. **Pitch Shifting**:
   - Range: -24 to +24 semitones
   - Applied as playback rate modification for samples, frequency adjustment for synthesis

3. **Low-pass Filter**:
   - Cutoff: 20Hz to 20kHz
   - Resonance (Q): 0.1 to 10.0
   - Applied to both dry and wet signal paths

4. **Reverb Send**:
   - Send Level: 0.0 to 1.0
   - Uses `ReverbNode` class with impulse response convolution
   - Shared reverb bus for all tracks

5. **Delay Send**:
   - Delay Time: 0.01 to 1.0 seconds
   - Feedback: 0.0 to 0.95
   - Send Level: 0.0 to 1.0
   - Uses `DelaySendNode` class with feedback loop

6. **Bitcrush**:
   - Sample Rate: 1kHz to 44.1kHz
   - Bit Depth: 1 to 16 bits
   - Applied when values differ from 44.1kHz/16-bit defaults

#### Effects Implementation Pattern

**For adding new effects, follow this established pattern:**

1. **Create Effect Node Class** (`src/utils/audio/EffectNode.js`):
   ```javascript
   export class EffectNode {
     constructor(options = {}) {
       this.input = new Tone.Gain(1)
       this.output = new Tone.Gain(1)
       // Handle nested settings structure
       const effectOpts = options.effect_name || {}
       this.options = {
         param1: effectOpts.param1 ?? options.param1 ?? defaultValue,
         // ... other parameters
       }
     }
     
     async initialize() { /* setup audio nodes */ }
     
     // Getters/setters with rampTo for smooth transitions
     set param1(value) {
       this.options.param1 = clampValue(value)
       if (this.audioNode) {
         this.audioNode.param.rampTo(this.options.param1, 0.02)
       }
     }
     
     dispose() { /* cleanup */ }
     connect(destination) { /* chaining */ }
   }
   ```

2. **Integrate into DrumSoundsAPI**:
   - Import the effect class
   - Add instance and initialization flag to constructor
   - Create `initializeEffect()` method
   - Add lazy initialization check in `playSoundScheduled()`
   - Integrate into both `connectPersistentSynthWithEffects()` and `playSampleScheduled()` effects chains

3. **Add UI Controls** in `TrackSettingsModal.jsx`:
   - Add effect parameters to default settings objects
   - Create handler functions following existing pattern
   - Add UI sliders and controls
   - Ensure proper null checking with optional chaining

4. **Settings Data Structure**:
   ```javascript
   trackSettings = {
     gain_db: 0,
     pitch_semitones: 0,
     filter: { cutoff_hz: 20000, resonance_q: 0.7 },
     reverb_send: 0,
     delay_send: { delay_time: 0.25, feedback: 0.3, wet_level: 0 },
     bitcrush: { sample_rate: 44100, bit_depth: 16 },
     // new_effect: { param1: defaultValue, param2: defaultValue }
   }
   ```

#### Effects Chain Routing

- **Sample Path**: `Tone.Player → Effects Chain → Delay → Reverb → Master Output`
- **Synthesis Path**: `Synth → Effects Chain → Delay → Reverb → Master Output`
- **Dry/Wet Routing**: Effects support parallel dry/wet processing for reverb integration
- **Effect Order**: Bitcrush → Filter → Delay → Reverb (in effects chain)

### Performance Considerations

- **Lazy Loading**: Sounds are only loaded when added to the sequencer
- **Memory Management**: Proper cleanup of Tone.js objects and event listeners
- **Efficient Rendering**: Uses React keys and memoization where appropriate
- **Audio Optimization**: Persistent Tone.Player instances for samples to avoid latency
- **Effects Optimization**: Effects are only created when needed and automatically cleaned up


## Component Architecture Analysis

### Current Structure Overview

**Main App Components:**
- **App.jsx**: Core sequencer logic, audio initialization, state management via Zustand
- **TrackManager.jsx**: Dynamic track list with step grids, track controls, and modal integration
- **SoundSelector.jsx**: Modal for sound selection with filtering and AI generation integration
- **TrackSettingsModal.jsx**: Per-track audio effect settings (gain, pitch, filter, reverb send, delay send, bitcrush)
- **SoundGenerationModal.jsx**: AI sound creation interface
- **Controls.jsx**: Transport controls (play/stop, tempo, clear)
- **MasterVolumeControl.jsx**: Global volume and mute controls
- **OrientationPrompt.jsx**: Mobile orientation guidance

### Layout Architecture

**Desktop Layout:**
```
[Logo] [Play] [Tempo] [Clear] [Master Vol]
         [Track Manager Grid]
```

**Current Mobile Issues:**
- Controls overlap or stack vertically on landscape mobile
- Grid doesn't fit container properly on iPhone 15 Pro landscape
- Track names wrap instead of truncating
- Modal fonts too large for mobile screens
- Inconsistent modal centering

### Modal System

**Current Modals (3 separate implementations):**
1. **SoundSelector**: Uses `.sound-selector-overlay` + `.sound-selector-modal`
2. **TrackSettingsModal**: Uses `.modal-overlay` + `.modal-content`
3. **SoundGenerationModal**: Uses `.sound-generation-overlay` + `.sound-generation-modal`

**Problems:**
- Inconsistent styling across modals
- Different responsive behavior
- Duplicated CSS for similar functionality
- Modal fonts not optimized for mobile

### Mobile Layout Requirements

**Landscape Mobile (Priority):**
- Header: Logo + Controls + Master Volume in single horizontal row
- Grid: Maximum space allocation with minimal padding
- Track labels: Truncate text, no wrapping
- Modals: Smaller fonts, more compact layout

**Responsive Breakpoints:**
- Mobile Portrait: `@media (max-width: 768px) and (orientation: portrait)`
- Mobile Landscape: `@media (max-width: 1024px) and (orientation: landscape)`

### Design ###
- Use a pop art design and colors inspired by Roy Lichtenstein.
- Do not use emoji anywhere in the design unless explicitly requested.