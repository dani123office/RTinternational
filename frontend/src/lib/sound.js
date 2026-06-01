// There are two distinct notification sounds in public/sounds:
// - notification.mp3: used for callback alerts
// - not.mp3: used for general notifications and toast messages
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
  // callback tone intentionally uses the longer notification file
  playSound('notification.mp3')
}

export function playNotificationSound() {
  playSound('not.mp3')
}

export function playToastSound() {
  playSound('not.mp3')
}
