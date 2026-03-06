'use client'

import React from 'react'
import { X } from 'lucide-react'

export type ToastType = 'info' | 'success' | 'error' | 'loading'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  progress?: number
}

export default function Toast({ message, type, onClose, progress }: ToastProps) {
  const bgColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    loading: 'bg-blue-500',
  }

  return (
    <div className={`${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[320px] max-w-md`}>
      {type === 'loading' && (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
      )}
      
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {progress !== undefined && progress >= 0 && (
          <div className="mt-2 w-full bg-white/30 rounded-full h-1.5">
            <div 
              className="bg-white h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {type !== 'loading' && (
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
