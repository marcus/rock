import { render, screen, fireEvent } from '@testing-library/react'
import MasterVolumeControl from '../MasterVolumeControl'

describe('MasterVolumeControl', () => {
  const mockProps = {
    masterVolume: 80,
    masterMuted: false,
    onVolumeChange: jest.fn(),
    onToggleMute: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders master volume control with correct initial values', () => {
    render(<MasterVolumeControl {...mockProps} />)

    expect(screen.getByText('MASTER VOLUME')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('80')
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
  })

  test('calls onVolumeChange when volume slider is moved', () => {
    render(<MasterVolumeControl {...mockProps} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '60' } })

    expect(mockProps.onVolumeChange).toHaveBeenCalledWith(60)
  })

  test('calls onToggleMute when mute button is clicked', () => {
    render(<MasterVolumeControl {...mockProps} />)

    const muteButton = screen.getByRole('button', { name: 'M' })
    fireEvent.click(muteButton)

    expect(mockProps.onToggleMute).toHaveBeenCalledTimes(1)
  })

  test('displays muted state correctly', () => {
    const mutedProps = { ...mockProps, masterMuted: true }
    render(<MasterVolumeControl {...mutedProps} />)

    const muteButton = screen.getByRole('button', { name: 'M' })
    expect(muteButton).toHaveClass('muted')
  })

  test('displays unmuted state correctly', () => {
    render(<MasterVolumeControl {...mockProps} />)

    const muteButton = screen.getByRole('button', { name: 'M' })
    expect(muteButton).not.toHaveClass('muted')
  })

  test('volume slider works correctly with different values', () => {
    const { rerender } = render(<MasterVolumeControl {...mockProps} />)

    // Test with different volume values
    rerender(<MasterVolumeControl {...mockProps} masterVolume={0} />)
    expect(screen.getByRole('slider')).toHaveValue('0')

    rerender(<MasterVolumeControl {...mockProps} masterVolume={50} />)
    expect(screen.getByRole('slider')).toHaveValue('50')

    rerender(<MasterVolumeControl {...mockProps} masterVolume={100} />)
    expect(screen.getByRole('slider')).toHaveValue('100')
  })
})
