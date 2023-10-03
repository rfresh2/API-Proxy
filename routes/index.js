const url = require('url');
const express = require('express');
const router = express.Router();
const needle = require('needle');
const NodeCache = require( "node-cache" );
const { log } = require('console');
const crypto = require('crypto');

const API_BASE_URL = "https://api.github.com";
const API_KEY_VALUE = process.env.API_KEY_VALUE;
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

router.get('/**', async (req, res, next) => {
  try {
    // only proxy for my own repo. i don't forsee any valid use case otherwise
    if (!req.url.startsWith("/repos/rfresh2/ZenithProxy/releases")) {
      res.status(500)
      next(new Error("Unsupported route: " + req.url))
      return;
    }
    const dest = `${API_BASE_URL}${req.url}`
    const cacheKey = getCacheKey(req, dest);
    const cachedRes = reqCache.get(cacheKey);
    const cacheHit = cachedRes !== undefined;
    var proxiedRes = await proxyWithCache(req, dest, cachedRes);
    if (!cacheHit && proxiedRes.statusCode === 200) {
      reqCache.set(cacheKey, new CacheResponse(proxiedRes.statusCode, proxiedRes.headers, proxiedRes.body, new Date()));
    }
    logT(`${proxiedRes.statusCode} ${cacheHit} ${dest}`)
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

class CacheResponse {
  constructor(statusCode, headers, body, time) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
    this.time = time;
  }
}

module.exports = router;
