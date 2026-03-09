'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import Toast, { ToastType } from './Toast'

interface ToastContextType {
  showToast: (message: string, type: ToastType, progress?: number) => void
  updateProgress: (progress: number) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
    progress?: number
  } | null>(null)

  const showToast = useCallback((message: string, type: ToastType, progress?: number) => {
    setToast({ message, type, progress })
    
    // Auto-hide success/error messages after 5 seconds
    if (type === 'success' || type === 'error') {
      setTimeout(() => setToast(null), 5000)
    }
  }, [])

  const updateProgress = useCallback((progress: number) => {
    setToast(prev => prev ? { ...prev, progress } : null)
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, updateProgress, hideToast }}>
      {children}
      
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <Toast
            message={toast.message}
            type={toast.type}
            progress={toast.progress}
            onClose={hideToast}
          />
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
