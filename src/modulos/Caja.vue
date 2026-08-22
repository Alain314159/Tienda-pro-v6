<script>
export const meta = { nombre: 'Caja', titulo: 'Caja', corto: 'Caja', icono: '💰', orden: 4, rapido: true, rol: ['dueno', 'empleado', 'lector'] }
</script>

<script setup>
import { ref, computed } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { n, fmtFH, dispositivoId } from '../lib/utils'

const e = useEstado()
const ui = useUi()
const miDev = dispositivoId()
const fisico = ref('')

const mios = computed(() => e.cajaMovs.filter(m => m.deviceId === miDev))
const d = computed(() => {
  const sum = (cat, tipo) => mios.value.filter(m => m.categoria === cat && m.tipo === tipo).reduce((t, m) => t + n(m.monto), 0)
  return {
    ventas: sum('venta', 'ingreso') - sum('venta', 'egreso'),
    compras: sum('compra', 'egreso'),
    retiros: sum('retiro', 'egreso'),
    aportes: sum('aporte', 'ingreso'),
    arqueo: sum('arqueo', 'ingreso') - sum('arqueo', 'egreso')
  }
})
const porDispositivo = computed(() => {
  const map = {}
  e.cajaMovs.forEach(m => { map[m.deviceId] = (map[m.deviceId] || 0) + (m.tipo === 'ingreso' ? n(m.monto) : -n(m.monto)) })
  return Object.entries(map)
})
const movs = computed(() => [...mios.value].sort((a, b) => b.fecha - a.fecha).slice(0, 30))
const diff = computed(() => n(fisico.value) - e.saldoCaja)

async function registrarArqueo() {
  if (fisico.value === '') { ui.avisar('❌ Escribe el dinero físico contado'); return }
  await e.registrarArqueo(n(fisico.value))
  fisico.value = ''
  ui.avisar('✅ Arqueo registrado')
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-[11px] text-slate-500">Saldo en Caja (este dispositivo)</div>
      <div class="text-2xl font-bold" :class="e.saldoCaja < 0 ? 'text-rose-600' : ''">{{ e.fmt(e.saldoCaja) }}</div>
      <div v-if="e.saldoCaja < 0" class="text-[11px] text-rose-600">Caja en negativo</div>
      <div v-if="e.rol === 'dueno' && porDispositivo.length > 1" class="mt-2 text-[11px] space-y-1 border-t border-slate-100 dark:border-slate-700 pt-2">
        <div class="font-bold">Todas las cajas · Total: {{ e.fmt(e.saldoCajaTotal) }}</div>
        <div v-for="[dev, sal] in porDispositivo" :key="dev" class="flex justify-between">
          <span class="truncate">{{ dev === miDev ? '📱 Este teléfono' : '📟 ' + dev.slice(-6) }}</span>
          <span class="font-bold">{{ e.fmt(sal) }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm space-y-1">
      <div class="font-bold mb-1">Desglose (este dispositivo)</div>
      <div class="flex justify-between"><span>Aportes de capital</span><span>+{{ e.fmt(d.aportes) }}</span></div>
      <div class="flex justify-between"><span>Ventas en efectivo</span><span>+{{ e.fmt(d.ventas) }}</span></div>
      <div class="flex justify-between"><span>Compras pagadas</span><span>-{{ e.fmt(d.compras) }}</span></div>
      <div class="flex justify-between"><span>Retiros</span><span>-{{ e.fmt(d.retiros) }}</span></div>
      <div class="flex justify-between"><span>Ajustes de arqueo</span><span>{{ d.arqueo >= 0 ? '+' : '-' }}{{ e.fmt(Math.abs(d.arqueo)) }}</span></div>
      <div class="flex justify-between font-bold border-t border-slate-200 dark:border-slate-600 pt-1"><span>= SALDO</span><span>{{ e.fmt(e.saldoCaja) }}</span></div>
      <p class="text-[11px] text-slate-400">El saldo es acumulativo. El cierre de período solo reinicia los contadores del inicio.</p>
    </div>

    <div v-if="e.puede('arqueo')" class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Arqueo de Caja</div>
      <p class="text-[11px] text-slate-400">Cuenta el dinero físico y escríbelo. Menor que el sistema = faltante; mayor = sobrante.</p>
      <div class="text-sm">El sistema dice: <b>{{ e.fmt(e.saldoCaja) }}</b></div>
      <input v-model="fisico" type="number" step="any" placeholder="Tú cuentas…"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      <div v-if="fisico !== ''" class="text-sm">
        Diferencia:
        <b v-if="Math.abs(diff) < 0.01" class="text-emerald-600">Cuadre perfecto ✓</b>
        <b v-else-if="diff > 0" class="text-emerald-600">SOBRANTE +{{ e.fmt(diff) }}</b>
        <b v-else class="text-rose-600">FALTANTE -{{ e.fmt(Math.abs(diff)) }}</b>
      </div>
      <button class="w-full bg-amber-600 text-white rounded-lg py-2 font-bold" @click="registrarArqueo">Registrar Arqueo</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-sm font-bold mb-2">Movimientos recientes</div>
      <div class="space-y-1 text-sm">
        <div v-for="m in movs" :key="m.id" class="flex justify-between">
          <span class="truncate">{{ m.concepto }} <span class="text-[10px] text-slate-400">{{ fmtFH(m.fecha) }}</span></span>
          <span :class="m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'">{{ m.tipo === 'ingreso' ? '+' : '-' }}{{ e.fmt(m.monto) }}</span>
        </div>
        <div v-if="!movs.length" class="text-slate-500">Sin movimientos</div>
      </div>
    </div>
  </div>
</template>
