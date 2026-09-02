import { create } from 'zustand'

const getInitialTheme = () => {
  const saved = localStorage.getItem('crm_theme')
  if (saved === 'dark' || saved === 'light') return saved
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }
  localStorage.setItem('crm_theme', theme)
}

export const useThemeStore = create((set, get) => {
  const initialTheme = getInitialTheme()
  applyTheme(initialTheme)

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      set({ theme: nextTheme })
    },
    setTheme: (t) => {
      applyTheme(t)
      set({ theme: t })
    },
  }
})
