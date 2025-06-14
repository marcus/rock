// Define paths to your audio samples
// Add your MP3 files to public/audio/drums/ and update these paths

export const SAMPLE_PATHS = {
  // Drum samples - add your MP3 files here
  kick: '/audio/drums/kick.mp3',
  snare: '/audio/drums/snare.mp3',
  hatClosed: '/audio/drums/hihat-closed.mp3',
  hatOpen: '/audio/drums/hihat-open.mp3',
  crash: '/audio/drums/crash.mp3',
  clap: '/audio/drums/clap.mp3',
  // cowbell and tom will use synthesized sounds for now

  // Additional samples you can add later
  // ride: '/audio/drums/ride.mp3',
  // rimshot: '/audio/drums/rimshot.mp3',
  // perc1: '/audio/samples/perc1.mp3',
}

// Track which instruments should prefer samples vs synthesis
export const SAMPLE_PREFERENCES = {
  kick: 'sample', // Prefer sample if available, fallback to synth
  snare: 'sample', // Prefer sample if available, fallback to synth
  hatClosed: 'sample', // Prefer sample if available, fallback to synth
  hatOpen: 'sample', // Prefer sample if available, fallback to synth
  crash: 'sample', // Prefer sample if available, fallback to synth
  clap: 'sample', // Prefer sample if available, fallback to synth
  cowbell: 'synth', // Always use synthesis
  tom: 'synth', // Always use synthesis
}
