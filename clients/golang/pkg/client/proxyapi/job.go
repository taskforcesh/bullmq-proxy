package proxyapi

type Job struct {
	// The name of the Job
	Name string `json:"name"`
	// The payload for this job.
	Data any `json:"data"`
	// The options object for this job.
	Opts *BaseJobOptions `json:"opts"`
	// The ID of the job.
	ID *string `json:"id,omitempty"`
	// It includes the prefix, the namespace separator :, and queue name.
	// See https://www.gnu.org/software/gawk/manual/html_node/Qualified-Names.html
	QueueQualifiedName string `json:"queueQualifiedName"`
	// The progress a job has performed so far.
	// Default value is 0.
	Progress any `json:"progress,omitempty"`
	// The value returned by the processor when processing this job.
	// Default value is null.
	Returnvalue any `json:"returnvalue,omitempty"`
	// Stacktrace for the error (for failed jobs).
	// Default value is null.
	Stacktrace []string `json:"stacktrace,omitempty"`
	// An amount of milliseconds to wait until this job can be processed.
	// Default value is 0.
	Delay int64 `json:"delay,omitempty"`
	// Timestamp when the job was created (unless overridden with job options).
	Timestamp int64 `json:"timestamp,omitempty"`
	// Number of attempts when job is moved to active.
	// Default value is 0.
	AttemptsStarted int `json:"attemptsStarted,omitempty"`
	// Number of attempts after the job has failed.
	// Default value is 0.
	AttemptsMade int `json:"attemptsMade,omitempty"`
	// Reason for failing.
	FailedReason string `json:"failedReason,omitempty"`
	// Timestamp when the job was finished.
	FinishedOn *int64 `json:"finishedOn,omitempty,omitempty"`
	// Timestamp when the job was processed.
	ProcessedOn *int64 `json:"processedOn,omitempty,omitempty"`
	// The key of the parent job.
	ParentKey *string `json:"parentKey,omitempty,omitempty"`
	// The parent job.
	Parent *JobRef `json:"parent,omitempty,omitempty"`
	// The key of the repeat job.
	RepeatJobKey *string `json:"repeatJobKey,omitempty,omitempty"`
	// The token of the job.
	Token *string `json:"token,omitempty,omitempty"`
	// The ID of the process that processed the job.
	ProcessedBy *string `json:"processedBy,omitempty,omitempty"`
}
