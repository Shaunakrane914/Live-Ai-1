import { createContext, useContext } from 'react'

export interface SocketContextValue {
    emit: (event: string, data?: unknown) => void
}

export const SocketContext = createContext<SocketContextValue>({
    emit: () => { },
})

export function useSocketEmit() {
    return useContext(SocketContext).emit
}

