import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import SequencerGrid from './components/SequencerGrid'
import Controls from './components/Controls'
import TrackLabels from './components/TrackLabels'
import VolumeControls from './components/VolumeControls'
import { initAudio, drumSounds, soundNames } from './utils/audioUtils'

function App() {
  const [pattern, setPattern] = useState({
    steps: Array(8).fill().map(() => Array(16).fill(false)),
    tempo: 120,
    volumes: Array(8).fill(0.8),
    muted: Array(8).fill(false)
  })
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tempo, setTempo] = useState(120)
  const [masterVolume, setMasterVolume] = useState(80)
  
  const audioContextRef = useRef(null)
  const masterGainRef = useRef(null)
  const schedulerTimerRef = useRef(null)
  const currentStepRef = useRef(0)
  const isPlayingRef = useRef(false)
  const patternRef = useRef(pattern)

  useEffect(() => {
    const defaultPattern = { ...pattern }
    defaultPattern.steps[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
    defaultPattern.steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]
    defaultPattern.steps[2] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
    setPattern(defaultPattern)
  }, [])

  useEffect(() => {
    isPlayingRef.current = isPlaying
    if (!isPlaying) {
      clearTimeout(schedulerTimerRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  const toggleStep = (row, col) => {
    setPattern(prev => {
      const newPattern = { ...prev }
      newPattern.steps = prev.steps.map((stepRow, rowIndex) => 
        rowIndex === row 
          ? stepRow.map((step, colIndex) => colIndex === col ? !step : step)
          : [...stepRow]
      )
      return newPattern
    })
  }

  const playStep = useCallback((step) => {
    if (!audioContextRef.current || !masterGainRef.current) return
    
    const currentPattern = patternRef.current
    
    for (let track = 0; track < 8; track++) {
      if (currentPattern.steps[track][step] && !currentPattern.muted[track]) {
        const soundFunction = drumSounds[soundNames[track]]
        if (soundFunction) {
          const trackGain = audioContextRef.current.createGain()
          trackGain.gain.value = currentPattern.volumes[track]
          trackGain.connect(masterGainRef.current)
          
          soundFunction(audioContextRef.current, trackGain)
        }
      }
    }
  }, [])

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current) return
    
    playStep(currentStepRef.current)
    const nextStep = (currentStepRef.current + 1) % 16
    currentStepRef.current = nextStep
    setCurrentStep(nextStep)
    
    const stepTime = 60000 / (tempo * 4)
    schedulerTimerRef.current = setTimeout(scheduler, stepTime)
  }, [tempo, playStep])

  const togglePlayback = async () => {
    if (!audioContextRef.current) {
      const { audioContext, masterGain } = await initAudio()
      audioContextRef.current = audioContext
      masterGainRef.current = masterGain
      masterGain.gain.value = masterVolume / 100
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
    }
    
    const newIsPlaying = !isPlaying
    isPlayingRef.current = newIsPlaying
    setIsPlaying(newIsPlaying)
    
    if (newIsPlaying) {
      scheduler()
    } else {
      clearTimeout(schedulerTimerRef.current)
      setCurrentStep(0)
      currentStepRef.current = 0
    }
  }

  const clearPattern = () => {
    setPattern(prev => ({
      ...prev,
      steps: Array(8).fill().map(() => Array(16).fill(false))
    }))
  }

  const updateTempo = (newTempo) => {
    setTempo(newTempo)
    setPattern(prev => ({ ...prev, tempo: newTempo }))
  }

  const updateMasterVolume = (volume) => {
    setMasterVolume(volume)
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume / 100
    }
  }

  const updateTrackVolume = (track, volume) => {
    setPattern(prev => ({
      ...prev,
      volumes: prev.volumes.map((vol, index) => 
        index === track ? volume / 100 : vol
      )
    }))
  }

  const toggleMute = (track) => {
    setPattern(prev => ({
      ...prev,
      muted: prev.muted.map((muted, index) => 
        index === track ? !muted : muted
      )
    }))
  }

  return (
    <div className="App">
      <div className="halftone-bg"></div>
      <div className="sequencer-container">
        <div className="title">
          <span className="title-shadow">ROY'S ROCK MACHINE</span>
          <h1>ROY'S ROCK MACHINE</h1>
        </div>
        
        <Controls 
          isPlaying={isPlaying}
          tempo={tempo}
          masterVolume={masterVolume}
          onTogglePlayback={togglePlayback}
          onTempoChange={updateTempo}
          onVolumeChange={updateMasterVolume}
          onClear={clearPattern}
        />
        
        <div className="grid-container">
          <TrackLabels />
          <SequencerGrid 
            pattern={pattern.steps}
            currentStep={isPlaying ? currentStep : -1}
            onToggleStep={toggleStep}
          />
          <VolumeControls 
            volumes={pattern.volumes}
            muted={pattern.muted}
            onVolumeChange={updateTrackVolume}
            onToggleMute={toggleMute}
          />
        </div>
      </div>
    </div>
  )
}

export default App