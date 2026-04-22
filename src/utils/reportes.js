import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatearMoneda, formatearFecha, calcularSaldoPrestamo } from './calculos'

const DARK = [13, 15, 24]
const HEADER_BG = [30, 35, 55]
const ACCENT = [99, 102, 241]
const GOLD = [212, 175, 55]
const TEXT_LIGHT = [226, 232, 240]
const TEXT_MUTED = [100, 116, 139]
const ROW_ALT = [20, 23, 35]
const ROW_BASE = [15, 17, 27]
const BORDER = [40, 45, 65]

function encabezado(doc, titulo, subtitulo) {
  const ancho = doc.internal.pageSize.getWidth()

  doc.setFillColor(...DARK)
  doc.rect(0, 0, ancho, 297, 'F')

  doc.setFillColor(...HEADER_BG)
  doc.rect(0, 0, ancho, 42, 'F')

  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, 5, 42, 'F')

  doc.setFontSize(10)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('PrestamosFácil', 14, 14)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_LIGHT)
  doc.text(titulo, 14, 26)

  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MUTED)
    doc.text(subtitulo, 14, 35)
  }

  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Generado: ${fecha}`, ancho - 14, 35, { align: 'right' })

  return 50
}

function pie(doc) {
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  doc.setFillColor(...HEADER_BG)
  doc.rect(0, alto - 12, ancho, 12, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('PrestamosFácil — Documento generado automáticamente', ancho / 2, alto - 4, { align: 'center' })
}

function estiloTabla(startY) {
  return {
    startY,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      textColor: TEXT_LIGHT,
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: GOLD,
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    rowPageBreakMode: 'avoid',
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
      }
    },
    didDrawPage(data) {
      pie(data.doc)
    },
  }
}

export function generarReportePrestamos(prestamos) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const activos = prestamos.filter(p => p.estado !== 'completado').length
  const mora = prestamos.filter(p => p.estado === 'mora').length
  const startY = encabezado(doc, 'Reporte de Préstamos', `${prestamos.length} préstamos · ${activos} activos · ${mora} en mora`)

  const filas = prestamos.map(p => {
    const calculo = calcularSaldoPrestamo(p, p.abonos || [])
    return [
      p.cliente?.nombre_completo || '—',
      p.cobrador?.nombre_completo || 'Sin cobrador',
      formatearMoneda(p.monto_prestado),
      `${p.tasa_interes_mensual}%`,
      formatearMoneda(calculo.totalDeuda),
      formatearMoneda(calculo.totalAbonado),
      formatearMoneda(calculo.saldo),
      formatearFecha(p.fecha_vencimiento),
      p.estado === 'activo' ? 'Activo' : p.estado === 'mora' ? 'En mora' : 'Pagado',
    ]
  })

  autoTable(doc, {
    ...estiloTabla(startY),
    head: [['Cliente', 'Cobrador', 'Prestado', 'Interés', 'Total deuda', 'Abonado', 'Saldo', 'Vencimiento', 'Estado']],
    body: filas,
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
        const estado = data.row.raw[8]
        if (data.column.index === 8) {
          if (estado === 'En mora') data.cell.styles.textColor = [248, 113, 113]
          else if (estado === 'Pagado') data.cell.styles.textColor = [99, 102, 241]
          else data.cell.styles.textColor = [52, 211, 153]
        }
      }
    },
  })

  doc.save('prestamos.pdf')
}

export function generarReporteClientes(clientes) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const startY = encabezado(doc, 'Reporte de Clientes', `${clientes.length} clientes registrados`)

  const filas = clientes.map(c => {
    const activos = (c.prestamos || []).filter(p => p.estado !== 'completado').length
    return [
      c.nombre_completo,
      c.cedula || '—',
      c.telefono || '—',
      c.barrio || c.direccion || '—',
      c.cobrador?.nombre_completo || 'Sin asignar',
      activos,
      c.estado === 'activo' ? 'Activo' : 'Inactivo',
    ]
  })

  autoTable(doc, {
    ...estiloTabla(startY),
    head: [['Nombre', 'Cédula', 'Teléfono', 'Barrio', 'Cobrador', 'Préstamos activos', 'Estado']],
    body: filas,
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
        if (data.column.index === 6) {
          data.cell.styles.textColor = data.row.raw[6] === 'Activo' ? [52, 211, 153] : [248, 113, 113]
        }
      }
    },
  })

  doc.save('clientes.pdf')
}

export function generarReporteCapital(resumen, movimientos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const startY = encabezado(doc, 'Reporte de Capital', 'Flujo de dinero del negocio')
  const ancho = doc.internal.pageSize.getWidth()

  // Tarjetas de resumen
  const tarjetas = [
    { label: 'Capital disponible', valor: formatearMoneda(resumen.capitalDisponible), color: [52, 211, 153] },
    { label: 'Capital en calle', valor: formatearMoneda(resumen.capitalEnCalle), color: [99, 102, 241] },
    { label: 'Total ingresado', valor: formatearMoneda(resumen.totalIngresado), color: [212, 175, 55] },
    { label: 'Total recaudado', valor: formatearMoneda(resumen.totalRecaudado), color: [52, 211, 153] },
  ]

  const cardW = (ancho - 28 - 9) / 4
  tarjetas.forEach((t, i) => {
    const x = 14 + i * (cardW + 3)
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(x, startY, cardW, 22, 2, 2, 'F')
    doc.setFillColor(...t.color)
    doc.rect(x, startY, 3, 22, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(t.label, x + 6, startY + 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...t.color)
    doc.text(t.valor, x + 6, startY + 17)
    doc.setFont('helvetica', 'normal')
  })

  const filas = movimientos.map(m => [
    formatearFecha(m.created_at?.split('T')[0]),
    m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
    m.descripcion || '—',
    formatearMoneda(m.monto),
  ])

  autoTable(doc, {
    ...estiloTabla(startY + 30),
    head: [['Fecha', 'Tipo', 'Descripción', 'Monto']],
    body: filas,
    columnStyles: { 3: { halign: 'right' } },
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
        if (data.column.index === 1) {
          data.cell.styles.textColor = data.row.raw[1] === 'Ingreso' ? [52, 211, 153] : [248, 113, 113]
        }
        if (data.column.index === 3) {
          data.cell.styles.textColor = data.row.raw[1] === 'Ingreso' ? [52, 211, 153] : [248, 113, 113]
        }
      }
    },
  })

  doc.save('capital.pdf')
}

export function generarReporteCobradores(cobradores, clientes, abonos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const startY = encabezado(doc, 'Reporte de Cobradores', `${cobradores.filter(c => c.activo).length} activos de ${cobradores.length} registrados`)

  const filas = cobradores.map(cb => {
    const clientesAsig = clientes.filter(c => c.cobrador_id === cb.id && c.estado === 'activo').length
    const totalRecaudado = abonos.filter(a => a.cobrador_id === cb.id).reduce((s, a) => s + a.monto, 0)
    return [
      cb.nombre_completo,
      cb.email || '—',
      cb.telefono || '—',
      clientesAsig,
      formatearMoneda(totalRecaudado),
      cb.activo ? 'Activo' : 'Inactivo',
    ]
  })

  autoTable(doc, {
    ...estiloTabla(startY),
    head: [['Nombre', 'Correo', 'Teléfono', 'Clientes asignados', 'Total recaudado', 'Estado']],
    body: filas,
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
        if (data.column.index === 5) {
          data.cell.styles.textColor = data.row.raw[5] === 'Activo' ? [52, 211, 153] : [248, 113, 113]
        }
      }
    },
  })

  doc.save('cobradores.pdf')
}
