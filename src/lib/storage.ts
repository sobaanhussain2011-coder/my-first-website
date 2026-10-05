import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings, StoredDocument } from '@/types/passport'

interface PassportDB extends DBSchema {
  documents: {
    key: string
    value: StoredDocument
    indexes: {
      'by-created': string
      'by-name': string
      'by-passport': string
    }
  }
  settings: {
    key: string
    value: AppSettings & { id: string }
  }
}

const DB_NAME = 'passport-scanner-local'
const DB_VERSION = 1
const SETTINGS_KEY = 'app-settings'

const DEFAULT_SETTINGS: AppSettings = {
  maxUploadMb: 15,
  autoLockMinutes: 15,
  pinEnabled: false,
  showPartialPassportNumber: true,
}

let dbPromise: Promise<IDBPDatabase<PassportDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PassportDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // All passport Excel files and metadata stay in the browser IndexedDB.
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' })
          store.createIndex('by-created', 'createdAt')
          store.createIndex('by-name', 'personName')
          store.createIndex('by-passport', 'passportNumber')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const db = await getDb()
  const docs = await db.getAllFromIndex('documents', 'by-created')
  return docs.reverse()
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  const db = await getDb()
  return db.get('documents', id)
}

export async function saveDocument(doc: StoredDocument): Promise<void> {
  const db = await getDb()
  await db.put('documents', doc)
}

export async function updateDocument(
  id: string,
  patch: Partial<Pick<StoredDocument, 'fileName' | 'personName' | 'updatedAt'>>,
): Promise<StoredDocument | undefined> {
  const db = await getDb()
  const existing = await db.get('documents', id)
  if (!existing) return undefined
  const updated: StoredDocument = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  }
  await db.put('documents', updated)
  return updated
}

/** Permanently removes the Excel blob and associated extracted metadata. */
export async function deleteDocument(id: string): Promise<boolean> {
  const db = await getDb()
  const existing = await db.get('documents', id)
  if (!existing) return false
  await db.delete('documents', id)
  return true
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const row = await db.get('settings', SETTINGS_KEY)
  if (!row) return { ...DEFAULT_SETTINGS }
  const { id: _id, ...settings } = row
  return { ...DEFAULT_SETTINGS, ...settings }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { ...settings, id: SETTINGS_KEY })
}

export async function countDocuments(): Promise<number> {
  const db = await getDb()
  return db.count('documents')
}

export async function countDocumentsCreatedToday(): Promise<number> {
  const docs = await listDocuments()
  const today = new Date().toISOString().slice(0, 10)
  return docs.filter((d) => d.createdAt.startsWith(today)).length
}

/** Hash a PIN with PBKDF2 — used only for optional local unlock. */
export async function hashPin(pin: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder()
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
  const saltOut = btoa(String.fromCharCode(...salt))
  return { hash, salt: saltOut }
}

export async function verifyPin(pin: string, settings: AppSettings): Promise<boolean> {
  if (!settings.pinEnabled || !settings.pinHash || !settings.pinSalt) return true
  const { hash } = await hashPin(pin, settings.pinSalt)
  return hash === settings.pinHash
}

export { DEFAULT_SETTINGS }
