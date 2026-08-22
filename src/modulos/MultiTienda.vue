<script>
export const meta = { nombre: 'MultiTienda', titulo: 'Mis Tiendas', corto: 'Tiendas', icono: '🏬', orden: 11, rol: ['dueno'] }
</script>

<script setup>
import { ref } from 'vue'
import { Query, ID } from 'appwrite'
import { useEstado } from '../stores/estado'
import { useUi } from '../stores/ui'
import { databases, DB_ID, COL_REG } from '../lib/appwrite'
import { db, TABLAS_SYNC, setMeta } from '../lib/db'
import { uid, ahoraMs } from '../lib/utils'

const e = useEstado()
const ui = useUi()
const misTiendas = ref(JSON.parse(localStorage.getItem('tp6_mistiendas') || '[]'))
const nombreNueva = ref('')
const codigoUnirse = ref('')

async function crear() {
  if (!nombreNueva.value) { ui.avisar('❌ Escribe un nombre'); return }
  const id = uid('t_')
  await databases.createDocument(DB_ID, COL_REG, ID.custom(id + '_tienda'), {
    tiendaId: id, tipo: 'tienda', refId: id,
    payload: JSON.stringify({ id, nombre: nombreNueva.value, creada: ahoraMs() }),
    updatedAt: ahoraMs(), deviceId: 'sistema'
  })
  await databases.createDocument(DB_ID, COL_REG, ID.custom(id + '_memb_' + e.usuario.id), {
    tiendaId: id, tipo: 'membresia', refId: e.usuario.id,
    payload: JSON.stringify({ userId: e.usuario.id, userName: e.usuario.nombre, tiendaId: id, rol: 'dueno' }),
    updatedAt: ahoraMs(), deviceId: 'sistema'
  })
  misTiendas.value.push({ id, nombre: nombreNueva.value })
  localStorage.setItem('tp6_mistiendas', JSON.stringify(misTiendas.value))
  ui.avisar('✅ Tienda creada. Código para invitar: ' + id)
  nombreNueva.value = ''
}

async function unirse() {
  const id = codigoUnirse.value.trim()
  if (!id) return
  try {
    await databases.createDocument(DB_ID, COL_REG, ID.custom(id + '_memb_' + e.usuario.id), {
      tiendaId: id, tipo: 'membresia', refId: e.usuario.id,
      payload: JSON.stringify({ userId: e.usuario.id, userName: e.usuario.nombre, tiendaId: id, rol: 'empleado' }),
      updatedAt: ahoraMs(), deviceId: 'sistema'
    })
    misTiendas.value.push({ id, nombre: 'Tienda ' + id.slice(-4) })
    localStorage.setItem('tp6_mistiendas', JSON.stringify(misTiendas.value))
    ui.avisar('✅ Unido como empleado')
  } catch (err) { ui.avisar('❌ Código inválido o ya estabas unido') }
  codigoUnirse.value = ''
}

async function cambiar(t) {
  if (t.id === e.tiendaId) return
  const ok = await ui.confirmar('Cambiar de tienda', 'Se subirán los cambios pendientes y se cargarán los datos de "' + t.nombre + '". ¿Continuar?')
  if (!ok) return
  await e.sincronizarAhora()
  for (const tabla of [...TABLAS_SYNC, 'auditoria']) await db[tabla].clear()
  await setMeta('lastSync_' + t.id, 0)
  e.tiendaId = t.id
  await pullTodo(t.id)
  await e.recargar()
  ui.avisar('🏬 Ahora estás en ' + t.nombre)
}

async function pullTodo(tiendaId) {
  const q = [Query.equal('tiendaId', tiendaId), Query.limit(100)]
  let pagina = await databases.listDocuments(DB_ID, COL_REG, q)
  while (pagina.documents.length) {
    for (const doc of pagina.documents) {
      if (!TABLAS_SYNC.includes(doc.tipo) && doc.tipo !== 'auditoria') continue
      await db[doc.tipo].put(JSON.parse(doc.payload))
    }
    if (pagina.documents.length < 100) break
    pagina = await databases.listDocuments(DB_ID, COL_REG, [...q, Query.cursorAfter(pagina.documents[pagina.documents.length - 1].$id)])
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
      <div class="text-[11px] text-slate-500">Tienda activa</div>
      <div class="text-lg font-bold">🏬 {{ e.tiendaId === 'local' ? 'Tienda local' : e.tiendaId }}</div>
      <p class="text-[11px] text-slate-400 mt-1">Cada tienda tiene su propio catálogo, inventario, caja y empleados. Requiere sesión con cuenta (no modo local).</p>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Crear nueva tienda</div>
      <input v-model="nombreNueva" type="text" placeholder="Nombre de la sucursal"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      <button class="w-full bg-blue-600 text-white rounded-lg py-2 font-bold" @click="crear">Crear Tienda</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      <div class="text-sm font-bold">Unirme con código</div>
      <input v-model="codigoUnirse" type="text" placeholder="Código que te dio el dueño"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
      <button class="w-full bg-emerald-600 text-white rounded-lg py-2 font-bold" @click="unirse">Unirme (como empleado)</button>
    </div>

    <div class="text-sm font-bold">Mis tiendas</div>
    <div class="space-y-2">
      <button v-for="t in misTiendas" :key="t.id"
        class="w-full bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-sm flex justify-between"
        :class="t.id === e.tiendaId && 'ring-2 ring-blue-500'" @click="cambiar(t)">
        <span class="font-bold">{{ t.nombre }}</span>
        <span class="text-[11px] text-slate-500">{{ t.id === e.tiendaId ? 'ACTIVA' : 'cambiar →' }}</span>
      </button>
      <div v-if="!misTiendas.length" class="text-sm text-slate-500">Aún no tienes tiendas en la nube. Crea la primera arriba.</div>
    </div>
  </div>
</template>
