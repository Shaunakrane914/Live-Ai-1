import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WebSocketProvider from './providers/WebSocketProvider'
import DashboardLayout from './components/layout/DashboardLayout'
import OverviewPage from './pages/OverviewPage'
import AmmPage from './pages/AmmPage'
import NodePage from './pages/NodePage'
import ZkTerminalPage from './pages/ZkTerminalPage'
import AboutPage from './pages/AboutPage'
import './index.css'

// Full-screen intro component
function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [showText, setShowText] = useState(false)
  
  useEffect(() => {
    // Show text after brief delay
    const textTimer = setTimeout(() => setShowText(true), 300)
    // Complete after 2.5 seconds total
    const completeTimer = setTimeout(onComplete, 2500)
    return () => {
      clearTimeout(textTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-7xl font-bold text-white tracking-tight">Cipher Grid</h1>
            <p className="text-blue-400 mt-4 text-lg tracking-[0.3em] uppercase">Autonomous Energy Network</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!showIntro) {
      // Show content after intro fades
      const timer = setTimeout(() => setShowContent(true), 400)
      return () => clearTimeout(timer)
    }
  }, [showIntro])

  return (
    <BrowserRouter>
      <WebSocketProvider>
        <AnimatePresence mode="wait">
          {showIntro && (
            <IntroScreen key="intro" onComplete={() => setShowIntro(false)} />
          )}
        </AnimatePresence>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="h-full"
        >
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/amm" element={<AmmPage />} />
              <Route path="/node/:id" element={<NodePage />} />
              <Route path="/zk-terminal" element={<ZkTerminalPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </DashboardLayout>
        </motion.div>
      </WebSocketProvider>
    </BrowserRouter>
  )
}

export default App
