/**
 * Define the types for the commands that can be sent to the queue controller.
 * We use typebox so that we can validate the commands sent to the proxy and return
 * proper errors to the client.
 *
 */
import { Type, Static } from "@sinclair/typebox";

enum QueueCommandTypes {
    Add = "add",
    Pause = "pause",
    Resume = "resume",
    Empty = "empty",
    Clean = "clean",
    Count = "count",
    GetJobs = "getJobs",
    GetJobsCount = "getJobsCount",
    GetJobLogs = "getJobLogs",
    RemoveRepeatable = "removeRepeatable",
    JobsCommand = "jobs",
    JobUpdate = "jobUpdate",
    JobProgress = "jobProgress",
    JobLog = "jobLog",
}

// add(name: NameType, data: DataType, opts?: JobsOptions): Promise<Job<DataType, ResultType, NameType>>;
const AddJobSchema = Type.Object({
    fn: Type.Literal(QueueCommandTypes.Add),
    args: Type.Tuple([Type.String(), Type.Any(), Type.Optional(Type.Any())]),
});

const PauseSchema = Type.Object({
    fn: Type.Literal(QueueCommandTypes.Pause),
    args: Type.Tuple([]),
});

const ResumeSchema = Type.Object({
    fn: Type.Literal(QueueCommandTypes.Resume),
    args: Type.Tuple([]),
});

const GetJobsSchema = Type.Object({
    fn: Type.Literal(QueueCommandTypes.GetJobs),
    args: Type.Tuple([
        Type.Union([
            Type.Literal("completed"),
            Type.Literal("failed"),
            Type.Literal("active"),
            Type.Literal("delayed"),
            Type.Literal("waiting"),
            Type.Literal("waiting-children"),
            Type.Literal("prioritized"),
        ]),
        Type.Optional(Type.Number()), // start
        Type.Optional(Type.Number()), // end
        Type.Optional(Type.Boolean()), // asc
    ]),
});

const UpdateJobProgressSchema = Type.Object({
    fn: Type.Literal(QueueCommandTypes.JobProgress),
    args: Type.Tuple([Type.String(), Type.Union([Type.Number(), Type.Any()])]),
});

export const QueueSchema = Type.Union([
    AddJobSchema,
    PauseSchema,
    ResumeSchema,
    GetJobsSchema,
    UpdateJobProgressSchema,
]);

export type QueueSchemaType = Static<typeof QueueSchema>;
