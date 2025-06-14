# Audio Samples for Roy's Rock Machine

## Adding Your MP3 Files

Place your drum sample MP3 files in this directory structure:

```
public/audio/
├── drums/
│   ├── kick.mp3           # Kick drum sample
│   ├── snare.mp3          # Snare drum sample  
│   ├── hihat-closed.mp3   # Closed hi-hat sample
│   ├── hihat-open.mp3     # Open hi-hat sample
│   ├── crash.mp3          # Crash cymbal sample
│   └── clap.mp3           # Hand clap sample
├── samples/               # Additional samples for future use
└── fx/                    # Sound effects for future use
```

## How It Works

1. **Automatic Loading**: The app will automatically try to load MP3 files from the paths defined in `src/utils/audio/samplePaths.js`

2. **Smart Fallback**: If an MP3 file isn't found, the app falls back to synthesized sounds (your current Tone.js sounds)

3. **Mix & Match**: You can have some tracks use samples and others use synthesis - it's all configurable in `samplePaths.js`

## File Requirements

- **Format**: MP3 files work best
- **Length**: 1-5 seconds per sample is ideal for drums
- **Quality**: 44.1kHz, 16-bit or higher
- **Size**: Keep files under 1MB each for fast loading

## Adding New Samples

1. Drop your MP3 files into the appropriate folders
2. Update `src/utils/audio/samplePaths.js` to reference your new files
3. Update `SAMPLE_PREFERENCES` to choose sample vs synthesis for each track

The app will automatically use your samples when they're available!