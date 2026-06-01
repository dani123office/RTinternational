const AudioContextClass = window.AudioContext || window.webkitAudioContext
let audioContext = null

function attachResumeHandler() {
  if (!AudioContextClass) return
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
  if (!AudioContextClass) return
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextClass()
  }
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch {
      return // browser blocks audio — bail silently
    }
  }
  if (audioContext.state !== 'running') return

  try {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime
    const durSec = duration / 1000
    const releaseStart = Math.max(now + durSec - release, now + attack + 0.01)

    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + attack)
    gain.gain.setValueAtTime(gainValue, releaseStart)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + durSec)
  } catch {
    // ignore if audio cannot play
  }
}

function playMP3(src) {
  try {
    const audio = new Audio(src)
    audio.volume = 0.3
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

function playWhatsAppSound() {
  playMP3('/sounds/notification.mp3')
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
