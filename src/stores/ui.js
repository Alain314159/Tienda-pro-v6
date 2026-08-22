/* Toasts, confirmaciones y prompts globales */
import { defineStore } from 'pinia'

export const useUi = defineStore('ui', {
  state: () => ({
    modulo: 'Dashboard',
    toast: { msg: '', accionTxt: '' },
    confirm: { abierto: false, titulo: '', msg: '', resolver: null },
    prompt: { abierto: false, titulo: '', msg: '', valor: '', resolver: null }
  }),
  actions: {
    irA(m) { this.modulo = m },
    avisar(msg, accionTxt = '') {
      this.toast = { msg, accionTxt }
      setTimeout(() => { this.toast = { msg: '', accionTxt: '' } }, 2400)
    },
    confirmar(titulo, msg) {
      return new Promise(res => { this.confirm = { abierto: true, titulo, msg, resolver: res } })
    },
    responderConfirm(v) {
      if (this.confirm.resolver) this.confirm.resolver(v)
      this.confirm = { abierto: false, titulo: '', msg: '', resolver: null }
    },
    preguntar(titulo, msg, valor = '') {
      return new Promise(res => { this.prompt = { abierto: true, titulo, msg, valor, resolver: res } })
    },
    responderPrompt(v) {
      if (this.prompt.resolver) this.prompt.resolver(v)
      this.prompt = { abierto: false, titulo: '', msg: '', valor: '', resolver: null }
    }
  }
})
