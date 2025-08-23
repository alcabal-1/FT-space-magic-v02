import React from 'react'
import { motion } from 'framer-motion'
import Tower3D from './components/Tower3D'
import './App.css'

function App3D() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-frontier-900">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-frontier-500/10 via-transparent to-frontier-700/10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-frontier-400/10 via-transparent to-transparent"></div>
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen">
        <motion.div
          className="w-full h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Tower3D />
        </motion.div>
      </div>
      
      {/* Frontier branding */}
      <motion.div 
        className="fixed bottom-4 right-4 text-frontier-400 text-sm font-medium pointer-events-none z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        Frontier Tower Intelligence • 3D Live
      </motion.div>
    </div>
  )
}

export default App3D