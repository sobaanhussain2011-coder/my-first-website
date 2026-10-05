import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppSettings,
  PassportScanResult,
  StoredDocument,
  ToastMessage,
} from '@/types/passport'
import {
  DEFAULT_SETTINGS,
  countDocuments,
  countDocumentsCreatedToday,
  deleteDocument,
  getSettings,
  listDocuments,
  saveDocument,
  saveSettings,
  updateDocument,
} from '@/lib/storage'

interface AppContextValue {
  settings: AppSettings
  documents: StoredDocument[]
  totalDocuments: number
  documentsToday: number
  loadingDocs: boolean
  unlocked: boolean
  scanResult: PassportScanResult | null
  toasts: ToastMessage[]
  refreshDocuments: () => Promise<void>
  setScanResult: (result: PassportScanResult | null) => void
  persistDocument: (doc: StoredDocument) => Promise<void>
  removeDocument: (id: string) => Promise<void>
  renameDocument: (id: string, fileName: string, personName?: string) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  unlock: () => void
  lock: () => void
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [documentsToday, setDocumentsToday] = useState(0)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [unlocked, setUnlocked] = useState(true)
  const [scanResult, setScanResult] = useState<PassportScanResult | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const refreshDocuments = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const [docs, total, today, s] = await Promise.all([
        listDocuments(),
        countDocuments(),
        countDocumentsCreatedToday(),
        getSettings(),
      ])
      setDocuments(docs)
      setTotalDocuments(total)
      setDocumentsToday(today)
      setSettings(s)
      if (s.pinEnabled) {
        const sessionOk = sessionStorage.getItem('ps-unlocked') === '1'
        setUnlocked(sessionOk)
      } else {
        setUnlocked(true)
      }
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    void refreshDocuments()
  }, [refreshDocuments])

  const persistDocument = useCallback(
    async (doc: StoredDocument) => {
      await saveDocument(doc)
      await refreshDocuments()
    },
    [refreshDocuments],
  )

  const removeDocument = useCallback(
    async (id: string) => {
      await deleteDocument(id)
      await refreshDocuments()
    },
    [refreshDocuments],
  )

  const renameDocument = useCallback(
    async (id: string, fileName: string, personName?: string) => {
      await updateDocument(id, {
        fileName,
        ...(personName !== undefined ? { personName } : {}),
      })
      await refreshDocuments()
    },
    [refreshDocuments],
  )

  const updateSettingsFn = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch }
      await saveSettings(next)
      setSettings(next)
      if (!next.pinEnabled) {
        sessionStorage.setItem('ps-unlocked', '1')
        setUnlocked(true)
      }
    },
    [settings],
  )

  const unlock = useCallback(() => {
    sessionStorage.setItem('ps-unlocked', '1')
    setUnlocked(true)
  }, [])

  const lock = useCallback(() => {
    sessionStorage.removeItem('ps-unlocked')
    setUnlocked(false)
  }, [])

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      settings,
      documents,
      totalDocuments,
      documentsToday,
      loadingDocs,
      unlocked,
      scanResult,
      toasts,
      refreshDocuments,
      setScanResult,
      persistDocument,
      removeDocument,
      renameDocument,
      updateSettings: updateSettingsFn,
      unlock,
      lock,
      pushToast,
      dismissToast,
    }),
    [
      settings,
      documents,
      totalDocuments,
      documentsToday,
      loadingDocs,
      unlocked,
      scanResult,
      toasts,
      refreshDocuments,
      persistDocument,
      removeDocument,
      renameDocument,
      updateSettingsFn,
      unlock,
      lock,
      pushToast,
      dismissToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
