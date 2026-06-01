const AudioContextClass = window.AudioContext || window.webkitAudioContext
let audioContext = null

function getAudioContext() {
  if (!AudioContextClass) return null
  if (!audioContext || audioContext.state === 'closed') {
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

async function playTone({ frequency = 880, type = 'triangle', duration = 350, gainValue = 0.04, attack = 0.02, release = 0.1 }) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime
    const releaseStart = Math.max(now + duration - release, now + 0.02)

    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + attack)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart)
    oscillator.stop(now + duration)
  } catch {
    // ignore if audio cannot play
  }
}

export function playToastSound() {
  playTone({ frequency: 950, type: 'triangle', duration: 260, gainValue: 0.035, attack: 0.02, release: 0.08 })
}

export function playCallbackSound() {
  playTone({ frequency: 920, type: 'sine', duration: 360, gainValue: 0.04, attack: 0.015, release: 0.1 })
}

export function playNotificationSound() {
  playTone({ frequency: 740, type: 'triangle', duration: 320, gainValue: 0.038, attack: 0.02, release: 0.09 })
}
