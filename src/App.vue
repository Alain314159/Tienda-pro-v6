<template>
  <div v-if="!listo" class="min-h-screen flex items-center justify-center text-slate-500">Cargando…</div>

  <!-- LOGIN -->
  <div v-else-if="!e.usuario" class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
      <div class="text-center mb-5">
        <div class="text-4xl mb-2">🛒</div>
        <h1 class="text-xl font-bold">Tienda Pro</h1>
        <p class="text-sm text-slate-500">v6 · POS y gestión</p>
      </div>
      <div v-if="errorLogin" class="text-sm text-rose-600 mb-2">{{ errorLogin }}</div>
      <input v-if="modoRegistro" v-model="nombre" type="text" placeholder="Tu nombre"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 mb-2" />
      <input v-model="email" type="email" placeholder="Correo"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 mb-2" />
      <input v-model="pass" type="password" placeholder="Contraseña"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
        @keyup.enter="entrar" />
      <button class="w-full bg-blue-600 text-white rounded-lg py-2 mt-3 disabled:opacity-50" :disabled="cargando" @click="entrar">
        {{ cargando ? 'Entrando…' : (modoRegistro ? 'Crear cuenta y entrar' : 'Entrar') }}
      </button>
      <button class="w-full text-sm mt-2 underline text-slate-500" @click="modoRegistro = !modoRegistro">
        {{ modoRegistro ? 'Ya tengo cuenta' : 'Crear cuenta nueva' }}
      </button>
      <div class="text-center text-xs text-slate-400 my-3">— o —</div>
      <button class="w-full bg-slate-200 dark:bg-slate-700 rounded-lg py-2 text-sm" @click="entrarLocal">
        Entrar sin cuenta (modo local)
      </button>
      <p class="text-[11px] text-slate-400 mt-3">
        El modo local guarda todo solo en este teléfono. Con cuenta, tus datos se respaldan y sincronizan en la nube.
      </p>
    </div>
  </div>

  <!-- APP -->
  <template v-else>
    <header class="sticky top-0 z-40 bg-white dark:bg-slate-800 shadow flex items-center gap-1 px-2 py-2">
      <button class="p-2 text-xl" @click="menuAbierto = !menuAbierto">☰</button>
      <div class="flex-1 min-w-0">
        <div class="font-bold leading-tight truncate">{{ e.config?.nombre || 'Tienda Pro' }}</div>
        <div class="text-[11px] leading-tight" :class="estadoSync.online ? 'text-emerald-600' : 'text-amber-600'">
          {{ estadoSync.online ? 'En línea' : 'Sin conexión' }}
          <span v-if="estadoSync.pendientes"> · {{ estadoSync.pendientes }} pend.</span>
          <span v-if="estadoSync.sincronizando"> · sincronizando…</span>
        </div>
      </div>
      <button class="p-2" @click="e.toggleTema()">{{ e.config?.tema === 'dark' ? '☀️' : '🌙' }}</button>
      <button class="p-2" @click="syncAhora">🔄</button>
      <button class="p-2" @click="salir">🚪</button>
    </header>

    <div class="flex items-start">
      <nav v-if="menuAbierto" class="w-44 shrink-0 p-2 space-y-1 bg-white dark:bg-slate-800 min-h-[70vh] border-r border-slate-200 dark:border-slate-700">
        <button v-for="m in visibles" :key="m.nombre"
          class="w-full text-left px-3 py-2 rounded-lg text-sm"
          :class="actual === m.nombre ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'"
          @click="actual = m.nombre; menuAbierto = false">
          {{ m.icono }} {{ m.titulo }}
        </button>
      </nav>
      <main class="flex-1 p-3 pb-24">
        <component :is="compActual" />
      </main>
    </div>

    <nav class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-800 shadow-inner flex justify-around py-1">
      <button v-for="m in rapidos" :key="m.nombre" class="px-2 py-1 text-[11px] text-center"
        :class="actual === m.nombre ? 'text-blue-600 font-bold' : 'text-slate-500'"
        @click="actual = m.nombre">
        <div class="text-lg">{{ m.icono }}</div>{{ m.corto || m.titulo }}
      </button>
    </nav>
  </template>

  <Ui />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEstado } from './stores/estado'
import { useUi } from './stores/ui'
import { estadoSync, refrescarPendientes } from './lib/sync'
import { sesionActual, login, registrar, entrarModoLocal, esModoLocal, logout } from './lib/auth'
import Ui from './componentes/Ui.vue'

const e = useEstado()
const ui = useUi()

const listo = ref(false)
const email = ref(''), pass = ref(''), nombre = ref('')
const modoRegistro = ref(false), cargando = ref(false), errorLogin = ref('')
const menuAbierto = ref(false)
const actual = computed({ get: () => ui.modulo, set: (v) => ui.irA(v) })

/* Módulos auto-descubiertos: cada .vue de src/modulos exporta su meta */
const mods = import.meta.glob('./modulos/*.vue', { eager: true })
const listaMods = Object.entries(mods)
  .map(([ruta, m]) => ({ ...m.meta, comp: m.default }))
  .sort((a, b) => (a.orden || 99) - (b.orden || 99))

const visibles = computed(() => listaMods.filter(m => {
  if (m.rol && !m.rol.includes(e.rol)) return false
  if (m.flag === 'mayorista' && !e.config?.mayoristaActivo) return false
  return true
}))
const rapidos = computed(() => visibles.value.filter(m => m.rapido).slice(0, 5))
const compActual = computed(() => (listaMods.find(m => m.nombre === actual.value) || listaMods[0])?.comp)

async function entrar() {
  cargando.value = true; errorLogin.value = ''
  try {
    const s = modoRegistro.value
      ? await registrar(email.value.trim(), pass.value, nombre.value.trim() || email.value.trim())
      : await login(email.value.trim(), pass.value)
    await e.iniciar({ id: s.$id, nombre: s.name || email.value.trim(), rol: 'dueno' }, false)
    await e.sincronizarAhora()
  } catch (err) {
    errorLogin.value = 'Error: ' + ((err && err.message) || err)
  }
  cargando.value = false
}

async function entrarLocal() {
  entrarModoLocal()
  await e.iniciar({ id: 'local', nombre: 'Local', rol: 'dueno' }, true)
}

async function syncAhora() {
  await e.sincronizarAhora()
  ui.avisar('🔄 Sincronizado')
}

async function salir() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  const s = await sesionActual()
  if (s) {
    await e.iniciar({ id: s.$id, nombre: s.name || 'Usuario', rol: 'dueno' }, false)
  } else if (esModoLocal()) {
    await e.iniciar({ id: 'local', nombre: 'Local', rol: 'dueno' }, true)
  }
  await refrescarPendientes()
  window.addEventListener('online', () => { if (e.usuario) e.sincronizarAhora() })
  listo.value = true
})
</script>
