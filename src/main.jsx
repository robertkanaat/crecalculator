import React from 'react'
import ReactDOM from 'react-dom/client'
import CRECalculator from './cre-calculator.jsx'   // ← changed to hyphen + lowercase

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CRECalculator />
  </React.StrictMode>
)