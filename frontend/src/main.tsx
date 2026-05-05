import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'

const storedTheme = localStorage.getItem("invoice_manager_theme");
if (storedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
