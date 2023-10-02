const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down')
const errorHandler = require('./middleware/error');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const app = express();

// Rate Limiting
const limiter = rateLimit({
  windowMS: 10 * 60 * 1000, // 10 mins
  max: 1000,
});
const speedLimiter = slowDown({
  windowMS: 10 * 60 * 1000, // 10 mins
  delayAfter: 800,
  delayMs: 500,
  maxDelayMs: 3000,
  onLimitReached: function (req, res, options) {
    console.log('!Speed limiter reached limit!')
  }
});
app.use(limiter);
app.use(speedLimiter)
app.set('trust proxy', 1);

// Routes
app.use('/', require('./routes'));

// Enable cors
app.use(cors());

// Error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
