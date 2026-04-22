/**
 * Calcula el saldo actual de un préstamo con interés simple mensual.
 *
 * Regla del negocio:
 *   - meses_plazo  = meses entre fecha_inicio y fecha_vencimiento (interés del periodo pactado)
 *   - interés_normal = monto × tasa × meses_plazo
 *   - interés_mora   = monto × tasa × meses_mora  (se acumula mes a mes tras vencimiento)
 *   - total_deuda    = monto + interés_normal + interés_mora
 */
export function calcularSaldoPrestamo(prestamo, abonos = []) {
  const { monto_prestado, tasa_interes_mensual, meses_mora, fecha_inicio, fecha_vencimiento } = prestamo
  const totalAbonado = abonos.reduce((sum, a) => sum + a.monto, 0)
  const tasa = tasa_interes_mensual / 100

  // Meses del plazo pactado (interés simple sobre el periodo acordado)
  let mesesPlazo = 1
  if (fecha_inicio && fecha_vencimiento) {
    const inicio = new Date(fecha_inicio + 'T00:00:00')
    const fin    = new Date(fecha_vencimiento + 'T00:00:00')
    const diffMs = fin - inicio
    mesesPlazo = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)))
  }

  const interesNormal = monto_prestado * tasa * mesesPlazo
  const interesMora   = monto_prestado * tasa * (meses_mora || 0)
  const totalDeuda    = monto_prestado + interesNormal + interesMora
  const saldo         = Math.max(0, totalDeuda - totalAbonado)

  return {
    montoOriginal: monto_prestado,
    mesesPlazo,
    interesNormal,
    interesMora,
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
