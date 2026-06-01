const AudioContextClass = window.AudioContext || window.webkitAudioContext
let audioContext = null
let resumeHandlerAttached = false

function getAudioContext() {
  if (!AudioContextClass) return null
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextClass()
  }
  return audioContext
}

function attachResumeHandler() {
  if (resumeHandlerAttached || !AudioContextClass) return
  resumeHandlerAttached = true
  const resume = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }
  }
  document.addEventListener('click', resume, { once: true })
  document.addEventListener('touchstart', resume, { once: true })
  document.addEventListener('keydown', resume, { once: true })
}
attachResumeHandler()

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
    const releaseStart = Math.max(now + duration - release, now + attack + 0.01)

    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + attack)
    gain.gain.setValueAtTime(gainValue, releaseStart)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch {
    // ignore if audio cannot play
  }
}

function playWhatsAppSound() {
  playTone({ frequency: 1318, type: 'sine', duration: 180, gainValue: 0.045, attack: 0.005, release: 0.15 })
  setTimeout(() => {
    playTone({ frequency: 1108, type: 'sine', duration: 220, gainValue: 0.038, attack: 0.005, release: 0.18 })
  }, 120)
}

export function playCallbackSound() {
  playWhatsAppSound()
}

export function playToastSound() {
  playTone({ frequency: 1047, type: 'sine', duration: 200, gainValue: 0.08, attack: 0.01, release: 0.08 })
}

export function playNotificationSound() {
  playTone({ frequency: 880, type: 'sine', duration: 250, gainValue: 0.09, attack: 0.01, release: 0.1 })
  setTimeout(() => {
    playTone({ frequency: 1108, type: 'sine', duration: 200, gainValue: 0.07, attack: 0.01, release: 0.08 })
  }, 180)
}
