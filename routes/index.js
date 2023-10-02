const url = require('url');
const express = require('express');
const router = express.Router();
const needle = require('needle');
const apicache = require('apicache');

const API_BASE_URL = "https://api.github.com";
const API_KEY_VALUE = process.env.API_KEY_VALUE;
const enforcedHeaders = {
  "User-Agent": "ZenithProxy/1.1",
  "Connection": "close",
  "Authorization": `Bearer ${API_KEY_VALUE}`
}

// Initialize cache
let cache = apicache.middleware;

router.get('/**', cache('2 minutes'), async (req, res, next) => {
  try {
    // only proxy for my own repo. i don't forsee any valid use case otherwise
    if (!req.url.startsWith("/repos/rfresh2/ZenithProxy")) {
      res.status(500)
      next(new Error("Unsupported route: " + req.url))
      return;
    }
    let reqHeaders = enforcedHeaders;
    reqHeaders['Accept'] = req.headers['accept'];
    reqHeaders['X-GitHub-Api-Version'] = req.headers['x-github-api-version'];
    const options = {
      headers: reqHeaders
    }
    const dest = `${API_BASE_URL}${req.url}`
    const apiRes = await needle('get', dest, options);
    const data = apiRes.body;
    console.log(`${apiRes.statusCode} ${dest}`)
    res.status(apiRes.statusCode).set(apiRes.headers).send(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
