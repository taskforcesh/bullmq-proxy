import { QueueClient, QueueWorker, QueueEvents } from "../src";

const numJobs = 10;

const run = async () => {
  const opts = {
    host: "ws://localhost:8080",
    token: "1234",
    queueName: "test queue",
  };
  const client = new QueueClient<{ foo: string; jobIndex: number }>(opts);

  const queueEvents = new QueueEvents();
  await queueEvents.open(opts, ["active"]);

  queueEvents.on("active", (jobId: string) => {
    console.log("job active", jobId);
  });

  try {
    console.log("About to add a bunch of jobs in parallel");
    const start = Date.now();
    const promises = [];
    for (let j = 0; j < numJobs; j++) {
      for (let i = 0; i < 1; i++) {
        promises.push(client.add("test", { foo: "bar", jobIndex: j }));
      }
    }
    await Promise.all(promises);
    console.log("Total time adding jobs", Date.now() - start);
  } catch (err) {
    console.error("error adding job", err);
  }

  const worker = new QueueWorker();

  let index = 0;
  const startProcess = Date.now();

  const processing = new Promise<void>((resolve) => {
    worker.open(opts, 20, async (job) => {
      index++;
      if (index === numJobs) {
        console.log("Total time processing jobs", Date.now() - startProcess);
        resolve();
      }
    });
  });

  await processing;

  const completed = await client.getJobs("completed", 0, 100, true);
  console.log("Total Completed:", completed.length);

  const jobCounts = await client.getJobCounts();
  console.log("jobCounts", jobCounts);
};

run();
