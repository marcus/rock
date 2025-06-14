function TrackLabels() {
  const trackNames = ['KICK', 'SNARE', 'HAT-C', 'HAT-O', 'CRASH', 'CLAP', 'COWBELL', 'TOM']

  return (
    <div className='track-labels'>
      {trackNames.map((name, index) => (
        <div key={index} className='track-label'>
          {name}
        </div>
      ))}
    </div>
  )
}

export default TrackLabels
