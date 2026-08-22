<script>
export const meta = { nombre: 'Auditoria', titulo: 'Auditoría', corto: 'Audit.', icono: '🕵️', orden: 10, rol: ['dueno', 'lector'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { fmtFH } from '../lib/utils'

const e = useEstado()
const filtro = ref('')
const tipos = computed(() => [...new Set(e.auditoria.map(a => a.accion))].sort())
const lista = computed(() => e.auditoria.filter(a => !filtro.value || a.accion === filtro.value))
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm">
      🕵️ Registro de quién hizo qué y cuándo: anulaciones, ajustes, arqueos, retiros, cambios de precio y cierres.
    </div>
    <select v-model="filtro" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-800 text-sm">
      <option value="">Todas las acciones</option>
      <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
    </select>
    <div class="space-y-1">
      <div v-for="a in lista" :key="a.id" class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm text-sm">
        <div class="flex justify-between">
          <span class="font-bold text-[11px] rounded bg-slate-100 dark:bg-slate-700 px-1">{{ a.accion }}</span>
          <span class="text-[11px] text-slate-500">{{ fmtFH(a.fecha) }}</span>
        </div>
        <div class="text-[13px] mt-1">{{ a.detalle }}</div>
        <div class="text-[11px] text-slate-500">👤 {{ a.userName }}</div>
      </div>
      <div v-if="!lista.length" class="text-sm text-slate-500">Sin registros</div>
    </div>
  </div>
</template>
