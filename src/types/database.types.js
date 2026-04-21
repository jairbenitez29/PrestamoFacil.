/**
 * @typedef {'admin' | 'cobrador'} UserRole
 * @typedef {'activo' | 'completado' | 'mora'} LoanStatus
 * @typedef {'activo' | 'inactivo'} ClientStatus
 */

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} nombre_completo
 * @property {string} email
 * @property {UserRole} rol
 * @property {string} telefono
 * @property {boolean} activo
 * @property {string} created_at
 */

/**
 * @typedef {Object} Client
 * @property {string} id
 * @property {string} nombre_completo
 * @property {string} cedula
 * @property {string} telefono
 * @property {string} direccion
 * @property {string} barrio
 * @property {ClientStatus} estado
 * @property {string|null} cobrador_id
 * @property {string} created_at
 * @property {string} created_by
 */

/**
 * @typedef {Object} Loan
 * @property {string} id
 * @property {string} cliente_id
 * @property {string} cobrador_id
 * @property {number} monto_prestado
 * @property {number} tasa_interes_mensual
 * @property {string} fecha_inicio
 * @property {string} fecha_vencimiento
 * @property {number} meses_mora
 * @property {LoanStatus} estado
 * @property {string} created_at
 * @property {string} created_by
 */

/**
 * @typedef {Object} Abono
 * @property {string} id
 * @property {string} prestamo_id
 * @property {string} cobrador_id
 * @property {number} monto
 * @property {string} fecha_pago
 * @property {string|null} observacion
 * @property {string} created_at
 */

/**
 * @typedef {Object} CapitalMovimiento
 * @property {string} id
 * @property {'ingreso' | 'egreso'} tipo
 * @property {number} monto
 * @property {string} descripcion
 * @property {string} created_at
 * @property {string} created_by
 */
