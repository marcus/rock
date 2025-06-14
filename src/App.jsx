import { useEffect, useRef, useCallback } from 'react'
import './App.css'
import TrackManager from './components/TrackManager'
import Controls from './components/Controls'
import MasterVolumeControl from './components/MasterVolumeControl'
import { initAudio } from './utils/audioUtils'
import { drumSoundsInstance } from './utils/audio/DrumSoundsAPI'
import useAppStore from './store/useAppStore'
import * as Tone from 'tone'

function App() {
  // Zustand store state and actions
  const {
    tracks,
    pattern,
    isPlaying,
    currentStep,
    tempo,
    masterVolume,
    masterMuted,
    addTrack,
    removeTrack,
    toggleStep,
    clearPattern,
    updateTempo,
    updateMasterVolume,
    toggleMasterMute,
    updateTrackVolume,
    toggleMute,
    setIsPlaying,
    setCurrentStep,
    initializeApp
  } = useAppStore()

  // Audio refs
  const audioContextRef = useRef(null)
  const masterGainRef = useRef(null)
  const currentStepRef = useRef(0)
  const isPlayingRef = useRef(false)
  const patternRef = useRef(pattern)
  const toneSequenceRef = useRef(null)
  const tracksRef = useRef([])

  // Initialize app with default tracks
  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  // Sync refs with state
  useEffect(() => {
    isPlayingRef.current = isPlaying
    if (!isPlaying) {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      
      if (toneSequenceRef.current) {
        toneSequenceRef.current.dispose()
        toneSequenceRef.current = null
      }
    }
  }, [isPlaying])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      if (toneSequenceRef.current) {
        toneSequenceRef.current.dispose()
      }
    }
  }, [])

  // Track management handlers
  const handleAddTrack = async (soundData) => {
    return await addTrack(soundData)
  }

  const handleRemoveTrack = (trackIndex) => {
    removeTrack(trackIndex)
  }

  const playStep = useCallback((step, time) => {
    if (!audioContextRef.current || !masterGainRef.current || tracksRef.current.length === 0) return
    
    const currentPattern = patternRef.current
    const currentTracks = tracksRef.current
    
    for (let trackIndex = 0; trackIndex < currentTracks.length; trackIndex++) {
      if (currentPattern.steps[trackIndex]?.[step] && !currentPattern.muted[trackIndex]) {
        const track = currentTracks[trackIndex]
        if (track) {
          // Generate the sound key for this track
          const soundKey = drumSoundsInstance.getDrumKey(track.drum_type, track.id)
          const volume = currentPattern.volumes[trackIndex] || 0.8
          
          // Use the scheduled playback method for precise timing
          drumSoundsInstance.playSoundScheduled(soundKey, volume, time)
        }
      }
    }
  }, [])

  const setupToneSequence = useCallback(() => {
    // Clean up existing sequence
    if (toneSequenceRef.current) {
      toneSequenceRef.current.dispose()
    }

    // Create Tone.js sequence that runs every 16th note
    toneSequenceRef.current = new Tone.Sequence((time, step) => {
      // Schedule audio playback at the exact time
      playStep(step, time)
      
      // Schedule UI updates separately using Tone.Draw for visual feedback
      Tone.Draw.schedule(() => {
        currentStepRef.current = step
        setCurrentStep(step)
      }, time)
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n")

    toneSequenceRef.current.start(0)
  }, [playStep, setCurrentStep])

  const togglePlayback = async () => {
    // Ensure drumSoundsInstance is initialized before playback
    if (!drumSoundsInstance.isInitialized) {
      await drumSoundsInstance.initialize()
    }
    
    // Configure Tone.js for optimal timing after user gesture
    if (Tone.context.state === 'suspended') {
      await Tone.start()
    }
    
    // Configure Tone.js for tighter timing in Safari
    if (Tone.Transport.lookAhead > 0.05) {
      Tone.Transport.lookAhead = 0.05
    }
    
    if (!audioContextRef.current) {
      const { audioContext, masterGain } = await initAudio()
      audioContextRef.current = audioContext
      masterGainRef.current = masterGain
      masterGain.gain.value = masterMuted ? 0 : masterVolume / 100
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const newIsPlaying = !isPlaying
    isPlayingRef.current = newIsPlaying
    setIsPlaying(newIsPlaying)
    
    if (newIsPlaying) {
      // Set up Tone.js transport and sequence
      Tone.Transport.bpm.value = tempo
      setupToneSequence()
      
      // Reset to step 0
      currentStepRef.current = 0
      setCurrentStep(0)
      
      // Start Tone.js transport
      Tone.Transport.start()
    } else {
      // Stop transport and clean up
      Tone.Transport.stop()
      Tone.Transport.cancel()
      
      if (toneSequenceRef.current) {
        toneSequenceRef.current.dispose()
        toneSequenceRef.current = null
      }
      
      currentStepRef.current = 0
      setCurrentStep(0)
    }
  }

  const handleTempoChange = (newTempo) => {
    updateTempo(newTempo)
    
    // Update Tone.js transport tempo if playing
    if (isPlaying) {
      Tone.Transport.bpm.value = newTempo
    }
  }

  const handleMasterVolumeChange = (volume) => {
    updateMasterVolume(volume)
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterMuted ? 0 : volume / 100
    }
  }

  const handleMasterMute = () => {
    toggleMasterMute()
    if (masterGainRef.current) {
      const newMuted = !masterMuted
      masterGainRef.current.gain.value = newMuted ? 0 : masterVolume / 100
    }
  }

  return (
    <div className="App">
      <div className="halftone-bg"></div>
      <div className="sequencer-container">
        <div className="title">
          <span className="title-shadow">ROY'S ROCK MACHINE</span>
          <h1>ROY'S ROCK MACHINE</h1>
        </div>
        
        <div className="sequencer-section">
          <Controls 
            isPlaying={isPlaying}
            tempo={tempo}
            onTogglePlayback={togglePlayback}
            onTempoChange={handleTempoChange}
            onClear={clearPattern}
          />
          
          <div className="grid-container">
            <div className="sequencer-with-master">
              <MasterVolumeControl 
                masterVolume={masterVolume}
                masterMuted={masterMuted}
                onVolumeChange={handleMasterVolumeChange}
                onToggleMute={handleMasterMute}
              />
              <TrackManager
                tracks={tracks}
                onAddTrack={handleAddTrack}
                onRemoveTrack={handleRemoveTrack}
                maxTracks={40}
                pattern={pattern.steps}
                currentStep={isPlaying ? currentStep : -1}
                onToggleStep={toggleStep}
                volumes={pattern.volumes}
                muted={pattern.muted}
                onVolumeChange={updateTrackVolume}
                onToggleMute={toggleMute}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App