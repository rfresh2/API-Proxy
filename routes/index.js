const express = require('express');
const router = express.Router();
const needle = require('needle');
const crypto = require('crypto');
const apicache = require('apicache');

const API_BASE_URL = "https://api.github.com";
const API_KEY_VALUE = process.env.API_KEY_VALUE;
const BASE_PATH = "/repos/rfresh2/ZenithProxy/releases";
const BASE_HEADERS = {
  "User-Agent": "ZenithProxy/1.1",
  "Connection": "close",
  "Authorization": `Bearer ${API_KEY_VALUE}`
}

let cache = apicache.options({
  appendKey: (req, res) => {
    const headers = {}
    if (req.headers['x-github-api-version'] !== undefined) {
      headers['X-GitHub-Api-Version'] = req.headers['x-github-api-version'];
    }
    if (req.headers['accept'] !== undefined) {
      headers['Accept'] = req.headers['accept'];
    }
    const headersStr = JSON.stringify(headers);
    return crypto.createHash("md5").update(`${req.url}${headersStr}`).digest("base64");
  },
  statusCodes: {
    include: [200, 302]
  },
  debug: false
}).middleware;

router.get('/**', cache('3 minutes'), async (req, res, next) => {
  try {
    // only proxy for my own repo. i don't forsee any valid use case otherwise
    if (!req.url.startsWith(BASE_PATH)) {
      res.status(500)
      next(new Error("Unsupported route: " + req.url))
      return;
    }
    const proxiedRes = await proxyRequest(req, `${API_BASE_URL}${req.url}`);
    res.status(proxiedRes.statusCode).set(proxiedRes.headers).send(proxiedRes.body);
  } catch (error) {
    next(error);
  }
});

async function proxyRequest(req, dest) {
  let reqHeaders = BASE_HEADERS;
  reqHeaders['Accept'] = req.headers['accept'];
  reqHeaders['X-GitHub-Api-Version'] = req.headers['x-github-api-version'];
  const options = {
    headers: reqHeaders
  }
  return await needle('get', dest, options);
}

module.exports = router;
