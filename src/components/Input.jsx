import { forwardRef } from 'react'

export const Input = forwardRef(({
  label,
  error,
  className = '',
  ...props
}, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
        error ? 'border-red-500' : 'border-gray-200'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
))

Input.displayName = 'Input'
