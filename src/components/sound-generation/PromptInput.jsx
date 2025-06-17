function PromptInput({ value, onChange, disabled = false }) {
  const maxLength = 300
  const remainingChars = maxLength - value.length

  return (
    <div className='form-group'>
      <label htmlFor='prompt-input'>SOUND DESCRIPTION:</label>
      <textarea
        id='prompt-input'
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe the sound you want to generate... (e.g., 'Deep punchy kick drum with sub bass', 'Crisp snare with tight reverb')"
        maxLength={maxLength}
        rows={4}
        disabled={disabled}
        style={{
          resize: 'vertical',
          minHeight: '100px',
        }}
      />
      <div className='char-count'>{remainingChars} characters remaining</div>
      <style>{`
        .char-count {
          font-size: clamp(0.6rem, 0.7vw, 0.7rem);
          color: ${remainingChars < 50 ? '#dc2626' : '#6b7280'};
          font-weight: normal;
          font-family: 'Roboto', sans-serif;
          font-stretch: 75%;
          margin-top: 0.3vh;
          text-align: right;
        }

        textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        textarea:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default PromptInput
