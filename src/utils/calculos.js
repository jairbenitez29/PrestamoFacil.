/**
 * Calcula el saldo actual de un préstamo considerando interés y mora.
 * Regla: 20% mensual de interés. Si hay mora, +20% por cada mes vencido.
 */
export function calcularSaldoPrestamo(prestamo, abonos = []) {
  const { monto_prestado, tasa_interes_mensual, meses_mora } = prestamo
  const totalAbonado = abonos.reduce((sum, a) => sum + a.monto, 0)

  const interesMensual = monto_prestado * (tasa_interes_mensual / 100)
  const interesTotal = interesMensual + (monto_prestado * (tasa_interes_mensual / 100) * meses_mora)
  const totalDeuda = monto_prestado + interesTotal
  const saldo = Math.max(0, totalDeuda - totalAbonado)

  return {
    montoOriginal: monto_prestado,
    interesNormal: interesMensual,
    interesMora: monto_prestado * (tasa_interes_mensual / 100) * meses_mora,
    totalDeuda,
    totalAbonado,
    saldo,
    porcentajePagado: totalDeuda > 0 ? Math.min(100, (totalAbonado / totalDeuda) * 100) : 0,
  }
}

export function calcularMesesMora(fechaVencimiento) {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  if (hoy <= vencimiento) return 0
  const diffMs = hoy - vencimiento
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30))
}

export function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatearFecha(fechaStr) {
  if (!fechaStr) return '—'
  const fecha = new Date(fechaStr + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return '—'
  const fecha = new Date(fechaStr + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function estaVencido(fechaVencimiento) {
  const hoy = new Date().toISOString().split('T')[0]
  return fechaVencimiento < hoy
}

export function diasParaVencer(fechaVencimiento) {
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento + 'T00:00:00')
  const diffMs = vencimiento - hoy
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
