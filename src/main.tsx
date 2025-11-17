import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import 'azure-maps-control/dist/atlas.min.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
