import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WebSocketProvider from './providers/WebSocketProvider'
import DashboardLayout from './components/layout/DashboardLayout'
import OverviewPage from './pages/OverviewPage'
import AmmPage from './pages/AmmPage'
import NodePage from './pages/NodePage'
import ZkTerminalPage from './pages/ZkTerminalPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      {/* WebSocketProvider wraps everything so all pages share live state */}
      <WebSocketProvider>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/amm" element={<AmmPage />} />
            <Route path="/node/:id" element={<NodePage />} />
            <Route path="/zk-terminal" element={<ZkTerminalPage />} />
          </Routes>
        </DashboardLayout>
      </WebSocketProvider>
    </BrowserRouter>
  )
}

export default App
