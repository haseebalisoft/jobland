export function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode || 500;
  const body = {
    message: err.message || 'Server error',
  };
  if (err.code) body.code = err.code;
  res.status(status).json(body);
}

