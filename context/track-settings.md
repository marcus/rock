# Track Settings Modal with localStorage Persistence

## Feature Overview

When the user clicks a track name in the sequencer UI, a modal should appear allowing the user to adjust:

* **Gain** (in dB)
* **Pitch** (in semitones)
* **Filter Cutoff Frequency** (Hz)
* **Filter Resonance Q** (unitless)

These settings should be:

* **Persisted to localStorage** per track
* **Loaded with the rest of track data** on app startup
* **Applied to sample playback** (if real-time rendering is supported)

---

### 1. Track Data Structure in localStorage

Extend your current per-track data in localStorage to include:

```ts
interface TrackSettings {
  gain_db: number;           // e.g., -6.0
  pitch_semitones: number;   // e.g., 1.5
  filter: {
    cutoff_hz: number;       // e.g., 8000
    resonance_q: number;     // e.g., 0.7
  };
}

interface Track {
  id: string;
  name: string;
  sampleId: string;
  // existing fields...
  settings?: TrackSettings;
}
```

Update any serialization/deserialization logic to read/write these fields.

---

### 2.  UI: Modal Trigger

In the `TrackLabel` or similar component:

```jsx
<span onClick={() => setActiveTrack(track.id)}>
  {track.name}
</span>
```

Store `activeTrackId` in React state.

---

### 3.  Create Modal Component

Create a `TrackSettingsModal.jsx` component:

#### Props:

* `trackId: string`
* `trackSettings: TrackSettings`
* `onSave: (settings: TrackSettings) => void`
* `onClose: () => void`

#### UI Elements:

* **Gain Slider/Input**

  * Range: `-60` to `+12`
  * Step: `0.1`
  * Label: “Gain (dB)”

* **Pitch Slider/Input**

  * Range: `-24` to `+24`
  * Step: `0.1`
  * Label: “Pitch (semitones)”

* **Cutoff Frequency**

  * Range: `20` to `20000`
  * Step: logarithmic or `10`
  * Label: “Filter Cutoff (Hz)”

* **Resonance**

  * Range: `0.1` to `10.0`
  * Step: `0.1`
  * Label: “Filter Q”

#### Buttons:

* “Save”
* “Cancel”
