const errorHandler = (err, req, res, next) => {
  logT(err.message);
  res.status(500).json({
    error: err.message
  })
};

function logT(msg) {
  console.log(`${new Date().toISOString()} ${msg}`)
}

module.exports = errorHandler;
