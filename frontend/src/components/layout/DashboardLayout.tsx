import { type ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopKPIBar from './TopKPIBar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Floating sidebar */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopKPIBar />
                <main className="flex-1 overflow-y-auto p-5">
                    {children}
                </main>
            </div>
        </div>
    )
}
