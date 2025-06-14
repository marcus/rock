# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roy's Rock Machine is a browser-based drum sequencer built with React, Vite, and Tone.js. It features an 8-track, 16-step grid interface with both synthesized and sample-based audio playback.

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
- **Hybrid Audio**: Supports both synthesized sounds (Tone.js) and MP3 samples with automatic fallback
- **Sample Management**: MP3 files in `public/audio/drums/` are loaded via `SampleLoader` with preference controls in `samplePaths.js`

### State Management
- **Pattern State**: 8×16 boolean array for step programming, plus volume/mute arrays
- **Ref Management**: Uses `useRef` for audio-critical state (`currentStepRef`, `patternRef`) to avoid React rendering delays during playback
- **Real-time Updates**: Pattern changes (volume, mute, steps) update immediately during playback via ref synchronization

### Component Structure
- **App.jsx**: Main sequencer logic, audio initialization, and state management
- **SequencerGrid**: 16×8 step button grid with visual feedback
- **Controls**: Transport controls (play/stop, tempo, master volume)
- **VolumeControls**: Per-track volume sliders and mute buttons
- **TrackLabels**: Static track name display

### Browser Compatibility
- **Safari Issue**: Safari has timing offset issues - the current implementation attempts to address this with Tone.js Transport
- **Chrome**: Works correctly with standard timing
- **Responsive Design**: Uses viewport units (`vw`, `vh`) for scaling across screen sizes

### Audio File Integration
To add custom drum samples:
1. Place MP3 files in `public/audio/drums/` with names matching `SAMPLE_PATHS` in `samplePaths.js`
2. Configure `SAMPLE_PREFERENCES` to choose sample vs synthesis per track
3. The system automatically falls back to synthesis if samples aren't found

### Key Implementation Details
- **Scheduling**: `setupToneSequence()` creates a repeating 16-step sequence using `Tone.Sequence`
- **Visual Sync**: `Tone.Draw.schedule()` ensures UI updates align with audio timing
- **State Persistence**: Pattern state persists during tempo/volume changes via `patternRef.current`
- **Cleanup**: Proper disposal of Tone.js objects on component unmount and playback stop