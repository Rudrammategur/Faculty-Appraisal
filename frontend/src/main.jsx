import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles/layout-fixes.css'
import './styles/theme.css'

// Demo code is loaded only by the Vite development server and only on request.
async function boot() {
  let Root = App
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 'approvals') {
    Root = (await import('./demo/AppraisalDemo')).default
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><Root /></React.StrictMode>
  )
}
boot().catch(error => {
  console.error('Unable to start application:', error)
  document.getElementById('root').textContent = 'Unable to load the application. Please refresh.'
})
