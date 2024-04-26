package proxyapi

type JobJson struct {
}

type Job struct {
}

type GetJobsResponse struct {
	Counts int    `json:"counts"`
	Jobs   []*Job `json:"jobs"`
	Start  int    `json:"start"`
	Length int    `json:"length"`
}

type WorkerMetadata struct {
}

type JobLog struct {
	Logs  []string `json:"logs"`
	Count int      `json:"count"`
}

type QueueCommand struct {
	Fn   string        `json:"fn"`
	Args []interface{} `json:"args"`
}

type WorkerCommand struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}
