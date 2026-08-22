<script>
export const meta = { nombre: 'Patrimonio', titulo: 'Patrimonio', corto: 'Patr.', icono: '🏦', orden: 7, rol: ['dueno'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtFH } from '../lib/utils'

const e = useEstado()
const ui = useUi()

const retiro = ref({ abierto: false, monto: '', nota: '' })
const aporte = ref({ abierto: false, monto: '', nota: '' })
const capInicial = ref('')

const historial = computed(() => [...e.patrimonioMovs].sort((a, b) => b.fecha - a.fecha))

async function confirmarRetiro() {
  await e.retirarGanancia(n(retiro.value.monto), retiro.value.nota)
  retiro.value = { abierto: false, monto: '', nota: '' }
}
async function confirmarAporte() {
  await e.aportarCapital(n(aporte.value.monto), aporte.value.nota)
  aporte.value = { abierto: false, monto: '', nota: '' }
}
async function guardarCapital() {
  await e.setCapitalInicial(n(capInicial.value))
  capInicial.value = ''
  ui.avisar('✅ Capital inicial actualizado')
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-[11px] text-slate-500">Patrimonio Total</div>
      <div class="text-2xl font-bold">{{ e.fmt(e.patrimonioTotal) }}</div>
      <div class="text-[11px] text-slate-500">Capital {{ e.fmt(e.capitalTotal) }} · Ganancias acumuladas {{ e.fmt(e.gananciasAcumuladas) }}</div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm space-y-1">
      <div class="font-bold mb-1">Resumen contable</div>
      <div class="flex justify-between"><span>Capital inicial</span><span>{{ e.fmt(e.config.capitalInicial) }}</span></div>
      <div class="flex justify-between"><span>Aportes</span><span>+{{ e.fmt(e.aportesTotal) }}</span></div>
      <div class="flex justify-between font-bold"><span>= CAPITAL</span><span>{{ e.fmt(e.capitalTotal) }}</span></div>
      <div class="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1"><span>Caja (todos los dispositivos)</span><span>{{ e.fmt(e.saldoCajaTotal) }}</span></div>
      <div class="flex justify-between"><span>Inventario</span><span>{{ e.fmt(e.valorInventario) }}</span></div>
      <div class="flex justify-between font-bold"><span>= ACTIVOS</span><span>{{ e.fmt(e.saldoCajaTotal + e.valorInventario) }}</span></div>
      <div class="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1"><span>Ganancia bruta (período)</span><span>{{ e.fmt(e.gananciaBrutaPeriodo) }}</span></div>
      <div class="flex justify-between"><span>Gastos operativos</span><span>-{{ e.fmt(e.gastosOpPeriodo) }}</span></div>
      <div class="flex justify-between font-bold"><span>= Ganancia neta (período)</span><span>{{ e.fmt(e.gananciaNetaPeriodo) }}</span></div>
      <div class="flex justify-between font-bold bg-emerald-50 dark:bg-emerald-900/40 rounded-lg px-2 py-1 mt-1">
        <span>DISPONIBLE PARA RETIRO</span><span>{{ e.fmt(e.gananciaDisponible) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button class="bg-rose-600 text-white rounded-xl py-3 text-sm font-bold" @click="retiro = { abierto: true, monto: '', nota: '' }">💸 Retirar Ganancia</button>
      <button class="bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold" @click="aporte = { abierto: true, monto: '', nota: '' }">💵 Aportar Capital</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Capital Inicial</div>
      <div class="text-sm">Actual: <b>{{ e.fmt(e.config.capitalInicial) }}</b></div>
      <div class="flex gap-2">
        <input v-model="capInicial" type="number" step="any" placeholder="Nuevo capital inicial"
          class="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <button class="bg-blue-600 text-white rounded-lg px-3 text-sm" @click="guardarCapital">Guardar</button>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-sm font-bold mb-2">Historial de movimientos</div>
      <div class="space-y-1 text-sm">
        <div v-for="m in historial" :key="m.id" class="flex justify-between">
          <span>{{ m.tipo }} <span class="text-[10px] text-slate-400">{{ fmtFH(m.fecha) }} {{ m.nota ? '· ' + m.nota : '' }}</span></span>
          <span :class="m.tipo === 'Retiro' ? 'text-rose-600' : 'text-emerald-600'">{{ m.tipo === 'Retiro' ? '-' : '+' }}{{ e.fmt(m.monto) }}</span>
        </div>
        <div v-if="!historial.length" class="text-slate-500">Sin movimientos</div>
      </div>
    </div>

    <div v-if="retiro.abierto" class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-2">
        <h3 class="font-bold">Retirar Ganancia</h3>
        <div class="text-sm">Disponible: <b>{{ e.fmt(e.gananciaDisponible) }}</b></div>
        <input v-model="retiro.monto" type="number" step="any" placeholder="Monto"
          class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="retiro.nota" type="text" placeholder="Nota (opcional)"
          class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <div class="flex gap-2">
          <button class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg py-2" @click="retiro.abierto = false">Cancelar</button>
          <button class="flex-1 bg-rose-600 text-white rounded-lg py-2 font-bold" @click="confirmarRetiro">Retirar</button>
        </div>
      </div>
    </div>

    <div v-if="aporte.abierto" class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-2">
        <h3 class="font-bold">Aportar Capital</h3>
        <input v-model="aporte.monto" type="number" step="any" placeholder="Monto"
          class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <input v-model="aporte.nota" type="text" placeholder="Nota (opcional)"
          class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <div class="flex gap-2">
          <button class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg py-2" @click="aporte.abierto = false">Cancelar</button>
          <button class="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-bold" @click="confirmarAporte">Aportar</button>
        </div>
      </div>
    </div>
  </div>
</template>
