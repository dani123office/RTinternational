function playSound(file) {
  try {
    const audio = new Audio(`/sounds/${file}`)
    audio.volume = 1.0
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

export function playCallbackSound() {
  playSound('notification.mp3')
}

export function playNotificationSound() {
  playSound('notification.mp3')
}

export function playToastSound() {
  playSound('notification.mp3')
}
