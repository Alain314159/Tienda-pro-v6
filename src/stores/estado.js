/* Corazón de Tienda Pro v6: estado global + lógica de negocio completa */
import { defineStore } from 'pinia'
import { db, getConfig, setConfig } from '../lib/db'
import { encolar, sync } from '../lib/sync'
import { uid, n, ahoraMs, dispositivoId, fmtFH } from '../lib/utils'
import { useUi } from './ui'

const DEV = dispositivoId()

const PERMISOS = {
  vender: ['dueno', 'empleado'], comprar: ['dueno', 'empleado'], arqueo: ['dueno', 'empleado'],
  productos: ['dueno'], reportes: ['dueno', 'lector'], patrimonio: ['dueno'],
  auditoria: ['dueno', 'lector'], ajustesMod: ['dueno'], multitienda: ['dueno'], caja: ['dueno', 'empleado', 'lector']
}

export const useEstado = defineStore('estado', {
  state: () => ({
    cargado: false, config: null,
    usuario: null, tiendaId: 'local', modoLocal: true,
    productos: [], categorias: [], lotes: [], ventas: [], compras: [],
    cajaMovs: [], arqueos: [], patrimonioMovs: [], ajustes: [], periodos: [], auditoria: []
  }),

  getters: {
    fmt: (s) => (v) => (s.config?.moneda || '') + n(v).toFixed(2),
    rol: (s) => s.usuario?.rol || 'dueno',
    puede: (s) => (p) => (PERMISOS[p] || ['dueno']).includes(s.rol),
    lotesDe: (s) => (pid) => s.lotes.filter(l => l.productoId === pid),
    stock: (s) => (pid) => s.lotes.filter(l => l.productoId === pid).reduce((t, l) => t + n(l.restante), 0),
    valorInventario: (s) => s.lotes.reduce((t, l) => t + n(l.restante) * n(l.costo), 0),
    ventasActivas: (s) => s.ventas.filter(v => !v.anulada && v.fecha >= (s.config?.periodoInicio || 0)),
    ventasPeriodo() { return this.ventasActivas.reduce((t, v) => t + n(v.total), 0) },
    comprasPeriodo: (s) => s.compras.filter(c => c.fecha >= (s.config?.periodoInicio || 0)).reduce((t, c) => t + n(c.total), 0),
    gananciaBrutaPeriodo() { return this.ventasActivas.reduce((t, v) => t + n(v.ganancia), 0) },
    mermasPeriodo: (s) => s.ajustes.filter(a => a.fecha >= (s.config?.periodoInicio || 0) && n(a.cantidad) < 0).reduce((t, a) => t + n(a.costoPerdida), 0),
    arqueoNeto: (s) => s.arqueos.filter(a => a.fecha >= (s.config?.periodoInicio || 0)).reduce((t, a) => t + n(a.diff), 0),
    gastosOpPeriodo() { return Math.max(0, this.mermasPeriodo - Math.max(0, this.arqueoNeto)) + Math.max(0, -this.arqueoNeto) },
    gananciaNetaPeriodo() { return this.gananciaBrutaPeriodo - this.gastosOpPeriodo },
    margenPeriodo() { const i = this.ventasPeriodo; return i ? Math.round((this.gananciaNetaPeriodo / i) * 100) : 0 },
    saldoCajaDe: (s) => (dev) => s.cajaMovs.filter(m => m.deviceId === dev).reduce((t, m) => t + (m.tipo === 'ingreso' ? n(m.monto) : -n(m.monto)), 0),
    saldoCaja() { return this.saldoCajaDe(DEV) },
    saldoCajaTotal() { return this.cajaMovs.reduce((t, m) => t + (m.tipo === 'ingreso' ? n(m.monto) : -n(m.monto)), 0) },
    aportesTotal: (s) => s.patrimonioMovs.filter(m => m.tipo === 'Aporte').reduce((t, m) => t + n(m.monto), 0),
    retirosTotal: (s) => s.patrimonioMovs.filter(m => m.tipo === 'Retiro').reduce((t, m) => t + n(m.monto), 0),
    capitalTotal() { return n(this.config?.capitalInicial) + this.aportesTotal },
    gananciasAcumuladas() { return this.periodos.reduce((t, p) => t + n(p.ganancia), 0) + this.gananciaNetaPeriodo },
    patrimonioTotal() { return this.capitalTotal + this.gananciasAcumuladas },
    gananciaDisponible() { return this.gananciasAcumuladas - this.retirosTotal },
    productosAgotados: (s) => s.productos.filter(p => !p.archivado && s.stock(p.id) <= 0),
    productosBajoStock: (s) => s.productos.filter(p => !p.archivado && s.stock(p.id) > 0 && s.stock(p.id) <= n(p.stockBajo ?? s.config?.stockBajoDefault ?? 5)),
    mesesChart: (s) => {
      const out = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
        const ini = d.getTime(); const f = new Date(d); f.setMonth(f.getMonth() + 1); const fin = f.getTime()
        const vs = s.ventas.filter(v => !v.anulada && v.fecha >= ini && v.fecha < fin)
        out.push({ mes: d.toLocaleDateString('es', { month: 'short' }), ventas: vs.reduce((t, v) => t + n(v.total), 0), ganancia: vs.reduce((t, v) => t + n(v.ganancia), 0) })
      }
      return out
    },
    topRentables: (s) => {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0)
      const map = {}
      s.ventas.filter(v => !v.anulada && v.fecha >= d.getTime()).forEach(v => (v.items || []).forEach(it => {
        map[it.nombre] = (map[it.nombre] || 0) + (n(it.precio) - n(it.costo)) * n(it.cant)
      }))
      return Object.entries(map).map(([nombre, g]) => ({ nombre, gan: g })).sort((a, b) => b.gan - a.gan).slice(0, 5)
    },
    ultimaActividad: (s) => {
      const t = Math.max(0, ...s.ventas.map(v => v.fecha), ...s.compras.map(c => c.fecha), ...s.ajustes.map(a => a.fecha))
      return t ? fmtFH(t) : 'sin actividad aún'
    }
  },

  actions: {
    async iniciar(usuario, modoLocal) {
      this.usuario = usuario; this.modoLocal = modoLocal
      this.tiendaId = modoLocal ? 'local' : (usuario.tiendaId || 'local')
      await this.recargar(); this.cargado = true
    },
    async recargar() {
      this.config = await getConfig()
      for (const t of ['productos', 'categorias', 'lotes', 'ventas', 'compras', 'cajaMovs', 'arqueos', 'patrimonioMovs', 'ajustes', 'periodos']) {
        this[t] = await db[t].toArray()
      }
      this.auditoria = (await db.auditoria.toArray()).sort((a, b) => b.fecha - a.fecha).slice(0, 300)
    },
    async guardar(tipo, obj, auditar) {
      obj.updatedAt = ahoraMs()
      if (!obj.createdAt) obj.createdAt = obj.updatedAt
      if (!obj.userId) { obj.userId = this.usuario?.id || 'local'; obj.userName = this.usuario?.nombre || 'Local' }
      if (!obj.deviceId) obj.deviceId = DEV
      await db[tipo].put(obj)
      await encolar(tipo, obj.id, obj, this.tiendaId)
      if (auditar) await this.auditar(auditar[0], auditar[1])
      await this.recargar()
    },
    async auditar(accion, detalle) {
      const a = { id: uid('aud_'), accion, detalle, fecha: ahoraMs(), userId: this.usuario?.id || 'local', userName: this.usuario?.nombre || 'Local', deviceId: DEV }
      await db.auditoria.add(a); await encolar('auditoria', a.id, a, this.tiendaId)
      this.auditoria.unshift(a)
    },
    async pedirPin() {
      const ui = useUi()
      const pin = this.config?.pin
      if (!pin) return true
      const r = await ui.preguntar('Seguridad', 'Introduce el PIN de operaciones sensibles:')
      if (r !== pin) { ui.avisar('❌ PIN incorrecto'); return false }
      return true
    },
    async toggleTema() {
      const t = this.config.tema === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', t === 'dark')
      localStorage.setItem('tp6_tema', t)
      this.config = await setConfig({ tema: t })
    },

    /* ---------- PRODUCTOS ---------- */
    async guardarProducto(f) {
      const prev = f.id ? this.productos.find(p => p.id === f.id) : null
      const p = { ...(prev || {}), ...f, id: f.id || uid('p_'), archivado: prev?.archivado || false }
      const aud = prev && n(prev.precio) !== n(p.precio) ? ['CAMBIO_PRECIO', `${p.nombre}: ${(this.fmt)(prev.precio)} → ${(this.fmt)(p.precio)}`] : null
      await this.guardar('productos', p, aud)
    },
    async archivarProducto(id) {
      const p = this.productos.find(x => x.id === id)
      await this.guardar('productos', { ...p, archivado: !p.archivado }, ['ARCHIVO', `${p.nombre} ${p.archivado ? 'reactivado' : 'archivado'}`])
    },

    /* ---------- COMPRAS / LOTES ---------- */
    async registrarCompra(f) {
      if (f.editId) {
        const c = this.compras.find(x => x.id === f.editId)
        const lote = this.lotes.find(l => l.id === c.loteId)
        const dCant = n(f.cantidad) - n(c.cantidad)
        await this.guardar('lotes', { ...lote, inicial: n(lote.inicial) + dCant, restante: n(lote.restante) + dCant, costo: n(f.costo) }, ['EDICION_COMPRA', `${f.nombre}: ${c.cantidad}→${f.cantidad} @${f.costo}`])
        await this.guardar('compras', { ...c, cantidad: n(f.cantidad), costo: n(f.costo), total: n(f.cantidad) * n(f.costo), productoNombre: f.nombre, unidad: f.unidad })
        return
      }
      const pid = f.productoId
      const lote = { id: uid('l_'), productoId: pid, inicial: n(f.cantidad), restante: n(f.cantidad), costo: n(f.costo), fecha: ahoraMs() }
      await this.guardar('lotes', lote)
      await this.guardar('compras', { id: uid('c_'), productoId: pid, productoNombre: f.nombre, cantidad: n(f.cantidad), unidad: f.unidad, costo: n(f.costo), total: n(f.cantidad) * n(f.costo), fecha: ahoraMs(), loteId: lote.id })
      await this.guardar('cajaMovs', { id: uid('m_'), tipo: 'egreso', categoria: 'compra', concepto: 'Compra: ' + f.nombre, monto: n(f.cantidad) * n(f.costo), fecha: ahoraMs(), deviceId: DEV })
    },

    /* ---------- VENTAS (FIFO, sin stock negativo) ---------- */
    async vender(carrito, { metodo = 'efectivo', tipoVenta = 'detal' } = {}) {
      for (const it of carrito) {
        const disp = this.stock(it.productoId)
        if (n(it.cant) > disp + 1e-9) return { error: `Sin stock suficiente: ${it.nombre} (disponible ${disp})` }
        if (tipoVenta === 'mayorista') {
          const p = this.productos.find(x => x.id === it.productoId)
          if (p?.cantMinMayor && n(it.cant) < n(p.cantMinMayor)) return { error: `Mayorista de ${p.nombre} requiere mínimo ${p.cantMinMayor}` }
        }
      }
      const items = []; let total = 0, ganancia = 0
      const copia = this.lotes.map(l => ({ ...l, tmp: n(l.restante) })).sort((a, b) => a.fecha - b.fecha)
      for (const it of carrito) {
        let rest = n(it.cant); const consumo = []
        let costoUnit = 0
        for (const l of copia.filter(l => l.productoId === it.productoId && l.tmp > 0)) {
          if (rest <= 0) break
          const q = Math.min(rest, l.tmp)
          l.tmp -= q; rest -= q; costoUnit += q * n(l.costo); consumo.push({ loteId: l.id, cant: q })
        }
        costoUnit = costoUnit / n(it.cant)
        const precio = tipoVenta === 'mayorista' && it.precioMayor != null ? n(it.precioMayor) : n(it.precio)
        items.push({ productoId: it.productoId, nombre: it.nombre, unidad: it.unidad, cant: n(it.cant), precio, costo: costoUnit, consumo })
        total += precio * n(it.cant); ganancia += (precio - costoUnit) * n(it.cant)
      }
      for (const l of copia) {
        if (n(l.restante) !== l.tmp) await this.guardar('lotes', { ...this.lotes.find(x => x.id === l.id), restante: l.tmp })
      }
      const venta = { id: uid('v_'), items, total, ganancia, metodo, tipoVenta, fecha: ahoraMs(), anulada: false }
      await this.guardar('ventas', venta)
      if (metodo === 'efectivo') {
        await this.guardar('cajaMovs', { id: uid('m_'), tipo: 'ingreso', categoria: 'venta', concepto: 'Venta contado', monto: total, fecha: ahoraMs(), deviceId: DEV })
      }
      return { ok: true, venta }
    },
    async anularVenta(id) {
      if (!(await this.pedirPin())) return
      const v = this.ventas.find(x => x.id === id)
      if (!v || v.anulada) return
      for (const it of v.items) for (const c of (it.consumo || [])) {
        const l = this.lotes.find(x => x.id === c.loteId)
        if (l) await this.guardar('lotes', { ...l, restante: n(l.restante) + n(c.cant) })
      }
      if (v.metodo === 'efectivo') {
        await this.guardar('cajaMovs', { id: uid('m_'), tipo: 'egreso', categoria: 'venta', concepto: 'Anulación de venta', monto: n(v.total), fecha: ahoraMs(), deviceId: DEV })
      }
      await this.guardar('ventas', { ...v, anulada: true, anuladoPor: this.usuario?.nombre || 'Local', anuladaFecha: ahoraMs() }, ['ANULACION', `Venta ${(this.fmt)(v.total)} (${v.items.map(i => i.nombre).join(', ')})`])
    },

    /* ---------- MERMAS / AJUSTES ---------- */
    async registrarAjuste(pid, cantidad, motivo) {
      if (!(await this.pedirPin())) return
      const cant = n(cantidad); const p = this.productos.find(x => x.id === pid)
      let costoPerdida = 0
      if (cant < 0) {
        const disp = this.stock(pid)
        if (-cant > disp) { useUi().avisar('❌ No puedes ajustar más que el stock'); return }
        costoPerdida = -cant * (this.valorLotesDe(pid) / (disp || 1))
        const copia = this.lotes.filter(l => l.productoId === pid && n(l.restante) > 0).sort((a, b) => a.fecha - b.fecha)
        let rest = -cant
        for (const l of copia) { if (rest <= 0) break; const q = Math.min(rest, n(l.restante)); await this.guardar('lotes', { ...l, restante: n(l.restante) - q }); rest -= q }
      } else {
        const ultimo = this.lotes.filter(l => l.productoId === pid).sort((a, b) => a.fecha - b.fecha).pop()
        const costo = ultimo ? n(ultimo.costo) : 0
        await this.guardar('lotes', { id: uid('l_'), productoId: pid, inicial: cant, restante: cant, costo, fecha: ahoraMs() })
      }
      await this.guardar('ajustes', { id: uid('a_'), productoId: pid, productoNombre: p?.nombre, cantidad: cant, motivo, costoPerdida, fecha: ahoraMs() }, ['AJUSTE', `${p?.nombre}: ${cant > 0 ? '+' : ''}${cant} (${motivo})`])
    },
    valorLotesDe(pid) { return this.lotes.filter(l => l.productoId === pid).reduce((t, l) => t + n(l.restante) * n(l.costo), 0) },

    /* ---------- CAJA ---------- */
    async registrarArqueo(fisico) {
      const esperado = this.saldoCaja
      const diff = n(fisico) - esperado
      await this.guardar('arqueos', { id: uid('q_'), esperado, fisico: n(fisico), diff, fecha: ahoraMs() })
      if (Math.abs(diff) > 0.009) {
        await this.guardar('cajaMovs', { id: uid('m_'), tipo: diff >= 0 ? 'ingreso' : 'egreso', categoria: 'arqueo', concepto: diff >= 0 ? 'Sobrante arqueo' : 'Faltante arqueo', monto: Math.abs(diff), fecha: ahoraMs(), deviceId: DEV })
      }
      await this.auditar('ARQUEO', `Esperado ${(this.fmt)(esperado)} · Físico ${(this.fmt)(fisico)} · Diff ${(this.fmt)(diff)}`)
    },

    /* ---------- PATRIMONIO ---------- */
    async retirarGanancia(monto, nota) {
      if (!(await this.pedirPin())) return
      if (n(monto) > this.gananciaDisponible) { useUi().avisar('❌ Excede el disponible para retiro'); return }
      await this.guardar('cajaMovs', { id: uid('m_'), tipo: 'egreso', categoria: 'retiro', concepto: 'Retiro de ganancia', monto: n(monto), fecha: ahoraMs(), deviceId: DEV })
      await this.guardar('patrimonioMovs', { id: uid('pm_'), tipo: 'Retiro', monto: n(monto), nota, fecha: ahoraMs() }, ['RETIRO', (this.fmt)(monto)])
    },
    async aportarCapital(monto, nota) {
      await this.guardar('cajaMovs', { id: uid('m_'), tipo: 'ingreso', categoria: 'aporte', concepto: 'Aporte de capital', monto: n(monto), fecha: ahoraMs(), deviceId: DEV })
      await this.guardar('patrimonioMovs', { id: uid('pm_'), tipo: 'Aporte', monto: n(monto), nota, fecha: ahoraMs() }, ['APORTE', (this.fmt)(monto)])
    },
    async setCapitalInicial(monto) {
      this.config = await setConfig({ capitalInicial: n(monto) })
      await this.auditar('CAPITAL_INICIAL', (this.fmt)(monto))
    },

    /* ---------- PERÍODO ---------- */
    async cerrarPeriodo() {
      if (!(await this.pedirPin())) return
      await this.guardar('periodos', {
        id: uid('per_'), inicio: this.config.periodoInicio, fin: ahoraMs(),
        totalVentas: this.ventasPeriodo, totalCompras: this.comprasPeriodo,
        ganancia: this.gananciaNetaPeriodo, cerradoPor: this.usuario?.nombre || 'Local', fechaCierre: ahoraMs()
      }, ['CIERRE_PERIODO', `Vtas ${(this.fmt)(this.ventasPeriodo)} · Gan ${(this.fmt)(this.gananciaNetaPeriodo)}`])
      this.config = await setConfig({ periodoInicio: ahoraMs() })
      await this.recargar()
    },

    async sincronizarAhora() {
      await sync(this.tiendaId)
      await this.recargar()
    }
  }
})
