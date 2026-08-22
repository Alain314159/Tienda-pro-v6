<script>
export const meta = { nombre: 'Dashboard', titulo: 'Inicio', corto: 'Inicio', icono: '📊', orden: 1, rapido: true, rol: ['dueno', 'empleado', 'lector'] }
</script>

<script setup>
import { computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { fmtFecha } from '../lib/utils'

const e = useEstado()
const ui = useUi()
const maxMes = computed(() => Math.max(1, ...e.mesesChart.map(m => m.ventas)))
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
        <div class="text-[11px] text-slate-500">Efectivo en Caja</div>
        <div class="text-lg font-bold">{{ e.fmt(e.saldoCaja) }}</div>
        <div class="text-[11px] text-slate-500 mt-1">Inventario: {{ e.fmt(e.valorInventario) }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
        <div class="text-[11px] text-slate-500">Período desde {{ fmtFecha(e.config.periodoInicio) }}</div>
        <div class="text-[11px] mt-1 text-amber-600">{{ e.productosAgotados.length }} agotado(s) · {{ e.productosBajoStock.length }} bajo(s)</div>
        <div class="text-[11px] text-slate-500 mt-1">Última actividad: {{ e.ultimaActividad }}</div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 text-center">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm">
        <div class="text-[10px] text-slate-500">Ventas</div>
        <div class="text-sm font-bold">{{ e.fmt(e.ventasPeriodo) }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm">
        <div class="text-[10px] text-slate-500">Ganancia</div>
        <div class="text-sm font-bold text-emerald-600">{{ e.fmt(e.gananciaNetaPeriodo) }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm">
        <div class="text-[10px] text-slate-500">Compras</div>
        <div class="text-sm font-bold">{{ e.fmt(e.comprasPeriodo) }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm">
        <div class="text-[10px] text-slate-500">Margen</div>
        <div class="text-sm font-bold">{{ e.margenPeriodo }}%</div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-sm font-bold mb-2">Ventas vs Ganancia (6 meses)</div>
      <div class="flex items-end gap-2 h-24">
        <div v-for="m in e.mesesChart" :key="m.mes" class="flex-1 flex flex-col items-center gap-1">
          <div class="w-full flex items-end gap-[2px] h-20">
            <div class="flex-1 bg-blue-500 rounded-t" :style="{ height: (m.ventas / maxMes * 100) + '%' }"></div>
            <div class="flex-1 bg-emerald-500 rounded-t" :style="{ height: (m.ganancia / maxMes * 100) + '%' }"></div>
          </div>
          <div class="text-[10px] text-slate-500">{{ m.mes }}</div>
        </div>
      </div>
      <div class="text-[10px] text-slate-400 mt-1">🟦 ventas · 🟩 ganancia</div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-sm font-bold mb-2">Top rentables del mes</div>
      <div v-if="!e.topRentables.length" class="text-sm text-slate-500">Sin ventas este mes</div>
      <div v-for="(p, i) in e.topRentables" :key="p.nombre"
        class="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <span>{{ i + 1 }}. {{ p.nombre }}</span>
        <span class="font-bold text-emerald-600">{{ e.fmt(p.gan) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button v-if="e.puede('vender')" class="bg-blue-600 text-white rounded-xl py-3 text-sm font-bold" @click="ui.irA('Ventas')">➕ Nueva Venta</button>
      <button v-if="e.puede('comprar')" class="bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold" @click="ui.irA('Compras')">📦 Registrar Compra</button>
      <button v-if="e.puede('caja')" class="bg-amber-600 text-white rounded-xl py-3 text-sm font-bold" @click="ui.irA('Caja')">💰 Arqueo de Caja</button>
      <button v-if="e.puede('productos')" class="bg-violet-600 text-white rounded-xl py-3 text-sm font-bold" @click="ui.irA('Inventario')">📋 Ver Inventario</button>
    </div>
  </div>
</template>
