const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (error, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = error.message || 'Server error';

  if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}.`;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((e) => e.message).join(' ');
  } else if (error.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ') || 'a unique field'}.`;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body.';
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
