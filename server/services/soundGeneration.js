import { writeFileSync } from 'fs'
import { join } from 'path'
import { MAX_PROMPT_LENGTH, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS, DEFAULT_DURATION_SECONDS } from '../config/constants.js'

export class SoundGenerationService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required')
    }
  }

  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string')
    }
    
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less`)
    }
    
    return prompt.trim()
  }

  validateDuration(duration) {
    const numDuration = Number(duration)
    
    if (isNaN(numDuration)) {
      return DEFAULT_DURATION_SECONDS
    }
    
    if (numDuration < MIN_DURATION_SECONDS) {
      return MIN_DURATION_SECONDS
    }
    
    if (numDuration > MAX_DURATION_SECONDS) {
      return MAX_DURATION_SECONDS
    }
    
    return numDuration
  }

  async generateSound(prompt, durationSeconds = DEFAULT_DURATION_SECONDS) {
    const validatedPrompt = this.validatePrompt(prompt)
    const validatedDuration = this.validateDuration(durationSeconds)

    const requestBody = {
      text: validatedPrompt,
      duration_seconds: validatedDuration
    }

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Xi-Api-Key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`)
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer()
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `generated_${timestamp}.mp3`
    const filePath = join(process.cwd(), 'public', 'audio', filename)
    
    // Save the file
    writeFileSync(filePath, Buffer.from(audioBuffer))
    
    return {
      filename,
      filePath: `/audio/${filename}`, // Public URL path
      prompt: validatedPrompt,
      duration: validatedDuration
    }
  }
}