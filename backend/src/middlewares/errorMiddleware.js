export function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

/** node-postgres errors use string codes like 23503 */
function isPostgresError(err) {
  return Boolean(err && typeof err.code === 'string' && /^\d{5}$/.test(err.code) && err.severity);
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.statusCode || 500;
  const body = {
    message: err.message || 'Server error',
  };
  if (err.code && !isPostgresError(err)) body.code = err.code;

  if (isPostgresError(err)) {
    body.db = {
      code: err.code,
      constraint: err.constraint || undefined,
      table: err.table || undefined,
      column: err.column || undefined,
      detail: err.detail || undefined,
    };
    if (err.code === '23502') {
      status = 422;
      body.message =
        err.detail ||
        'A required database column was null or invalid (NOT NULL violation).';
      body.code = 'DB_NOT_NULL_VIOLATION';
    } else if (err.code === '23503') {
      status = 422;
      body.message =
        err.detail ||
        'Foreign key violation: referenced row does not exist.';
      body.code = 'DB_FOREIGN_KEY_VIOLATION';
    } else if (err.code === '23505') {
      status = 409;
      body.message = err.detail || 'Unique constraint violation.';
      body.code = 'DB_UNIQUE_VIOLATION';
    } else {
      body.code = `DB_${err.code}`;
    }
  }

  res.status(status).json(body);
}

