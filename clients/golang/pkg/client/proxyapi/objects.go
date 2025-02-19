package proxyapi

type GetJobsResponse struct {
	Counts int    `json:"counts"`
	Jobs   []*Job `json:"jobs"`
	Start  int    `json:"start"`
	Length int    `json:"length"`
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
