/* Cuadre Total — PDF ultra completo (jsPDF + autotable) */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtFecha, fmtFH, fmtCant } from './utils'

export function cuadrePDF(d) {
  const doc = new jsPDF()
  const M = d.config.moneda || ''
  const f = (v) => M + Number(v || 0).toFixed(2)
  const q = (v) => fmtCant(v)

  doc.setFontSize(18); doc.text(d.config.nombre || 'Tienda Pro', 14, 16)
  doc.setFontSize(11); doc.setTextColor(90)
  doc.text('CUADRE TOTAL', 14, 23)
  doc.text('Período: ' + fmtFecha(d.desde) + ' a ' + fmtFecha(d.hasta), 14, 29)
  doc.text('Generado: ' + fmtFH(Date.now()) + ' · Usuario: ' + (d.usuario || '—'), 14, 35)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 41, theme: 'grid', headStyles: { fillColor: [15, 23, 42] },
    head: [['RESUMEN EJECUTIVO', '']],
    body: [
      ['Ingresos por ventas', f(d.r.ingresos)],
      ['Costo de lo vendido (COGS)', '-' + f(d.r.cogs)],
      ['Ganancia bruta', f(d.r.bruta) + '  (' + d.r.margenB + '%)'],
      ['Mermas y ajustes', '-' + f(d.r.mermas)],
      ['Gastos operativos', '-' + f(d.r.gastos)],
      ['GANANCIA NETA', f(d.r.neta) + '  (' + d.r.margenN + '%)'],
      ['Ventas realizadas', d.r.numVentas + '  (' + d.r.anuladas + ' anuladas)'],
      ['Compras del período', f(d.r.compras)]
    ]
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [37, 99, 235] },
    head: [['POR PRODUCTO', 'Vend.', 'Ingresos', 'Costo', 'Ganancia', 'Margen', 'Compr.', 'Stock fin']],
    body: d.productos.map(p => [p.nombre, q(p.vendidas), f(p.ingresos), f(p.costo), f(p.ganancia), p.margen + '%', q(p.compradas), q(p.stockFinal)])
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [5, 150, 105] },
    head: [['POR DÍA', 'Ventas', 'Ingresos', 'Ganancia']],
    body: d.dias.map(x => [x.dia, x.ventas, f(x.ingresos), f(x.ganancia)])
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [5, 150, 105] },
    head: [['POR FRANJA HORARIA', 'Ventas', 'Ingresos']],
    body: d.franjas.map(x => [x.franja, x.ventas, f(x.ingresos)])
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [180, 83, 9] },
    head: [['MERMAS / AJUSTES', 'Producto', 'Motivo', 'Cant.', 'Costo']],
    body: d.mermas.map(x => [fmtFH(x.fecha), x.producto, x.motivo, q(x.cantidad), f(x.costo)])
  })

  autoTable(doc, {
    theme: 'grid', headStyles: { fillColor: [15, 23, 42] },
    head: [['CAJA', '']],
    body: [
      ['Saldo final de caja', f(d.caja.saldo)],
      ['Cobrado en efectivo', f(d.caja.efectivo)],
      ['Cobrado por transferencia', f(d.caja.transferencias)],
      ['Compras pagadas', '-' + f(d.caja.compras)],
      ['Arqueos con diferencia', d.caja.arqueosDiff + ' de ' + d.caja.arqueosTotal]
    ]
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [100, 116, 139] },
    head: [['ARQUEOS', 'Fecha', 'Esperado', 'Físico', 'Diferencia', 'Responsable']],
    body: d.arqueos.map(x => [x.titulo, fmtFH(x.fecha), f(x.esperado), f(x.fisico), (x.diff >= 0 ? '+' : '-') + f(Math.abs(x.diff)), x.usuario])
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [124, 58, 237] },
    head: [['PATRIMONIO', 'Fecha', 'Monto', 'Nota']],
    body: d.patrimonio.map(x => [x.tipo, fmtFH(x.fecha), (x.tipo === 'Retiro' ? '-' : '+') + f(x.monto), x.nota || ''])
  })

  autoTable(doc, {
    theme: 'striped', headStyles: { fillColor: [190, 18, 60] },
    head: [['ANULACIONES Y OPERACIONES SENSIBLES', 'Fecha', 'Detalle', 'Usuario']],
    body: d.anulaciones.map(x => [x.accion, fmtFH(x.fecha), x.detalle, x.usuario])
  })

  doc.save('cuadre-' + (d.config.nombre || 'tienda').toLowerCase().replace(/\s+/g, '-') + '.pdf')
}
