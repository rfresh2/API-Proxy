const url = require('url');
const express = require('express');
const router = express.Router();
const needle = require('needle');
const apicache = require('apicache');

const API_BASE_URL = "https://api.github.com";
const API_KEY_VALUE = process.env.API_KEY_VALUE;
const headers = {
  "User-Agent": "ZenithProxy/1.1",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
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
    const options = {
      headers: headers
    }
    const dest = `${API_BASE_URL}${req.url}`
    console.log(dest)
    const apiRes = await needle('get', dest, options);
    const data = apiRes.body;
    console.log(`${apiRes.statusCode} ${dest}`)
    res.status(apiRes.statusCode).json(data);
  } catch (error) {
    error.
    next(error);
  }
});

module.exports = router;
