import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './flow.css'
import './landing.css'
import './commercial.css'
import './score-animation.css'
import './history.css'
import './evidence.css'
import './gaps.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
)
