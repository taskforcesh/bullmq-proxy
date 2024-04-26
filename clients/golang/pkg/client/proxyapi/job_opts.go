package proxyapi

type JobSpec struct {
	Name    string          `json:"name"`
	Data    string          `json:"data"`
	Options *BulkJobOptions `json:"opts,omitempty"`
}

type JobRef struct {
	Id string `json:"id"`

	/**
	 * It includes the prefix, the namespace separator :, and queue name.
	 * @see https://www.gnu.org/software/gawk/manual/html_node/Qualified-Names.html
	 */
	Queue string `json:"queue"`
}

type DefaultJobOptions struct {
	Timestamp        *int             `json:"timestamp,omitempty"`
	Priority         int              `json:"priority,omitempty"`
	Delay            int              `json:"delay,omitempty"`
	Attempts         int              `json:"attempts,omitempty"`
	Backoff          *BackoffStrategy `json:"backoff,omitempty"` //TODO: support a custom unmarshaler
	Lifo             bool             `json:"lifo,omitempty"`
	RemoveOnComplete *RemovePolicy    `json:"removeOnComplete,omitempty"`
	RemoveOnFail     *RemovePolicy    `json:"removeOnFail,omitempty"`
	KeepLogs         int              `json:"keepLogs,omitempty"`
	StackTraceLimit  int              `json:"stackTraceLimit,omitempty"`
	SizeLimit        int              `json:"sizeLimit,omitempty"`
}

type BaseJobOptions struct {
	DefaultJobOptions

	Repeat       *RepeatOptions `json:"repeat,omitempty"`
	RepeatJobKey *string        `json:"repeatJobKey,omitempty"`

	JobId  *string `json:"jobId,omitempty"`
	Parent *JobRef `json:"parent,omitempty"`

	/**
	 * Internal property used by repeatable jobs.
	 */
	PrevMillis *int `json:"prevMillis,omitempty"`
}

type BulkJobOptions struct {
	BaseJobOptions

	FailParentOnFailure       bool `json:"failParentOnFailure"`
	IgnoreDependencyOnFailure bool `json:"ignoreDependencyOnFailure"`
	RemoveDependencyOnFailure bool `json:"removeDependencyOnFailure"`

	// Repeat cannot be set for bulk jobs, so we just don't send the repeat option by setting the json tag to -
	Repeat       any    `json:"-"`
	RepeatJobKey string `json:"-"`
}

type RedisJobOptions struct {
	BaseJobOptions
}

