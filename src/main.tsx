import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './flow.css'
import './landing.css'
import './commercial.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
