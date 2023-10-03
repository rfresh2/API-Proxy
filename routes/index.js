const url = require('url');
const express = require('express');
const router = express.Router();
const needle = require('needle');
const NodeCache = require( "node-cache" );
const { log } = require('console');
const crypto = require('crypto');

const API_BASE_URL = "https://api.github.com";
const API_KEY_VALUE = process.env.API_KEY_VALUE;
const BASE_PATH = "/repos/rfresh2/ZenithProxy/releases";
const enforcedHeaders = {
  "User-Agent": "ZenithProxy/1.1",
  "Connection": "close",
  "Authorization": `Bearer ${API_KEY_VALUE}`
}
const reqCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 20,
  maxKeys: 10,
  forceString: true
});

var reqCount = 0;
var reqBucketEpochSec = new Date().getTime() / 1000;

router.get('/**', async (req, res, next) => {
  try {
    // only proxy for my own repo. i don't forsee any valid use case otherwise
    if (!req.url.startsWith(BASE_PATH)) {
      res.status(500)
      next(new Error("Unsupported route: " + req.url))
      return;
    }
    countReq();
    const dest = `${API_BASE_URL}${req.url}`
    const agent = req.headers['user-agent'] || "?";
    const cacheKey = getCacheKey(req, dest);
    const cachedRes = reqCache.get(cacheKey);
    const cacheHit = cachedRes !== undefined;
    const proxiedRes = await proxyWithCache(req, dest, cachedRes);
    if (!cacheHit && proxiedRes.statusCode === 200) {
      reqCache.set(cacheKey, new CacheResponse(proxiedRes.statusCode, proxiedRes.headers, proxiedRes.body, new Date()));
    }
    logT(`${proxiedRes.statusCode} ${cacheHit} ${agent} ${req.url.replace(BASE_PATH, '')}`)
    res.status(proxiedRes.statusCode).set(proxiedRes.headers).send(proxiedRes.body);
  } catch (error) {
    next(error);
  }
});

async function proxyWithCache(req, dest, cachedRes) {
  if (cachedRes !== undefined) {
    return cachedRes;
  } else {
    let reqHeaders = enforcedHeaders;
    reqHeaders['Accept'] = req.headers['accept'];
    reqHeaders['X-GitHub-Api-Version'] = req.headers['x-github-api-version'];
    const options = {
      headers: reqHeaders
    }
    return await needle('get', dest, options);
  }
}

function logT(msg) {
  console.log(`${new Date().toISOString()} ${msg}`)
}

function getCacheKey(req, dest) {
  // combine dest path and specific headers for api version and accept encoding to make a unique key

  const headers = {}
  if (req.headers['x-github-api-version'] !== undefined) {
    headers['X-GitHub-Api-Version'] = req.headers['x-github-api-version'];
  }
  if (req.headers['accept'] !== undefined) {
    headers['Accept'] = req.headers['accept'];
  }
  const headersStr = JSON.stringify(headers);
  return crypto.createHash("md5").update(`${dest}${headersStr}`).digest("base64");
}

function countReq() {
  const nowEpochSec = new Date().getTime() / 1000;
  if (nowEpochSec - reqBucketEpochSec > 300) {
    logT(`${reqCount} requests in prev 5 minute bucket`)
    reqCount = 0;
    reqBucketEpochSec = nowEpochSec;
  }
  reqCount++;
}

class CacheResponse {
  constructor(statusCode, headers, body, time) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
    this.time = time;
  }
}

module.exports = router;
