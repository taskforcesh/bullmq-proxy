import { JobJsonRaw, JobType, JobsOptions } from "bullmq";
import { Message, MessageBroker } from "@taskforcesh/message-broker";
import { Command, connect } from "./utils";
import { WebSocketClient } from "./ws-autoreconnect";

export enum CommandTypes {
  Add = "add",
  Pause = "pause",
  Resume = "resume",
  GetWorkers = "getWorkers",
  GetJobs = "getJobs",
  GetJobCounts = "getJobCounts",
  GetJobLogs = "getJobLogs",
  UpdateJobProgress = "updateJobProgress",
  AddJobLog = "addJobLog",
}

export class QueueClient<K> {
  private ws: WebSocketClient;
  private connecting: Promise<WebSocketClient>;
  private mb: MessageBroker<Command<string, any[]>>;

  constructor(
    private opts: { host: string; queueName: string; token: string }
  ) { }

  private async send<FN extends string, ARGS extends any[], Q = void>(data: Command<FN, ARGS>) {
    const mb = await this.getMessageBroker();
    const { ok, err } = await mb.sendData<{ ok?: Q, err?: { message: string, stack: string }, errors?: any }>(data);

    if (err) {
      const error = new Error(err.message);
     // error.stack = err.stack;
      throw error;
    } else {
      return ok;
    }
  }

  private async getMessageBroker() {
    if (!this.connecting) {
      this.connecting = connect(
        `${this.opts.host}/queues/${this.opts.queueName}`,
        this.opts.token,
        {},
        (msg: Message<Command<string, any[]>>) => {
          if (this.mb) {
            this.mb.processMessage(<Message<Command<string, any[]>>>msg);
          }
        }
      );
    }
    if (!this.ws) {
      this.ws = await this.connecting;
      if (!this.mb) {
        this.mb = new MessageBroker(async (msg: string) => this.ws.send(msg));
      }
    }
    return this.mb;
  }

  async add(name: string, data: K, opts?: JobsOptions) {
    return this.send<CommandTypes.Add, [string, K, JobsOptions], JobJsonRaw>
      ({
        fn: CommandTypes.Add,
        args: [name, data, opts],
      });
  }

  async pause() {
    return this.send<CommandTypes.Pause, [], void>({
      fn: CommandTypes.Pause,
      args: [],
    });
  }

  async resume() {
    return this.send<CommandTypes.Resume, [], void>({
      fn: CommandTypes.Resume,
      args: [],
    });
  }

  // Getters
  async getWorkers() {
    return this.send<CommandTypes.GetWorkers, [], string[]>({
      fn: CommandTypes.GetWorkers,
      args: [],
    });
  }

  async getJobCounts(...types: JobType[]): Promise<{
    [index: string]: number;
  }> {
    return this.send<CommandTypes.GetJobCounts, JobType[], {
      [index: string]: number;
    }>({
      fn: CommandTypes.GetJobCounts,
      args: types,
    });
  }

  getJobLogs(
    jobId: string,
    start?: number,
    end?: number
  ): Promise<{
    logs: string[];
    count: number;
  }> {
    return this.send<
      CommandTypes.GetJobLogs, [string, number, number],
      { logs: string[]; count: number }
    >({
      fn: CommandTypes.GetJobLogs,
      args: [jobId, start, end],
    });
  }

  getJobs(
    status:
      | "completed"
      | "failed"
      | "delayed"
      | "active"
      | "prioritized"
      | "waiting"
      | "waiting-children",
    start: number,
    end: number,
    asc: boolean
  ) {
    return this.send<
      CommandTypes.GetJobs, [string, number, number, boolean],
      JobJsonRaw[]
    >({
      fn: CommandTypes.GetJobs,
      args: [status, start, end, asc],
    });
  }

  //
  // Jobs
  //
  async updateJobProgress(
    jobId: string,
    progress: number | object,
  ): Promise<void> {
    return this.send<CommandTypes.UpdateJobProgress, [string, number | object]>({
      fn: CommandTypes.UpdateJobProgress,
      args: [
        jobId,
        progress,
      ],
    });
  }

  async addJobLog(
    jobId: string,
    logRow: string,
    keepLogs?: number,
  ): Promise<number> {
    return this.send<CommandTypes.AddJobLog, [string, string, number?], number>({
      fn: CommandTypes.AddJobLog,
      args: [
        jobId,
        logRow,
        keepLogs
      ]
    });
  }

  async close() {
    const ws = await this.connecting;
    ws.close();
  }
}
