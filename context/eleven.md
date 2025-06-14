🎛️ Sound Generation Feature with ElevenLabs

Environment Assumptions
• Assumes ELEVENLABS_API_KEY is already available in the environment.

⸻

🧱 Backend Requirements

1. Database Changes

sounds Table Migration
• Add the following columns:

ALTER TABLE sounds
ADD COLUMN is_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN prompt TEXT; (no char limit)

New Category for AI/User Generated Sounds
• Add a new category to the categories table:

INSERT INTO categories (name, description, color, sort_order)
VALUES ('Generated', 'Sounds created with AI', '#8888FF', 100);

2. Configuration Constants

Create a new config file, e.g., config/constants.js, and export:

export const MAX_PROMPT_LENGTH = 300;
export const MIN_DURATION_SECONDS = 0.5;
export const MAX_DURATION_SECONDS = 1.5;
export const DEFAULT_DURATION_SECONDS = 0.5;

⸻

📤 API Integration

Add a cleanly abstracted API around sound generation with the initial implementation being ElevenLabs.

Endpoint
• URL: POST https://api.elevenlabs.io/v1/sound-generation
• Headers:

Content-Type: application/json
Xi-Api-Key: $ELEVENLABS_API_KEY

    •	Request Body:

{
"text": "Spacious braam suitable for high-impact movie trailer moments",
"duration_seconds": 0.5
}

    •	Query Params (optional):
    •	output_format: defaults to mp3_44100_128
    •	prompt_influence: defaults to 0.3
    •	Response:
    •	Returns an MP3 sound file (stream or binary buffer).

⸻

🎨 UI: SoundSelector Component Modal

Entry Point
• Add a new button in the SoundSelector.jsx modal:

[+] Create a New Sound

State Flow

Step 1: Sound Prompt UI
• Button reveals:
• Prompt input (<textarea>), max 300 characters
• Duration slider: 0.5–1.5 seconds (<input type="range">)
• Submit button (shows spinner on generation)

Step 2: Preview
• Upon successful generation:
• Play the preview audio (<audio controls>)
• Options:
• “Add to Track”
• “Reject and Try Again”
• “Cancel” (return to regular list view)

Step 3: Accept / Reject Behavior
• Accept:
• Sound added to track list
• Modal closes
• Reject:
• Keeps prompt textarea with value pre-filled
• Disables “Submit” until prompt is changed
• Allows another generation cycle

Step 4: Cancel
• Closes generation UI and returns to standard sound list

⸻

🔍 Filtering
• Add UI and logic to filter the sound list:
• Include category/tag filtering
• Filter by is_generated = TRUE to separate AI/user-generated sounds

⸻

🧼 React Architecture Guidelines
• Use zustand for state management
• Split modal into clean subcomponents or simlar - we want this to stay as organized as possible:

<SoundGenerationModal>
  <PromptInput />
  <DurationSlider />
  <SubmitButton />
  <AudioPreview />
  <AcceptRejectControls />
</SoundGenerationModal>

    •	Use local state to handle:
    •	prompt
    •	duration
    •	isLoading
    •	soundUrl
    •	error
    •	hasBeenRejected
    •	Validate prompt length in UI before submitting (max 300 characters)

⸻

📁 File Storage
• Save generated MP3 files in:

public/audio/

    •	Use a unique filename scheme, e.g.:

public/audio/generated\_<timestamp>.mp3

⸻

✅ Summary of Required Tasks

Backend
• Add is_generated and prompt columns to sounds
• Add category row for “Generated”
• Save uploaded MP3s to public/audio/
• Create API route to generate and store sounds via ElevenLabs

Frontend
• Add “Create Sound” button in SoundSelector
• Implement modal UI for:
• Prompt input
• Duration slider
• Submit / preview / accept / reject flow
• Wire up ElevenLabs API integration
• Store prompt and MP3 path on submission
• Add filters for generated sounds
• Keep component structure clean and modular

⸻
