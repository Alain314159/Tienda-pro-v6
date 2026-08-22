<script>
export const meta = { nombre: 'Mayorista', titulo: 'Mayorista', corto: 'Mayor', icono: '🏪', orden: 9, flag: 'mayorista', rol: ['dueno'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtCant } from '../lib/utils'

const e = useEstado()
const ui = useUi()
const busqueda = ref('')
const edits = ref({})

const lista = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return e.productos.filter(p => !p.archivado && (!q || p.nombre.toLowerCase().includes(q)))
})

function edit(p) {
  if (!edits.value[p.id]) edits.value[p.id] = { pm: n(p.precioMayor) || '', min: n(p.cantMinMayor) || '' }
  return edits.value[p.id]
}
async function guardar(p) {
  const ed = edits.value[p.id]
  await e.guardarProducto({ ...p, precioMayor: n(ed.pm), cantMinMayor: n(ed.min) })
  delete edits.value[p.id]
  ui.avisar('✅ Precios mayoristas de ' + p.nombre + ' guardados')
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-violet-50 dark:bg-violet-900/30 rounded-xl p-3 text-sm">
      🏪 <b>Modo mayorista activo.</b> En Ventas aparecerá el selector Detal/Mayorista.
      Aquí defines precio mayorista y cantidad mínima por producto.
    </div>
    <input v-model="busqueda" type="text" placeholder="🔍 Buscar producto…"
      class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800" />
    <div class="space-y-2">
      <div v-for="p in lista" :key="p.id" class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm space-y-2">
        <div class="flex justify-between font-bold">
          <span>{{ p.nombre }}</span>
          <span class="text-slate-500 text-[11px]">Detal: {{ e.fmt(p.precio) }} · Stock {{ fmtCant(e.stock(p.id)) }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input v-model="edit(p).pm" type="number" step="any" placeholder="Precio mayorista"
            class="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900" />
          <input v-model="edit(p).min" type="number" step="any" placeholder="Cantidad mínima"
            class="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900" />
        </div>
        <button v-if="edits[p.id]" class="w-full bg-violet-600 text-white rounded-lg py-1 text-sm" @click="guardar(p)">Guardar</button>
      </div>
      <div v-if="!lista.length" class="text-sm text-slate-500">Sin productos</div>
    </div>
  </div>
</template>
