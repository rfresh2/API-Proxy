const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down')
const errorHandler = require('./middleware/error');
const MetricsClient = require('./metrics');
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')

const scheduler = new ToadScheduler()
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

const metricsClient = new MetricsClient()
const metricsEnabled = process.env.METRICS !== undefined && process.env.METRICS === "true"

const metricsTask = new AsyncTask('metrics', async () => {
  try {
    logT(`Request Count: ${reqCount}`)
    let c = reqCount;
    reqCount = 0;
    await metricsClient.addRequestCount(c).catch(err => {
      logT("Error writing metrics: " + err)
    });
  } catch (err) {
    logT("Error writing metrics: " + err)
  }
}, (err) => {
  logT("Error in metrics task: " + err)
})
const metricsJob = new SimpleIntervalJob({ minutes: 5 }, metricsTask)

async function startMetrics() {
  if (metricsEnabled) {
    scheduler.addSimpleIntervalJob(metricsJob)
  }
};

startMetrics().catch(err => {
  console.log("Error starting metrics client: " + err)
})

const onResponse = (req, res, next) => {
  res.on("finish", () => {
    if (metricsEnabled) reqCount++
    const requestListCacheHit = res.getHeaders()['zenithproxy-cache'] !== undefined ? "ZHIT" : "ZMISS"
    const apiCacheHit = res.getHeaders()['apicache-store'] !== undefined ? "HIT" : "MISS"
    const cacheHit = requestListCacheHit === "ZHIT" ? requestListCacheHit : apiCacheHit
    const agent = req.headers['user-agent'] || "?"
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
