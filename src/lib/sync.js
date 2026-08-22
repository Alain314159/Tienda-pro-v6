/* Motor de sync: cola offline + push/pull con timestamps en milisegundos.
   Las ventas son inmutables; todo merge gana por updatedAt mayor. */
import { reactive } from 'vue'
import { Query, ID } from 'appwrite'
import { databases, DB_ID, COL_REG } from './appwrite'
import { db, TABLAS_SYNC, getMeta, setMeta } from './db'
import { dispositivoId, ahoraMs } from './utils'

export const estadoSync = reactive({
  online: navigator.onLine,
  pendientes: 0,
  sincronizando: false,
  ultimo: null,
  error: null
})

window.addEventListener('online', () => { estadoSync.online = true })
window.addEventListener('offline', () => { estadoSync.online = false })

export async function refrescarPendientes() {
  estadoSync.pendientes = await db.pendientes.count()
}

export async function encolar(tipo, refId, payload, tiendaId) {
  await db.pendientes.add({
    tipo, refId, tiendaId,
    payload: JSON.stringify(payload),
    createdAt: ahoraMs()
  })
  await refrescarPendientes()
}

const docKey = (t, tipo, refId) => (t + '_' + tipo + '_' + refId).replace(/[^a-zA-Z0-9._-]/g, '-')

export async function push(tiendaId) {
  const pend = await db.pendientes.toArray()
  for (const p of pend) {
    const key = docKey(p.tiendaId, p.tipo, p.refId)
    const data = {
      tiendaId: p.tiendaId, tipo: p.tipo, refId: p.refId,
      payload: p.payload, updatedAt: ahoraMs(), deviceId: dispositivoId()
    }
    try {
      await databases.createDocument(DB_ID, COL_REG, ID.custom(key), data)
    } catch (e) {
      await databases.updateDocument(DB_ID, COL_REG, key, data)
    }
    await db.pendientes.delete(p.seq)
  }
  await refrescarPendientes()
}

export async function pull(tiendaId) {
  const last = Number(await getMeta('lastSync_' + tiendaId, 0))
  const q = [Query.equal('tiendaId', tiendaId), Query.greaterThan('updatedAt', last), Query.limit(100)]
  let pagina = await databases.listDocuments(DB_ID, COL_REG, q)
  let docs = []
  while (pagina.documents.length) {
    docs = docs.concat(pagina.documents)
    if (pagina.documents.length < 100) break
    pagina = await databases.listDocuments(DB_ID, COL_REG,
      [...q, Query.cursorAfter(pagina.documents[pagina.documents.length - 1].$id)])
  }
  for (const doc of docs) {
    if (!TABLAS_SYNC.includes(doc.tipo)) continue
    const remoto = JSON.parse(doc.payload)
    const local = await db[doc.tipo].get(doc.refId)
    if (!local || (remoto.updatedAt || 0) > (local.updatedAt || 0)) {
      await db[doc.tipo].put(remoto)
    }
  }
  if (docs.length) await setMeta('lastSync_' + tiendaId, ahoraMs())
  return docs.length
}

export async function sync(tiendaId) {
  if (!tiendaId || !estadoSync.online || estadoSync.sincronizando) return 0
  estadoSync.sincronizando = true
  estadoSync.error = null
  try {
    await push(tiendaId)
    const n = await pull(tiendaId)
    estadoSync.ultimo = ahoraMs()
    return n
  } catch (e) {
    estadoSync.error = String((e && e.message) || e)
    return 0
  } finally {
    estadoSync.sincronizando = false
    await refrescarPendientes()
  }
}

export async function descubrirTiendas(userId) {
  const docs = await databases.listDocuments(DB_ID, COL_REG, [Query.equal('tipo', 'membresia'), Query.limit(100)])
  const out = []
  for (const d of docs.documents) {
    let p = {}; try { p = JSON.parse(d.payload) } catch (e2) { continue }
    if (p.userId !== userId) continue
    let nombre = 'Tienda ' + String(p.tiendaId).slice(-4)
    try {
      const t = await databases.getDocument(DB_ID, COL_REG, p.tiendaId + '_tienda')
      nombre = JSON.parse(t.payload).nombre || nombre
    } catch (e2) {}
    out.push({ id: p.tiendaId, nombre, rol: p.rol })
  }
  return out
}

export async function activarTienda(tiendaId) {
  for (const tabla of [...TABLAS_SYNC, 'auditoria']) await db[tabla].clear()
  await setMeta('lastSync_' + tiendaId, 0)
  const q = [Query.equal('tiendaId', tiendaId), Query.limit(100)]
  let pagina = await databases.listDocuments(DB_ID, COL_REG, q)
  while (pagina.documents.length) {
    for (const doc of pagina.documents) {
      if (!TABLAS_SYNC.includes(doc.tipo) && doc.tipo !== 'auditoria') continue
      await db[doc.tipo].put(JSON.parse(doc.payload))
    }
    if (pagina.documents.length < 100) break
    pagina = await databases.listDocuments(DB_ID, COL_REG, [...q, Query.cursorAfter(pagina.documents[pagina.documents.length - 1].$id)])
  }
}
