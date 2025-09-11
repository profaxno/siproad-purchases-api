import { env } from "process";

export const config = () => ({
    env: process.env.NODE_ENV,
    port: +process.env.PORT || 80,
    httpTimeout: +process.env.HTTP_TIMEOUT || 10000,
    httpMaxRedirects: +process.env.HTTP_MAX_REDIRECTS || 3,
    executionRetries: +process.env.EXECUTION_RETRIES || 2,
    executionBaseDelay: +process.env.EXECUTION_BASE_DELAY || 1000,

    dbDefaultLimit: +process.env.DB_DEFAULT_LIMIT || 1000,

    redisHost: process.env.REDIS_HOST,
    redisPort: +process.env.REDIS_PORT || 6379,
    redisPassword: process.env.REDIS_PASSWORD,
    redisFamily: +process.env.REDIS_FAMILY,
    redisJobQueuePurchases: process.env.REDIS_JOB_QUEUE_PURCHASES,
    redisJobQueueProducts: process.env.REDIS_JOB_QUEUE_PRODUCTS

  })