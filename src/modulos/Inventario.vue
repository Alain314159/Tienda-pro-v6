<script>
export const meta = { nombre: 'Inventario', titulo: 'Inventario', corto: 'Inv.', icono: '📋', orden: 6, rol: ['dueno'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtCant, fmtFH } from '../lib/utils'

const e = useEstado()
const ui = useUi()

const ajForm = ref({ pid: '', tipo: 'merma', cant: '', motivo: '' })
const verLotes = ref(null)

const lotesActivos = computed(() => e.lotes.filter(l => n(l.restante) > 0))
const unidadesTotal = computed(() => lotesActivos.value.reduce((t, l) => t + n(l.restante), 0))
const grupos = computed(() => e.productos
  .map(p => ({ id: p.id, nombre: p.nombre, unidad: p.unidad, stockTotal: e.stock(p.id), valor: e.valorLotesDe(p.id), lotes: e.lotesDe(p.id) }))
  .filter(g => g.stockTotal > 0)
  .sort((a, b) => b.valor - a.valor))
const ultimosAjustes = computed(() => [...e.ajustes].sort((a, b) => b.fecha - a.fecha).slice(0, 20))

async function registrar() {
  if (!ajForm.value.pid || !n(ajForm.value.cant) || !ajForm.value.motivo) {
    ui.avisar('❌ Producto, cantidad y motivo son obligatorios'); return
  }
  const cant = ajForm.value.tipo === 'merma' ? -Math.abs(n(ajForm.value.cant)) : Math.abs(n(ajForm.value.cant))
  await e.registrarAjuste(ajForm.value.pid, cant, ajForm.value.motivo)
  ui.avisar('✅ Ajuste registrado')
  ajForm.value = { pid: '', tipo: 'merma', cant: '', motivo: '' }
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-[11px] text-slate-500">Valor del Inventario</div>
      <div class="text-2xl font-bold">{{ e.fmt(e.valorInventario) }}</div>
      <div class="text-[11px] text-slate-500">{{ fmtCant(unidadesTotal) }} unidades · {{ lotesActivos.length }} lotes activos</div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Merma / Ajuste de Inventario</div>
      <select v-model="ajForm.pid" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-900">
        <option value="">Seleccionar producto…</option>
        <option v-for="p in e.productos.filter(x => !x.archivado)" :key="p.id" :value="p.id">
          {{ p.nombre }} (Stock: {{ fmtCant(e.stock(p.id)) }} {{ p.unidad }})
        </option>
      </select>
      <div class="flex gap-2 text-sm">
        <button class="flex-1 rounded-lg py-2" :class="ajForm.tipo === 'merma' ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="ajForm.tipo = 'merma'">− Merma / Salida</button>
        <button class="flex-1 rounded-lg py-2" :class="ajForm.tipo === 'sobrante' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="ajForm.tipo = 'sobrante'">+ Sobrante / Entrada</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="ajForm.cant" type="number" step="any" placeholder="Cantidad"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <select v-model="ajForm.motivo" class="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-900">
          <option value="">Motivo…</option>
          <option>Merma / Daño</option>
          <option>Vencimiento</option>
          <option>Robo / Pérdida</option>
          <option>Error de registro</option>
          <option>Sobrante en conteo</option>
        </select>
      </div>
      <button class="w-full bg-rose-600 text-white rounded-lg py-2 font-bold" @click="registrar">Registrar Ajuste (pide PIN)</button>
    </div>

    <div class="text-sm font-bold">Inventario por producto</div>
    <div class="space-y-2">
      <div v-for="g in grupos" :key="g.id" class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
        <button class="w-full flex justify-between text-sm" @click="verLotes = verLotes === g.id ? null : g.id">
          <span class="font-bold">{{ g.nombre }}</span>
          <span>{{ fmtCant(g.stockTotal) }} {{ g.unidad }} · {{ e.fmt(g.valor) }}</span>
        </button>
        <div v-if="verLotes === g.id" class="mt-2 text-[11px] space-y-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
          <div v-for="l in g.lotes" :key="l.id" class="flex justify-between">
            <span>{{ fmtFH(l.fecha) }} · {{ fmtCant(l.restante) }}/{{ fmtCant(l.inicial) }} @{{ e.fmt(l.costo) }}</span>
            <span class="font-bold">{{ e.fmt(l.restante * l.costo) }}</span>
          </div>
          <div v-if="!g.lotes.length" class="text-slate-500">Sin lotes</div>
        </div>
      </div>
      <div v-if="!grupos.length" class="text-sm text-slate-500">Sin inventario</div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-sm font-bold mb-2">Últimos ajustes</div>
      <div class="space-y-1 text-sm">
        <div v-for="a in ultimosAjustes" :key="a.id" class="flex justify-between">
          <span class="truncate">{{ a.productoNombre }} · {{ a.motivo }} <span class="text-[10px] text-slate-400">{{ fmtFH(a.fecha) }}</span></span>
          <span>{{ a.cantidad > 0 ? '+' : '' }}{{ fmtCant(a.cantidad) }} <span class="text-rose-600">-{{ e.fmt(a.costoPerdida) }}</span></span>
        </div>
        <div v-if="!ultimosAjustes.length" class="text-slate-500">Sin ajustes</div>
      </div>
    </div>
  </div>
</template>
