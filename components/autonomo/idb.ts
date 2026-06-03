const DB_NAME = 'finanzas_autonomo';
const STORE = 'attachments';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const putAttachment = (key: string, blob: Blob): Promise<IDBValidKey> =>
  tx('readwrite', (s) => s.put(blob, key));

export const getAttachment = async (key: string): Promise<Blob | null> => {
  const result = await tx<Blob | undefined>('readonly', (s) => s.get(key));
  return result ?? null;
};

export const deleteAttachment = (key: string): Promise<undefined> =>
  tx('readwrite', (s) => s.delete(key));

export const clearAttachments = (): Promise<undefined> =>
  tx('readwrite', (s) => s.clear());

export const downloadAttachment = async (key: string, filename: string): Promise<void> => {
  const blob = await getAttachment(key);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
