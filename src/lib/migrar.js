/* Importa un respaldo de la v5.2 y lo convierte a v6 */
import { db, setConfig } from './db'
import { uid, n, ahoraMs, dispositivoId } from './utils'

export async function migrarV5(json) {
  const j = typeof json === 'string' ? JSON.parse(json) : json
  let np = 0, nv = 0, nc = 0

  if (j.config) {
    await setConfig({
      nombre: j.config.nombre || 'Mi Tienda',
      moneda: j.config.moneda || '',
      capitalInicial: n(j.config.capitalInicial),
      periodoInicio: n(j.config.periodoInicio) || ahoraMs(),
      pin: j.config.pin || ''
    })
  }

  const mapaP = {}
  for (const p of (j.productos || [])) {
    const id = uid('p_')
    mapaP[p.id ?? p.nombre] = id
    await db.productos.put({
      id, nombre: p.nombre, codigo: p.codigo || '', categoria: p.categoria || '',
      unidad: p.unidad || '', precio: n(p.precio), precioMayor: n(p.precioMayor),
      cantMinMayor: n(p.cantMinMayor), stockBajo: n(p.stockBajo),
      archivado: !!p.archivado, createdAt: ahoraMs(), updatedAt: ahoraMs()
    })
    np++
  }

  for (const c of (j.compras || [])) {
    const pid = mapaP[c.productoId ?? c.productoNombre] || ''
    const loteId = uid('l_')
    const inicial = n(c.cantidad)
    await db.lotes.put({ id: loteId, productoId: pid, inicial, restante: inicial, costo: n(c.costo), fecha: n(c.fecha) || ahoraMs(), updatedAt: ahoraMs() })
    await db.compras.put({ id: uid('c_'), productoId: pid, productoNombre: c.productoNombre, cantidad: inicial, unidad: c.unidad || '', costo: n(c.costo), total: n(c.total) || inicial * n(c.costo), fecha: n(c.fecha) || ahoraMs(), loteId, updatedAt: ahoraMs() })
    nc++
  }

  for (const v of (j.ventas || [])) {
    await db.ventas.put({
      id: uid('v_'),
      items: (v.items || []).map(it => ({
        productoId: mapaP[it.productoId ?? it.nombre] || '', nombre: it.nombre,
        unidad: it.unidad || '', cant: n(it.cantidad ?? it.cant),
        precio: n(it.precio), costo: n(it.costo), consumo: []
      })),
      total: n(v.total), ganancia: n(v.ganancia), metodo: v.metodo || 'efectivo',
      tipoVenta: 'detal', fecha: n(v.fecha) || ahoraMs(), anulada: !!v.anulada, updatedAt: ahoraMs()
    })
    nv++
  }

  for (const a of (j.ajustes || [])) await db.ajustes.put({ id: uid('a_'), productoId: mapaP[a.productoId ?? a.productoNombre] || '', productoNombre: a.productoNombre, cantidad: n(a.cantidad), motivo: a.motivo || '', costoPerdida: n(a.costoPerdida), fecha: n(a.fecha) || ahoraMs(), updatedAt: ahoraMs() })
  for (const m of (j.patrimonioMovs || [])) await db.patrimonioMovs.put({ id: uid('pm_'), tipo: m.tipo, monto: n(m.monto), nota: m.nota || '', fecha: n(m.fecha) || ahoraMs(), updatedAt: ahoraMs() })
  for (const m of (j.cajaMovs || [])) await db.cajaMovs.put({ id: uid('m_'), tipo: m.tipo, categoria: m.categoria || 'inicial', concepto: m.concepto, monto: n(m.monto), fecha: n(m.fecha) || ahoraMs(), deviceId: dispositivoId(), updatedAt: ahoraMs() })
  for (const c of (j.cierres || j.periodos || [])) await db.periodos.put({ id: uid('per_'), inicio: n(c.inicio), fin: n(c.fin) || n(c.fechaCierre), totalVentas: n(c.totalVentas), totalCompras: n(c.totalCompras), ganancia: n(c.ganancia), cerradoPor: c.cerradoPor || 'Migración', fechaCierre: n(c.fechaCierre) || ahoraMs(), updatedAt: ahoraMs() })

  /* Recalcula cuánto queda en cada lote: inicial menos lo vendido (FIFO por fecha) */
  const ventas = await db.ventas.toArray()
  const lotes = await db.lotes.toArray()
  const vendido = {}
  ventas.filter(v => !v.anulada).sort((a, b) => a.fecha - b.fecha)
    .forEach(v => (v.items || []).forEach(it => { vendido[it.productoId] = (vendido[it.productoId] || 0) + n(it.cant) }))
  for (const pid of Object.keys(vendido)) {
    let rest = vendido[pid]
    for (const l of lotes.filter(x => x.productoId === pid).sort((a, b) => a.fecha - b.fecha)) {
      if (rest <= 0) break
      const q = Math.min(rest, n(l.inicial))
      await db.lotes.update(l.id, { restante: n(l.inicial) - q })
      rest -= q
    }
  }

  return { productos: np, ventas: nv, compras: nc }
}
