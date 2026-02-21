import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'
import RightTelemetryPanel from './RightTelemetryPanel'

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const location = useLocation()
    const showTelemetry = location.pathname === '/overview'

    return (
        <div className="h-full w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
            <TopNavbar />
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 min-w-0 overflow-y-auto px-6 py-4">
                    {children}
                </main>
                {showTelemetry && <RightTelemetryPanel />}
            </div>
        </div>
    )
}
