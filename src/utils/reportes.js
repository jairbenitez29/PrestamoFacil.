import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatearMoneda, formatearFecha, calcularSaldoPrestamo } from './calculos'

const DARK       = [13,  15,  24]
const HEADER_BG  = [30,  35,  55]
const ACCENT     = [99,  102, 241]
const GOLD       = [212, 175, 55]
const TEXT_LIGHT = [226, 232, 240]
const TEXT_MUTED = [100, 116, 139]
const ROW_ALT    = [20,  23,  35]
const ROW_BASE   = [15,  17,  27]
const BORDER     = [40,  45,  65]

const HEADER_H = 42
const FOOTER_H = 12

function dibujarPagina(doc, titulo, subtitulo, totalPaginas) {
  const ancho = doc.internal.pageSize.getWidth()
  const alto  = doc.internal.pageSize.getHeight()
  const pag   = doc.internal.getCurrentPageInfo().pageNumber

  // Fondo completo
  doc.setFillColor(...DARK)
  doc.rect(0, 0, ancho, alto, 'F')

  // Franja de encabezado
  doc.setFillColor(...HEADER_BG)
  doc.rect(0, 0, ancho, HEADER_H, 'F')

  // Borde izquierdo accent
  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, 5, HEADER_H, 'F')

  if (pag === 1) {
    // Primera página: encabezado completo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
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
  } else {
    // Páginas siguientes: encabezado compacto
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_LIGHT)
    doc.text(titulo, 14, 16)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MUTED)
    doc.text('PrestamosFácil', 14, 25)

    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Página ${pag}${totalPaginas ? ` de ${totalPaginas}` : ''}`, ancho - 14, 20, { align: 'right' })
  }

  // Pie
  doc.setFillColor(...HEADER_BG)
  doc.rect(0, alto - FOOTER_H, ancho, FOOTER_H, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('PrestamosFácil — Documento generado automáticamente', ancho / 2, alto - 4, { align: 'center' })
  if (pag === 1) {
    doc.text('Pág. 1', ancho - 14, alto - 4, { align: 'right' })
  } else {
    doc.text(`Pág. ${pag}`, ancho - 14, alto - 4, { align: 'right' })
  }
}

function estiloTabla(startY, titulo, subtitulo) {
  return {
    startY,
    margin: { top: HEADER_H + 4, bottom: FOOTER_H + 4, left: 14, right: 14 },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      textColor: TEXT_LIGHT,
      lineColor: BORDER,
      lineWidth: 0.1,
      overflow: 'linebreak',
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
    didDrawPage(data) {
      dibujarPagina(data.doc, titulo, subtitulo, null)
    },
  }
}

export function generarReportePrestamos(prestamos) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const activos = prestamos.filter(p => p.estado !== 'completado').length
  const mora    = prestamos.filter(p => p.estado === 'mora').length
  const titulo    = 'Reporte de Préstamos'
  const subtitulo = `${prestamos.length} préstamos · ${activos} activos · ${mora} en mora`

  dibujarPagina(doc, titulo, subtitulo, null)

  const filas = prestamos.map(p => {
    const c = calcularSaldoPrestamo(p, p.abonos || [])
    return [
      p.cliente?.nombre_completo || '—',
      p.cobrador?.nombre_completo || 'Sin cobrador',
      formatearMoneda(p.monto_prestado),
      `${p.tasa_interes_mensual}%`,
      formatearMoneda(c.totalDeuda),
      formatearMoneda(c.totalAbonado),
      formatearMoneda(c.saldo),
      formatearFecha(p.fecha_vencimiento),
      p.estado === 'activo' ? 'Activo' : p.estado === 'mora' ? 'En mora' : 'Pagado',
    ]
  })

  autoTable(doc, {
    ...estiloTabla(HEADER_H + 6, titulo, subtitulo),
    head: [['Cliente', 'Cobrador', 'Prestado', 'Interés', 'Total deuda', 'Abonado', 'Saldo', 'Vencimiento', 'Estado']],
    body: filas,
    didParseCell(data) {
      if (data.section === 'body') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_BASE : ROW_ALT
        if (data.column.index === 8) {
          const e = data.row.raw[8]
          if (e === 'En mora')  data.cell.styles.textColor = [248, 113, 113]
          else if (e === 'Pagado') data.cell.styles.textColor = [99, 102, 241]
          else data.cell.styles.textColor = [52, 211, 153]
        }
      }
    },
    didDrawPage(data) { dibujarPagina(data.doc, titulo, subtitulo, null) },
  })

  doc.save('prestamos.pdf')
}

export function generarReporteClientes(clientes) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const titulo    = 'Reporte de Clientes'
  const subtitulo = `${clientes.length} clientes registrados`

  dibujarPagina(doc, titulo, subtitulo, null)

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
    ...estiloTabla(HEADER_H + 6, titulo, subtitulo),
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
    didDrawPage(data) { dibujarPagina(data.doc, titulo, subtitulo, null) },
  })

  doc.save('clientes.pdf')
}

export function generarReporteCapital(resumen, movimientos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho     = doc.internal.pageSize.getWidth()
  const titulo    = 'Reporte de Capital'
  const subtitulo = 'Flujo de dinero del negocio'

  dibujarPagina(doc, titulo, subtitulo, null)

  // Tarjetas de resumen en página 1
  const tarjetas = [
    { label: 'Capital disponible', valor: formatearMoneda(resumen.capitalDisponible), color: [52, 211, 153] },
    { label: 'Capital en calle',   valor: formatearMoneda(resumen.capitalEnCalle),    color: [99, 102, 241] },
    { label: 'Total ingresado',    valor: formatearMoneda(resumen.totalIngresado),    color: [212, 175, 55] },
    { label: 'Total recaudado',    valor: formatearMoneda(resumen.totalRecaudado),    color: [52, 211, 153] },
  ]
  const cardW = (ancho - 28 - 9) / 4
  const cardY = HEADER_H + 6
  tarjetas.forEach((t, i) => {
    const x = 14 + i * (cardW + 3)
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(x, cardY, cardW, 22, 2, 2, 'F')
    doc.setFillColor(...t.color)
    doc.rect(x, cardY, 3, 22, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MUTED)
    doc.text(t.label, x + 6, cardY + 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...t.color)
    doc.text(t.valor, x + 6, cardY + 17)
    doc.setFont('helvetica', 'normal')
  })

  const filas = movimientos.map(m => [
    formatearFecha(m.created_at?.split('T')[0]),
    m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
    m.descripcion || '—',
    formatearMoneda(m.monto),
  ])

  autoTable(doc, {
    ...estiloTabla(cardY + 28, titulo, subtitulo),
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
    didDrawPage(data) { dibujarPagina(data.doc, titulo, subtitulo, null) },
  })

  doc.save('capital.pdf')
}

export function generarReporteCobradores(cobradores, clientes, abonos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const titulo    = 'Reporte de Cobradores'
  const subtitulo = `${cobradores.filter(c => c.activo).length} activos de ${cobradores.length} registrados`

  dibujarPagina(doc, titulo, subtitulo, null)

  const filas = cobradores.map(cb => {
    const clientesAsig    = clientes.filter(c => c.cobrador_id === cb.id && c.estado === 'activo').length
    const totalRecaudado  = abonos.filter(a => a.cobrador_id === cb.id).reduce((s, a) => s + a.monto, 0)
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
    ...estiloTabla(HEADER_H + 6, titulo, subtitulo),
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
    didDrawPage(data) { dibujarPagina(data.doc, titulo, subtitulo, null) },
  })

  doc.save('cobradores.pdf')
}
