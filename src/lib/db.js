/* Capa local: IndexedDB vía Dexie. Es la fuente de verdad del dispositivo. */
import Dexie from 'dexie'

export const db = new Dexie('tiendapro')

db.version(1).stores({
  productos: 'id, nombre, categoria, archivado, updatedAt',
  categorias: 'id, nombre',
  lotes: 'id, productoId, updatedAt',
  ventas: 'id, fecha, anulada, updatedAt',
  compras: 'id, productoId, fecha, updatedAt',
  cajaMovs: 'id, deviceId, fecha, updatedAt',
  arqueos: 'id, deviceId, fecha, updatedAt',
  patrimonioMovs: 'id, fecha, updatedAt',
  ajustes: 'id, productoId, fecha, updatedAt',
  auditoria: 'id, fecha',
  periodos: 'id, inicio',
  traslados: 'id, fecha, updatedAt',
  config: 'id',
  meta: 'key',
  pendientes: '++seq, tipo, refId'
})

/* Reglas de escritura: toda entidad lleva createdAt, updatedAt (ms),
   userId, userName y deviceId para auditoría y merge. */

export const TABLAS_SYNC = [
  'productos', 'categorias', 'lotes', 'ventas', 'compras',
  'cajaMovs', 'arqueos', 'patrimonioMovs', 'ajustes', 'periodos', 'traslados', 'auditoria'
]

export async function getConfig() {
  let c = await db.config.get('local')
  if (!c) {
    c = {
      id: 'local',
      nombre: 'Mi Tienda',
      moneda: '',
      tema: 'light',
      iva: 0,
      redondeo: 0,
      mayoristaActivo: false,
      periodoInicio: Date.now(),
      capitalInicial: 0,
      logo: '',
      permitirStockNegativo: false,
      stockBajoDefault: 5
    }
    await db.config.put(c)
  }
  return c
}

export async function setConfig(parche) {
  const c = await getConfig()
  Object.assign(c, parche, { updatedAt: Date.now() })
  await db.config.put(c)
  return c
}

export async function getMeta(key, def = null) {
  const r = await db.meta.get(key)
  return r ? r.value : def
}

export async function setMeta(key, value) {
  await db.meta.put({ key, value })
}
