const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null
let audioContext = null
let canPlay = false

function onUserInteraction() {
  if (canPlay) return
  canPlay = true
  if (!audioContext && AudioContextClass) {
    audioContext = new AudioContextClass()
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onUserInteraction, { once: true })
  document.addEventListener('touchstart', onUserInteraction, { once: true })
  document.addEventListener('pointerdown', onUserInteraction, { once: true })
  document.addEventListener('keydown', onUserInteraction, { once: true })
}

async function playTone({ frequency = 880, type = 'sine', duration = 350, gainValue = 0.04, attack = 0.003, release = 0.1 }) {
  if (!canPlay) return
  if (!AudioContextClass) return
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextClass()
  }
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch {
      return
    }
  }
  if (audioContext.state !== 'running') return

  try {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime
    const durSec = duration / 1000
    const releaseStart = Math.max(now + durSec - release, now + attack + 0.01)

    osc.type = type
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + attack)
    gain.gain.setValueAtTime(gainValue, releaseStart)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec)

    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start(now)
    osc.stop(now + durSec)
  } catch {
    // ignore
  }
}

function playWhatsAppSound() {
  playTone({ frequency: 1568, type: 'sine', duration: 120, gainValue: 0.06, attack: 0.003, release: 0.08 })
  setTimeout(() => {
    playTone({ frequency: 1318, type: 'sine', duration: 160, gainValue: 0.05, attack: 0.003, release: 0.1 })
  }, 100)
}

export function playCallbackSound() {
  playWhatsAppSound()
}

export function playNotificationSound() {
  playWhatsAppSound()
}

export function playToastSound() {
  playTone({ frequency: 1047, type: 'sine', duration: 200, gainValue: 0.08, attack: 0.003, release: 0.08 })
}
