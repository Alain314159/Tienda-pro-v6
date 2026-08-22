<script>
export const meta = { nombre: 'Ajustes', titulo: 'Ajustes', corto: 'Ajustes', icono: '⚙️', orden: 12, rol: ['dueno'] }
</script>

<script setup>
import { ref } from 'vue'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { setConfig, db } from '../lib/db'
import { migrarV5 } from '../lib/migrar'
import { descargarArchivo } from '../lib/utils'

const e = useEstado()
const ui = useUi()
const pinNuevo = ref('')
const archivo = ref(null)

async function cfg(parche, msg) { e.config = await setConfig(parche); if (msg) ui.avisar(msg) }
async function guardarPin() { await cfg({ pin: pinNuevo.value }, '✅ PIN ' + (pinNuevo.value ? 'actualizado' : 'eliminado')); pinNuevo.value = '' }

async function exportar() {
  const data = {
    version: 6, exportado: Date.now(), config: e.config,
    productos: e.productos, categorias: e.categorias, lotes: e.lotes, ventas: e.ventas,
    compras: e.compras, cajaMovs: e.cajaMovs, arqueos: e.arqueos,
    patrimonioMovs: e.patrimonioMovs, ajustes: e.ajustes, periodos: e.periodos, auditoria: e.auditoria
  }
  descargarArchivo('respaldo-tiendapro-' + Date.now() + '.json', JSON.stringify(data))
  ui.avisar('💾 Respaldo exportado')
}

function onFile(ev) { archivo.value = ev.target.files[0] }

async function importar() {
  if (!archivo.value) { ui.avisar('❌ Elige un archivo primero'); return }
  const ok = await ui.confirmar('Importar datos', 'Esto REEMPLAZA los datos del teléfono por los del respaldo. ¿Continuar?')
  if (!ok) return
  const txt = await archivo.value.text()
  for (const t of ['productos', 'categorias', 'lotes', 'ventas', 'compras', 'cajaMovs', 'arqueos', 'patrimonioMovs', 'ajustes', 'periodos', 'auditoria']) await db[t].clear()
  const res = await migrarV5(txt)
  await e.recargar()
  ui.avisar('✅ Importado: ' + res.productos + ' productos, ' + res.ventas + ' ventas, ' + res.compras + ' compras')
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">🏪 Tienda</div>
      <input :value="e.config.nombre" type="text" placeholder="Nombre de la tienda"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
        @change="cfg({ nombre: $event.target.value })" />
      <div class="grid grid-cols-2 gap-2">
        <input :value="e.config.moneda" type="text" placeholder="Símbolo moneda"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
          @change="cfg({ moneda: $event.target.value })" />
        <input :value="e.config.stockBajoDefault" type="number" placeholder="Stock bajo por defecto"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
          @change="cfg({ stockBajoDefault: Number($event.target.value) || 5 })" />
        <input :value="e.config.iva" type="number" step="any" placeholder="IVA % (0 = sin IVA)"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
          @change="cfg({ iva: Number($event.target.value) || 0 })" />
        <input :value="e.config.redondeo" type="number" step="any" placeholder="Redondeo (ej: 0.5)"
          class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
          @change="cfg({ redondeo: Number($event.target.value) || 0 })" />
      </div>
      <button class="w-full rounded-lg py-2 text-sm font-bold"
        :class="e.config.mayoristaActivo ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-700'"
        @click="cfg({ mayoristaActivo: !e.config.mayoristaActivo }, e.config.mayoristaActivo ? '🏪 Mayorista desactivado' : '🏪 Mayorista activado')">
        {{ e.config.mayoristaActivo ? '✅ Mayorista activado (tocar para desactivar)' : 'Activar modo mayorista' }}
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">🔒 Seguridad</div>
      <p class="text-[11px] text-slate-400">El PIN se pide en anulaciones, ajustes, arqueos… Deja vacío para quitarlo.</p>
      <div class="flex gap-2">
        <input v-model="pinNuevo" type="password" placeholder="Nuevo PIN"
          class="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
        <button class="bg-blue-600 text-white rounded-lg px-3 text-sm" @click="guardarPin">Guardar</button>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">💾 Datos</div>
      <button class="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-bold" @click="exportar">Exportar respaldo completo</button>
      <input type="file" accept=".json" class="text-sm w-full" @change="onFile" />
      <button class="w-full bg-amber-600 text-white rounded-lg py-2 text-sm font-bold" @click="importar">Importar / Migrar desde v5.2</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm">
      <div class="font-bold">ℹ️ Información</div>
      <p class="text-[11px] text-slate-400 mt-1">Tienda Pro v6 · {{ e.productos.length }} productos · {{ e.ventas.length }} ventas · {{ e.compras.length }} compras · Datos locales + nube</p>
    </div>
  </div>
</template>
