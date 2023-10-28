const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down')
const errorHandler = require('./middleware/error');
const MetricsClient = require('./metrics');
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
  delayMs: () => 500,
  maxDelayMs: 3000
});
app.use(limiter);
app.use(speedLimiter)
app.set('trust proxy', 1);

function logT(msg) {
  console.log(`${new Date().toISOString()} ${msg}`)
}

var reqCount = 0;
var reqBucketEpochSec = new Date().getTime() / 1000;

const metricsClient = new MetricsClient()
const metricsEnabled = process.env.METRICS !== undefined && process.env.METRICS === "true"

async function startMetrics() {
  if (metricsEnabled) {
    await metricsClient.start()
  }
}
startMetrics().catch(err => {
  console.log("Error starting metrics client: " + err)
})

function countReq() {
  const nowEpochSec = new Date().getTime() / 1000;
  if (nowEpochSec - reqBucketEpochSec > 300) {
    logT(`${reqCount} requests in prev 5 minute bucket`)
    if (metricsEnabled) {
      try {
        metricsClient.addRequestCount(reqCount).catch(err => {
          console.log("Error writing metrics: " + err)
        })
      } catch (err) {
        console.log("Error writing metrics: " + err)
      }
    }
    reqCount = 0;
    reqBucketEpochSec = nowEpochSec;
  }
  reqCount++;
}

const onResponse = (req, res, next) => {
  res.on("finish", () => {
    countReq();
    const cacheHit = res.getHeaders()['apicache-store'] !== undefined ? "HIT" : "MISS"
    const agent = req.headers['user-agent'] || "?";
    logT(`${res.statusCode} ${cacheHit} ${agent} ${req.url}`)
  });
  next();
}

app.use(onResponse)

// Routes
app.use('/', require('./routes'));

// Enable cors
app.use(cors());

// Error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
