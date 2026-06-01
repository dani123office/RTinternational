const AudioContextClass = window.AudioContext || window.webkitAudioContext
let audioContext = null

function createAudioContext() {
  if (!AudioContextClass) return null
  if (!audioContext) {
    audioContext = new AudioContextClass()
  }

  if (audioContext.state === 'suspended') {
    const resume = () => {
      audioContext?.resume().catch(() => {})
      document.removeEventListener('click', resume)
    }
    document.addEventListener('click', resume, { once: true })
  }

  return audioContext
}

async function playTone({ frequency = 880, type = 'triangle', duration = 350, gainValue = 0.04 }) {
  const ctx = createAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = gainValue
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()

    setTimeout(() => {
      oscillator.stop()
    }, duration)
  } catch {
    // ignore if audio cannot play
  }
}

export function playToastSound() {
  playTone({ frequency: 880, type: 'triangle', duration: 320, gainValue: 0.04 })
}

export function playCallbackSound() {
  playTone({ frequency: 880, type: 'sine', duration: 450, gainValue: 0.05 })
}

export function playNotificationSound() {
  playTone({ frequency: 660, type: 'square', duration: 500, gainValue: 0.05 })
}
