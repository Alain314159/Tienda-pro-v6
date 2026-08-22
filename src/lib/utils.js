/* Utilidades puras — sin dependencias */

export function uid(prefijo = '') {
  const c = globalThis.crypto
  if (c && c.randomUUID) return prefijo + c.randomUUID()
  return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export const n = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x }

export function fmtNum(v, moneda = '', dec = 2) {
  return moneda + n(v).toFixed(dec)
}

export function fmtCant(v) {
  const x = n(v)
  return String(Math.round(x * 1000) / 1000)
}

export function fmtFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtFH(ms) {
  if (!ms) return '—'
  const d = new Date(ms)
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function redondear(v, paso) {
  const p = n(paso)
  if (!p) return n(v)
  return Math.round(n(v) / p) * p
}

export function descargarArchivo(nombre, contenido, tipo = 'application/json') {
  const blob = new Blob([contenido], { type: tipo })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function aCSV(filas) {
  return filas.map(f => f.map(c => {
    const s = String(c ?? '')
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')).join('\n')
}

export function franjaHoraria(ms) {
  const h = new Date(ms).getHours()
  if (h >= 6 && h < 12) return 'Mañana'
  if (h >= 12 && h < 18) return 'Tarde'
  if (h >= 18 && h < 24) return 'Noche'
  return 'Madrugada'
}

export function mesKey(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function diaKey(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function dispositivoId() {
  let id = localStorage.getItem('tp6_device')
  if (!id) { id = uid('dev-'); localStorage.setItem('tp6_device', id) }
  return id
}

export const ahoraMs = () => Date.now()
