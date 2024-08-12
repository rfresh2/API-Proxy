const pg = require('pg')


class MetricsClient {
    constructor() {
        this.pool = new pg.Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 2,
        })

        this.pool.on('error', (err, client) => {
            console.log('PG pool error', err)
        })
    }

    async stop() {
        await this.pool.end()
        console.log("Disconnected from metrics DB")
    }

    async addRequestCount(requestCount) {
        const query = {
            text: 'INSERT INTO api_proxy_request_count_metrics (time, request_count) VALUES ($1, $2)',
            values: [new Date().toISOString(), requestCount],
        }
        await this.pool.query(query)
    }
}

module.exports = MetricsClient
