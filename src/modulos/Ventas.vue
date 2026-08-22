<script>
export const meta = { nombre: 'Ventas', titulo: 'Ventas', corto: 'Ventas', icono: '🛒', orden: 2, rapido: true, rol: ['dueno', 'empleado'] }
</script>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { crearScanner } from '../lib/scanner'
import { n, fmtCant, fmtFH } from '../lib/utils'

const e = useEstado()
const ui = useUi()

const busqueda = ref('')
const carrito = ref([])
const metodo = ref('efectivo')
const tipoVenta = ref('detal')
const verHistorial = ref(false)
const cobro = ref({ abierto: false, recibido: '' })
const scanAbierto = ref(false)
let scanner = null

const favs = ref(JSON.parse(localStorage.getItem('tp6_favs') || '[]'))

const lista = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return e.productos.filter(p => !p.archivado &&
    (!q || (p.nombre + ' ' + (p.codigo || '')).toLowerCase().includes(q))).slice(0, 30)
})
const historial = computed(() => [...e.ventas].sort((a, b) => b.fecha - a.fecha).slice(0, 60))

const totalCarrito = computed(() => carrito.value.reduce((t, it) => t + precioDe(it) * n(it.cant), 0))
const gananciaCarrito = computed(() => carrito.value.reduce((t, it) => t + (precioDe(it) - n(it.costo)) * n(it.cant), 0))

function precioDe(it) {
  return tipoVenta.value === 'mayorista' && it.precioMayor ? n(it.precioMayor) : n(it.precio)
}

function agregar(p) {
  const it = carrito.value.find(x => x.productoId === p.id)
  const enCarrito = it ? n(it.cant) : 0
  if (enCarrito + 1 > e.stock(p.id)) { ui.avisar('❌ Sin stock suficiente de ' + p.nombre); return }
  if (it) it.cant = n(it.cant) + 1
  else carrito.value.push({ productoId: p.id, nombre: p.nombre, unidad: p.unidad, precio: n(p.precio), precioMayor: n(p.precioMayor), costo: costoPromedio(p.id), cant: 1 })
}

function costoPromedio(pid) {
  const ls = e.lotes.filter(l => l.productoId === pid && n(l.restante) > 0)
  const u = ls.reduce((t, l) => t + n(l.restante), 0)
  return u ? ls.reduce((t, l) => t + n(l.restante) * n(l.costo), 0) / u : 0
}

function cambiarCant(it, d) {
  const nuevo = n(it.cant) + d
  if (nuevo <= 0) { carrito.value = carrito.value.filter(x => x !== it); return }
  if (nuevo > e.stock(it.productoId)) { ui.avisar('❌ Stock máximo: ' + e.stock(it.productoId)); return }
  it.cant = nuevo
}

function toggleFav(id) {
  favs.value = favs.value.includes(id) ? favs.value.filter(f => f !== id) : [...favs.value, id]
  localStorage.setItem('tp6_favs', JSON.stringify(favs.value))
}

function cambiarTipoVenta(t) {
  tipoVenta.value = t
}

function abrirCobro() {
  if (!carrito.value.length) return
  cobro.value = { abierto: true, recibido: '' }
}

async function confirmarVenta() {
  const res = await e.vender(carrito.value, { metodo: metodo.value, tipoVenta: tipoVenta.value })
  if (res.error) { ui.avisar('❌ ' + res.error); return }
  carrito.value = []
  cobro.value.abierto = false
  ui.avisar('✅ Venta registrada · ' + e.fmt(res.venta.total))
}

async function anular(id) {
  const ok = await ui.confirmar('Anular venta', 'Se devolverá el stock y se ajustará la caja. ¿Continuar?')
  if (ok) await e.anularVenta(id)
}

async function abrirScanner() {
  scanAbierto.value = true
  setTimeout(async () => {
    scanner = crearScanner('lector-codigos', (texto) => {
      const p = e.productos.find(x => (x.codigo || '') === texto.trim() && !x.archivado)
      if (p) { agregar(p); ui.avisar('➕ ' + p.nombre) } else ui.avisar('❌ Código no encontrado: ' + texto)
    })
    try { await scanner.iniciar() } catch (err) { ui.avisar('❌ No se pudo abrir la cámara') }
  }, 300)
}

async function cerrarScanner() {
  if (scanner) await scanner.detener()
  scanAbierto.value = false
}

onBeforeUnmount(() => { if (scanner) scanner.detener() })
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-2">
      <input v-model="busqueda" type="text" placeholder="🔍 Buscar producto o código…"
        class="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800" />
      <button class="bg-slate-700 text-white rounded-lg px-3" @click="abrirScanner">📷</button>
    </div>

    <div v-if="favs.length" class="flex gap-1 flex-wrap">
      <button v-for="f in favs" :key="f"
        class="text-[11px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full px-2 py-1"
        @click="agregar(e.productos.find(p => p.id === f))">
        {{ (e.productos.find(p => p.id === f) || {}).nombre || '?' }}
      </button>
    </div>

    <div v-if="e.config.mayoristaActivo" class="flex gap-2 text-sm">
      <button class="px-3 py-1 rounded-full" :class="tipoVenta === 'detal' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="cambiarTipoVenta('detal')">Detal</button>
      <button class="px-3 py-1 rounded-full" :class="tipoVenta === 'mayorista' ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="cambiarTipoVenta('mayorista')">Mayorista</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
      <div v-for="p in lista" :key="p.id" class="flex items-center gap-2 p-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold truncate">{{ p.nombre }}</div>
          <div class="text-[11px] text-slate-500">Stock {{ fmtCant(e.stock(p.id)) }} {{ p.unidad }} · {{ e.fmt(p.precio) }}</div>
        </div>
        <button class="text-amber-500" @click="toggleFav(p.id)">{{ favs.includes(p.id) ? '★' : '☆' }}</button>
        <button class="bg-blue-600 text-white rounded-lg px-3 py-1 text-sm" @click="agregar(p)">+</button>
      </div>
      <div v-if="!lista.length" class="p-3 text-sm text-slate-500">Sin coincidencias (o sin stock)</div>
    </div>

    <div v-if="carrito.length" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 space-y-2">
      <div v-for="it in carrito" :key="it.productoId" class="flex items-center gap-2 text-sm">
        <div class="flex-1 min-w-0">
          <div class="font-bold truncate">{{ it.nombre }}</div>
          <div class="text-[11px] text-slate-500">{{ e.fmt(precioDe(it)) }} × {{ fmtCant(it.cant) }} {{ it.unidad }}</div>
        </div>
        <button class="bg-slate-200 dark:bg-slate-700 rounded px-2" @click="cambiarCant(it, -1)">−</button>
        <span class="w-6 text-center">{{ it.cant }}</span>
        <button class="bg-slate-200 dark:bg-slate-700 rounded px-2" @click="cambiarCant(it, 1)">+</button>
      </div>
      <div class="flex items-center justify-between font-bold">
        <span>TOTAL</span><span>{{ e.fmt(totalCarrito) }}</span>
      </div>
      <div class="text-[11px] text-emerald-600 text-right">Ganancia: {{ e.fmt(gananciaCarrito) }}</div>
      <div class="flex gap-2 text-sm">
        <select v-model="metodo" class="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900">
          <option value="efectivo">💵 Efectivo</option>
          <option value="transferencia">🏦 Transferencia</option>
        </select>
        <button class="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-bold" @click="abrirCobro">Cobrar</button>
        <button class="px-2 text-slate-500" @click="carrito = []"></button>
      </div>
    </div>

    <button class="w-full text-sm underline text-slate-500" @click="verHistorial = !verHistorial">
      {{ verHistorial ? 'Ocultar historial' : 'Ver historial de ventas' }}
    </button>

    <div v-if="verHistorial" class="space-y-2">
      <div v-for="v in historial" :key="v.id"
        class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm text-sm"
        :class="v.anulada && 'opacity-50'">
        <div class="flex justify-between gap-2">
          <span class="truncate">{{ v.items.map(x => x.nombre + ' ×' + fmtCant(x.cant)).join(', ') }}</span>
          <span class="font-bold shrink-0">{{ e.fmt(v.total) }}</span>
        </div>
        <div class="text-[11px] text-slate-500 flex justify-between">
          <span>{{ fmtFH(v.fecha) }} · {{ v.metodo }} · +{{ e.fmt(v.ganancia) }}</span>
          <button v-if="!v.anulada" class="text-rose-600 underline" @click="anular(v.id)">Anular</button>
          <span v-else class="text-rose-600">ANULADA</span>
        </div>
      </div>
    </div>

    <!-- Cobro -->
    <div v-if="cobro.abierto" class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm">
        <h3 class="font-bold mb-2">Cobrar Venta</h3>
        <div class="text-lg font-bold mb-3">Total: {{ e.fmt(totalCarrito) }}</div>
        <template v-if="metodo === 'efectivo'">
          <input v-model="cobro.recibido" type="number" placeholder="Recibido"
            class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 mb-2" />
          <button class="w-full text-sm underline mb-2" @click="cobro.recibido = totalCarrito">Pagar exacto</button>
          <div class="text-sm mb-3">Vuelto: <b>{{ e.fmt(Math.max(0, n(cobro.recibido) - totalCarrito)) }}</b></div>
        </template>
        <div class="flex gap-2">
          <button class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg py-2" @click="cobro.abierto = false">Cancelar</button>
          <button class="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-bold" @click="confirmarVenta">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- Escáner -->
    <div v-if="scanAbierto" class="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4">
      <div id="lector-codigos" class="w-full max-w-sm"></div>
      <button class="mt-4 bg-rose-600 text-white rounded-lg px-4 py-2" @click="cerrarScanner">Cerrar escáner</button>
    </div>
  </div>
</template>
