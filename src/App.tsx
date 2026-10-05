import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ScanPage } from '@/pages/ScanPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
