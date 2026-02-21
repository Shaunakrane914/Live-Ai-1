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
                {/* pl-6 clears the sidebar rounded-3xl corner; pr-6 matches right edge */}
                <main className="flex-1 overflow-y-auto p-6 pl-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
