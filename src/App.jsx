import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from './components'
import { ToastProvider } from './components/Toast'
import { router } from './routes'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
