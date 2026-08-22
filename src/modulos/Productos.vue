<script>
export const meta = { nombre: 'Productos', titulo: 'Productos', corto: 'Prod.', icono: '🏷️', orden: 5, rapido: true, rol: ['dueno'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtCant, fmtFH } from '../lib/utils'

const e = useEstado()
const ui = useUi()

const formVacio = { id: null, nombre: '', codigo: '', categoria: '', unidad: 'u', precio: '', precioMayor: '', cantMinMayor: '', stockBajo: '' }
const form = ref({ ...formVacio })
const mostrarArchivados = ref(false)
const verLotes = ref(null)

const lista = computed(() => e.productos.filter(p => mostrarArchivados.value ? true : !p.archivado))
const categoriasExistentes = computed(() => [...new Set(e.productos.map(p => p.categoria).filter(Boolean))])

function editar(p) {
  form.value = { id: p.id, nombre: p.nombre, codigo: p.codigo || '', categoria: p.categoria || '', unidad: p.unidad || 'u', precio: n(p.precio) || '', precioMayor: n(p.precioMayor) || '', cantMinMayor: n(p.cantMinMayor) || '', stockBajo: n(p.stockBajo) || '' }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function guardar() {
  if (!form.value.nombre) { ui.avisar('❌ El nombre es obligatorio'); return }
  await e.guardarProducto(form.value)
  ui.avisar('✅ Producto guardado')
  form.value = { ...formVacio }
}
async function archivar(p) {
  const ok = await ui.confirmar(p.archivado ? 'Reactivar producto' : 'Archivar producto',
    `${p.nombre}: ${p.archivado ? 'volverá a aparecer en ventas.' : 'dejará de aparecer en ventas. No se borra: se conserva su historial.'}`)
  if (ok) await e.archivarProducto(p.id)
}
function badge(p) {
  const s = e.stock(p.id)
  if (s <= 0) return { t: 'AGOTADO', c: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200' }
  if (s <= n(p.stockBajo ?? e.config.stockBajoDefault)) return { t: 'BAJO', c: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' }
  return { t: 'OK', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' }
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">{{ form.id ? 'Editar Producto' : 'Agregar Producto' }}</div>
      <input v-model="form.nombre" type="text" placeholder="Nombre *"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      <div class="grid grid-cols-2 gap-2">
        <input v-model="form.codigo" type="text" placeholder="Código (barras)"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="form.categoria" type="text" list="cats" placeholder="Categoría"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <datalist id="cats"><option v-for="c in categoriasExistentes" :key="c" :value="c" /></datalist>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="form.unidad" type="text" placeholder="Unidad (kg, lb, gr, litro, u)"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="form.precio" type="number" step="any" placeholder="Precio detal"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="form.precioMayor" type="number" step="any" placeholder="Precio mayorista"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="form.cantMinMayor" type="number" step="any" placeholder="Mínimo mayorista"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="form.stockBajo" type="number" step="any" placeholder="Alerta stock bajo"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      </div>
      <p class="text-[11px] text-slate-400">Define la unidad si vendes por peso o volumen (kg, lb, gr, litro). Si es unidad suelta, pon "u".</p>
      <div class="flex gap-2">
        <button class="flex-1 bg-blue-600 text-white rounded-lg py-2 font-bold" @click="guardar">{{ form.id ? 'Actualizar' : 'Guardar' }}</button>
        <button v-if="form.id" class="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg" @click="form = { ...formVacio }">Cancelar</button>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-sm font-bold">Productos ({{ lista.length }})</div>
      <button class="text-[11px] underline text-slate-500" @click="mostrarArchivados = !mostrarArchivados">
        {{ mostrarArchivados ? 'Ocultar archivados' : 'Ver archivados' }}
      </button>
    </div>

    <div class="space-y-2">
      <div v-for="p in lista" :key="p.id" class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm" :class="p.archivado && 'opacity-50'">
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold truncate">{{ p.nombre }} <span v-if="p.codigo" class="text-[10px] text-slate-400">({{ p.codigo }})</span></div>
            <div class="text-[11px] text-slate-500">Stock: {{ fmtCant(e.stock(p.id)) }} {{ p.unidad }} · {{ e.fmt(p.precio) }}
              <span v-if="e.config.mayoristaActivo && p.precioMayor"> · Mayor: {{ e.fmt(p.precioMayor) }}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold rounded-full px-2 py-1" :class="badge(p).c">{{ badge(p).t }}</span>
        </div>
        <div class="flex gap-3 mt-2 text-[11px]">
          <button class="text-blue-600 underline" @click="editar(p)">Editar</button>
          <button class="text-violet-600 underline" @click="verLotes = verLotes === p.id ? null : p.id">Lotes</button>
          <button class="underline" :class="p.archivado ? 'text-emerald-600' : 'text-slate-500'" @click="archivar(p)">
            {{ p.archivado ? 'Reactivar' : 'Archivar' }}
          </button>
        </div>
        <div v-if="verLotes === p.id" class="mt-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-[11px] space-y-1">
          <div v-for="l in e.lotesDe(p.id)" :key="l.id" class="flex justify-between">
            <span>{{ fmtFH(l.fecha) }} · Quedan {{ fmtCant(l.restante) }}/{{ fmtCant(l.inicial) }} @{{ e.fmt(l.costo) }}</span>
            <span class="font-bold">{{ e.fmt(l.restante * l.costo) }}</span>
          </div>
          <div v-if="!e.lotesDe(p.id).length" class="text-slate-500">Sin lotes (stock 0)</div>
          <div class="text-right font-bold">Valor: {{ e.fmt(e.valorLotesDe(p.id)) }}</div>
        </div>
      </div>
      <div v-if="!lista.length" class="text-sm text-slate-500">Sin productos</div>
    </div>
  </div>
</template>
