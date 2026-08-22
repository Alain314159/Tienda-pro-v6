/* Escáner de código de barras con la cámara */
import { Html5Qrcode } from 'html5-qrcode'

export function crearScanner(elementId, onDetect) {
  const s = new Html5Qrcode(elementId)
  let activo = false
  return {
    async iniciar() {
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 140 } },
        (texto) => { if (!activo) { activo = true; onDetect(texto); setTimeout(() => { activo = false }, 1200) } },
        () => {}
      )
    },
    async detener() {
      try { await s.stop(); s.clear() } catch (e) {}
    }
  }
}
