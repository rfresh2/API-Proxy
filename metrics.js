const pg = require('pg')


class MetricsClient {
    constructor() {
        this.client = new pg.Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        })
    }

    async start() {
        await this.client.connect()   
        console.log("Connected to metrics DB")
    }

    async stop() {
        await this.client.stop()
        console.log("Disconnected from metrics DB")
    }

    async addRequestCount(requestCount) {
        const query = {
            text: 'INSERT INTO api_proxy_request_count_metrics (time, request_count) VALUES ($1, $2)',
            values: [new Date().toISOString(), requestCount],
        }
        await this.client.query(query)
    }
}

module.exports = MetricsClient
