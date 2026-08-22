<template>
  <div v-if="ui.toast.msg"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-xl shadow-lg text-sm text-center">
    {{ ui.toast.msg }} <span v-if="ui.toast.accionTxt" class="underline">{{ ui.toast.accionTxt }}</span>
  </div>

  <div v-if="ui.confirm.abierto" class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
    @click.self="ui.responderConfirm(false)">
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-xl">
      <h3 class="font-bold mb-1">{{ ui.confirm.titulo }}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">{{ ui.confirm.msg }}</p>
      <div class="flex gap-2 justify-end">
        <button class="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-slate-700" @click="ui.responderConfirm(false)">Cancelar</button>
        <button class="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white" @click="ui.responderConfirm(true)">Confirmar</button>
      </div>
    </div>
  </div>

  <div v-if="ui.prompt.abierto" class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
    @click.self="ui.responderPrompt(null)">
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-xl">
      <h3 class="font-bold mb-1">{{ ui.prompt.titulo }}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">{{ ui.prompt.msg }}</p>
      <input v-model="ui.prompt.valor" type="text"
        class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 mb-4"
        @keyup.enter="ui.responderPrompt(ui.prompt.valor)" />
      <div class="flex gap-2 justify-end">
        <button class="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-slate-700" @click="ui.responderPrompt(null)">Cancelar</button>
        <button class="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white" @click="ui.responderPrompt(ui.prompt.valor)">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUi } from '../stores/ui'
const ui = useUi()
</script>
