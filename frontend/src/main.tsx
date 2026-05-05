import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'

const storedTheme = localStorage.getItem("invoice_manager_theme");
if (storedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
  if (!storedTheme) {
    localStorage.setItem("invoice_manager_theme", "dark");
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
