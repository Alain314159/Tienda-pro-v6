<script>
export const meta = { nombre: 'Reportes', titulo: 'Reportes', corto: 'Rep.', icono: '📈', orden: 8, rol: ['dueno', 'lector'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { cuadrePDF } from '../lib/pdf'
import { n, fmtFH, diaKey, franjaHoraria, aCSV, descargarArchivo } from '../lib/utils'

const e = useEstado()
const ui = useUi()

function toInput(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const desde = ref(toInput(e.config.periodoInicio))
const hasta = ref(toInput(Date.now()))
const desdeMs = () => new Date(desde.value + 'T00:00:00').getTime()
const hastaMs = () => new Date(hasta.value + 'T23:59:59').getTime()

const ventas = computed(() => e.ventas.filter(v => !v.anulada && v.fecha >= desdeMs() && v.fecha <= hastaMs()))
const anuladas = computed(() => e.ventas.filter(v => v.anulada && v.fecha >= desdeMs() && v.fecha <= hastaMs()))
const compras = computed(() => e.compras.filter(c => c.fecha >= desdeMs() && c.fecha <= hastaMs()))
const ajustes = computed(() => e.ajustes.filter(a => a.fecha >= desdeMs() && a.fecha <= hastaMs()))
const arqueos = computed(() => e.arqueos.filter(a => a.fecha >= desdeMs() && a.fecha <= hastaMs()))
const patri = computed(() => e.patrimonioMovs.filter(m => m.fecha >= desdeMs() && m.fecha <= hastaMs()))
const audit = computed(() => e.auditoria.filter(a => a.fecha >= desdeMs() && a.fecha <= hastaMs()))

const r = computed(() => {
  const ingresos = ventas.value.reduce((t, v) => t + n(v.total), 0)
  const cogs = ventas.value.reduce((t, v) => t + (v.items || []).reduce((s, i) => s + n(i.costo) * n(i.cant), 0), 0)
  const bruta = ingresos - cogs
  const mermas = ajustes.value.filter(a => n(a.cantidad) < 0).reduce((t, a) => t + n(a.costoPerdida), 0)
  const arqNeto = arqueos.value.reduce((t, a) => t + n(a.diff), 0)
  const gastos = mermas + Math.max(0, -arqNeto)
  const neta = bruta - gastos
  return {
    ingresos, cogs, bruta, mermas, gastos, neta,
    margenB: ingresos ? Math.round(bruta / ingresos * 100) : 0,
    margenN: ingresos ? Math.round(neta / ingresos * 100) : 0,
    numVentas: ventas.value.length, anuladas: anuladas.value.length,
    compras: compras.value.reduce((t, c) => t + n(c.total), 0)
  }
})

const porProducto = computed(() => {
  const map = {}
  ventas.value.forEach(v => (v.items || []).forEach(it => {
    const m = map[it.nombre] = map[it.nombre] || { nombre: it.nombre, vendidas: 0, ingresos: 0, costo: 0, compradas: 0, pid: it.productoId }
    m.vendidas += n(it.cant); m.ingresos += n(it.precio) * n(it.cant); m.costo += n(it.costo) * n(it.cant)
  }))
  compras.value.forEach(c => {
    const m = map[c.productoNombre] = map[c.productoNombre] || { nombre: c.productoNombre, vendidas: 0, ingresos: 0, costo: 0, compradas: 0, pid: c.productoId }
    m.compradas += n(c.cantidad)
  })
  return Object.values(map)
    .map(m => ({ ...m, ganancia: m.ingresos - m.costo, margen: m.ingresos ? Math.round((m.ingresos - m.costo) / m.ingresos * 100) : 0, stockFinal: m.pid ? e.stock(m.pid) : 0 }))
    .sort((a, b) => b.ganancia - a.ganancia)
})

const dias = computed(() => {
  const map = {}
  ventas.value.forEach(v => { const k = diaKey(v.fecha); const m = map[k] = map[k] || { dia: k, ventas: 0, ingresos: 0, ganancia: 0 }; m.ventas++; m.ingresos += n(v.total); m.ganancia += n(v.ganancia) })
  return Object.values(map).sort((a, b) => (a.dia < b.dia ? -1 : 1))
})

const franjas = computed(() => {
  const map = {}
  ventas.value.forEach(v => { const k = franjaHoraria(v.fecha); const m = map[k] = map[k] || { franja: k, ventas: 0, ingresos: 0 }; m.ventas++; m.ingresos += n(v.total) })
  return ['Mañana', 'Tarde', 'Noche', 'Madrugada'].filter(f => map[f]).map(f => map[f])
})

const caja = computed(() => ({
  saldo: e.saldoCajaTotal,
  efectivo: ventas.value.filter(v => v.metodo === 'efectivo').reduce((t, v) => t + n(v.total), 0),
  transferencias: ventas.value.filter(v => v.metodo === 'transferencia').reduce((t, v) => t + n(v.total), 0),
  compras: r.value.compras,
  arqueosDiff: arqueos.value.filter(a => Math.abs(n(a.diff)) > 0.009).length,
  arqueosTotal: arqueos.value.length
}))

function datosPDF() {
  return {
    config: e.config, desde: desdeMs(), hasta: hastaMs(), usuario: e.usuario?.nombre,
    r: r.value, productos: porProducto.value, dias: dias.value, franjas: franjas.value,
    mermas: ajustes.value.filter(a => n(a.cantidad) < 0),
    caja: caja.value,
    arqueos: arqueos.value.map((a, i) => ({ titulo: 'Arqueo ' + (i + 1), ...a })),
    patrimonio: patri.value,
    anulaciones: [
      ...anuladas.value.map(v => ({ accion: 'ANULACIÓN', fecha: v.anuladaFecha || v.fecha, detalle: 'Venta ' + e.fmt(v.total), usuario: v.anuladoPor })),
      ...audit.value.filter(a => ['AJUSTE', 'ARQUEO', 'RETIRO', 'CAMBIO_PRECIO', 'CIERRE_PERIODO'].includes(a.accion))
        .map(a => ({ accion: a.accion, fecha: a.fecha, detalle: a.detalle, usuario: a.userName }))
    ]
  }
}
function exportarPDF() { cuadrePDF(datosPDF()); ui.avisar('📄 PDF generado') }

function exportarCSV() {
  const filas = [
    ['REPORTE', e.config.nombre], ['DESDE', desde.value], ['HASTA', hasta.value], [],
    ['PRODUCTO', 'VENDIDAS', 'INGRESOS', 'COSTO', 'GANANCIA', 'MARGEN%', 'COMPRADAS', 'STOCK_FINAL']
  ]
  porProducto.value.forEach(p => filas.push([p.nombre, p.vendidas, p.ingresos.toFixed(2), p.costo.toFixed(2), p.ganancia.toFixed(2), p.margen, p.compradas, p.stockFinal]))
  filas.push([], ['TOTALES', r.value.numVentas, r.value.ingresos.toFixed(2), r.value.cogs.toFixed(2), r.value.neta.toFixed(2), r.value.margenN + '%'])
  descargarArchivo('reporte-' + desde.value + '-' + hasta.value + '.csv', aCSV(filas), 'text/csv')
}

function compartir() {
  const t = ['📊 REPORTE · ' + e.config.nombre, '📅 ' + desde.value + ' a ' + hasta.value, '',
    '💵 Ingresos: ' + e.fmt(r.value.ingresos), '🧾 COGS: -' + e.fmt(r.value.cogs),
    '📈 Bruta: ' + e.fmt(r.value.bruta) + ' (' + r.value.margenB + '%)',
    '🗑️ Mermas: -' + e.fmt(r.value.mermas), '✅ NETA: ' + e.fmt(r.value.neta) + ' (' + r.value.margenN + '%)',
    '🛒 Ventas: ' + r.value.numVentas + ' · Compras: ' + e.fmt(r.value.compras)].join('\n')
  const w = window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank')
  if (!w) location.href = 'https://wa.me/?text=' + encodeURIComponent(t)
}

async function cerrarPeriodo() {
  const ok = await ui.confirmar('Cerrar Período', 'Los contadores del inicio se reinician. El historial y el patrimonio se conservan. ¿Continuar?')
  if (ok) { await e.cerrarPeriodo(); ui.avisar('✅ Período cerrado') }
}

const cierres = computed(() => [...e.periodos].sort((a, b) => (b.fechaCierre || 0) - (a.fechaCierre || 0)))
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Reporte por Período</div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <label class="text-[11px] text-slate-500">Desde<input v-model="desde" type="date" class="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900" /></label>
        <label class="text-[11px] text-slate-500">Hasta<input v-model="hasta" type="date" class="block w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900" /></label>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="flex justify-between"><span>Ingresos</span><b>{{ e.fmt(r.ingresos) }}</b></div>
        <div class="flex justify-between"><span>COGS</span><b>-{{ e.fmt(r.cogs) }}</b></div>
        <div class="flex justify-between"><span>Bruta</span><b>{{ e.fmt(r.bruta) }} ({{ r.margenB }}%)</b></div>
        <div class="flex justify-between"><span>Mermas</span><b>-{{ e.fmt(r.mermas) }}</b></div>
        <div class="flex justify-between col-span-2 bg-emerald-50 dark:bg-emerald-900/40 rounded px-2"><span>NETA</span><b>{{ e.fmt(r.neta) }} ({{ r.margenN }}%)</b></div>
        <div class="flex justify-between col-span-2 text-[11px] text-slate-500"><span>Ventas: {{ r.numVentas }} ({{ r.anuladas }} anuladas)</span><span>Compras: {{ e.fmt(r.compras) }}</span></div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button class="bg-rose-600 text-white rounded-lg py-2 text-sm font-bold" @click="exportarPDF">📄 PDF</button>
        <button class="bg-emerald-600 text-white rounded-lg py-2 text-sm font-bold" @click="exportarCSV">📊 CSV</button>
        <button class="bg-blue-600 text-white rounded-lg py-2 text-sm font-bold" @click="compartir">📤 Compartir</button>
      </div>
    </div>

    <div v-if="e.rol === 'dueno'" class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Cerrar Período</div>
      <p class="text-[11px] text-slate-400">Reinicia los contadores del inicio. El historial se conserva y la ganancia se acumula al patrimonio.</p>
      <button class="w-full bg-violet-600 text-white rounded-lg py-2 font-bold" @click="cerrarPeriodo">Cerrar Período y Empezar Nuevo</button>
      <div class="text-sm font-bold mt-2">Historial de Cierres</div>
      <div class="space-y-1 text-sm">
        <div v-for="c in cierres" :key="c.id" class="flex justify-between">
          <span>Cerrado {{ fmtFH(c.fechaCierre) }} · {{ c.cerradoPor }}</span>
          <span>Vtas {{ e.fmt(c.totalVentas) }} · Gan <b>{{ e.fmt(c.ganancia) }}</b></span>
        </div>
        <div v-if="!cierres.length" class="text-slate-500">Sin cierres</div>
      </div>
    </div>
  </div>
</template>
