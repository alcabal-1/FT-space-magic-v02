import React from 'react'
import { motion } from 'framer-motion'
import FloorHeatmap from './components/FloorHeatmap'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-frontier-900">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-frontier-500/5 via-transparent to-frontier-700/5"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-frontier-400/5 via-transparent to-transparent"></div>
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-7xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FloorHeatmap width={900} height={700} />
        </motion.div>
      </div>
      
      {/* Frontier branding */}
      <motion.div 
        className="fixed bottom-4 right-4 text-frontier-400 text-sm font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        Frontier Tower Intelligence
      </motion.div>
    </div>
  )
}

export default App