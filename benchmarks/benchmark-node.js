const { Job, Queue, Worker } = require('bullmq')
const { Redis } = require('ioredis')

const numJobs = 10000
const queueName = 'test-queue'

async function benchmarkBullMQ() {
  const redisClient = new Redis()
  const workersRedisClient = new Redis({
    maxRetriesPerRequest: null,
  })

  const addingBullMQjobs = []
  const queue = new Queue(queueName, { connection: redisClient })

  for (let i = 0; i < numJobs; i++) {
    const jobPromise = queue.add('test-job', `${i}`)
    addingBullMQjobs.push(jobPromise)
  }

  const startTime = Date.now()
  await Promise.all(addingBullMQjobs)
  const duration = Date.now() - startTime
  console.log(
    `Added ${numJobs} jobs in ${duration}ms, numJobs/s: ${numJobs / (duration / 1000)}`
  )

  let worker
  const processingBullMQJobs = new Promise((resolve, reject) => {
    let count = 0

    worker = new Worker(
      queueName,
      async (job) => {
        count++
        if (count === numJobs) {
          resolve()
        }
        return job.data
      },
      { connection: workersRedisClient, concurrency: 300 }
    )
  })

  const startTime2 = Date.now()
  await processingBullMQJobs
  const duration2 = Date.now() - startTime2
  console.log(
    `Processed ${numJobs} jobs in ${duration2}ms, numJobs/s: ${numJobs / (duration2 / 1000)}`
  )

  await queue.close()
  await worker.close()
  await workersRedisClient.quit()
  await redisClient.quit()
}

async function benchmark() {
  for (let i = 0; i < 5; i++) {
    console.log(`\nBenchmark ${i + 1}`)
    await benchmarkBullMQ()
  }
}

benchmark()
