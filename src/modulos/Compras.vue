<script>
export const meta = { nombre: 'Compras', titulo: 'Compras', corto: 'Compras', icono: '📦', orden: 3, rapido: true, rol: ['dueno', 'empleado'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtCant, fmtFH } from '../lib/utils'

const e = useEstado()
const ui = useUi()

const busqueda = ref('')
const form = ref({ productoId: '', cantidad: '', costo: '', editId: null })

const lista = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return e.productos.filter(p => !p.archivado && (!q || p.nombre.toLowerCase().includes(q))).slice(0, 20)
})
const historial = computed(() => [...e.compras].sort((a, b) => b.fecha - a.fecha).slice(0, 60))
const productoSel = computed(() => e.productos.find(p => p.id === form.value.productoId))
const total = computed(() => n(form.value.cantidad) * n(form.value.costo))

function elegir(p) { form.value.productoId = p.id }
function editar(c) {
  form.value = { productoId: c.productoId, cantidad: c.cantidad, costo: c.costo, editId: c.id }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function guardar() {
  if (!form.value.productoId || !n(form.value.cantidad) || form.value.costo === '') {
    ui.avisar('❌ Producto, cantidad y costo son obligatorios'); return
  }
  await e.registrarCompra({ ...form.value, nombre: productoSel.value.nombre, unidad: productoSel.value.unidad })
  ui.avisar(form.value.editId ? '✅ Compra actualizada' : '✅ Compra registrada y lote creado')
  form.value = { productoId: '', cantidad: '', costo: '', editId: null }
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">{{ form.editId ? 'Editar Compra' : 'Registrar Compra' }}</div>
      <input v-model="busqueda" type="text" placeholder="🔍 Buscar producto a comprar…"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      <div v-if="!form.productoId" class="divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
        <button v-for="p in lista" :key="p.id" class="w-full text-left px-1 py-2 text-sm flex justify-between" @click="elegir(p)">
          <span>{{ p.nombre }}</span>
          <span class="text-slate-500 text-[11px]">Stock {{ fmtCant(e.stock(p.id)) }} {{ p.unidad }}</span>
        </button>
        <div v-if="!lista.length" class="py-2 text-sm text-slate-500">Sin coincidencias</div>
      </div>
      <div v-else class="space-y-2">
        <div class="text-sm font-bold text-blue-600">{{ productoSel?.nombre }}
          <button class="text-[11px] underline text-slate-500 ml-2" @click="form.productoId = ''">cambiar</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input v-model="form.cantidad" type="number" step="any" placeholder="Cantidad ({{ productoSel?.unidad || 'u' }})"
            class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
          <input v-model="form.costo" type="number" step="any" placeholder="Costo unitario"
            class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        </div>
        <div class="text-sm text-right">Total: <b>{{ e.fmt(total) }}</b></div>
        <div class="flex gap-2">
          <button class="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-bold" @click="guardar">
            {{ form.editId ? 'Actualizar' : 'Registrar Compra' }}
          </button>
          <button class="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg" @click="form = { productoId: '', cantidad: '', costo: '', editId: null }">Cancelar</button>
        </div>
      </div>
    </div>

    <div class="text-sm font-bold">Historial de Compras</div>
    <div class="space-y-2">
      <div v-for="c in historial" :key="c.id" class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm text-sm flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <div class="font-bold truncate">{{ c.productoNombre }}</div>
          <div class="text-[11px] text-slate-500">{{ fmtFH(c.fecha) }} · {{ fmtCant(c.cantidad) }} {{ c.unidad }} × {{ e.fmt(c.costo) }} = {{ e.fmt(c.total) }}</div>
        </div>
        <button class="text-blue-600 text-[11px] underline" @click="editar(c)">Editar</button>
      </div>
      <div v-if="!historial.length" class="text-sm text-slate-500">Sin compras</div>
    </div>
  </div>
</template>
