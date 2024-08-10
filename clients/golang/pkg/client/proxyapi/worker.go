package proxyapi

type WorkerMetrics struct {
	MaxDataPoints int `json:"maxDataPoints,omitempty"`
}

type LimiterMetrics struct {
	Max      int     `json:"max,omitempty"`
	Duration float64 `json:"duration,omitempty"`
}

type WorkerMetadata struct {
	Queue    string               `json:"queue,omitempty"`
	Endpoint WorkerEndpoint       `json:"endpoint,omitempty"`
	Options  *WorkerSimpleOptions `json:"opts,omitempty"`
}
type WorkerSimpleOptions struct {
	Name             string          `json:"name,omitempty"`
	Concurrency      int             `json:"concurrency,omitempty"`
	Limiter          *LimiterMetrics `json:"limiter,omitempty"`
	Metrics          *WorkerMetrics  `json:"metrics,omitempty"`
	MaxStalledCount  int             `json:"maxStalledCount,omitempty"`
	StalledInterval  float64         `json:"stalledInterval,omitempty"`
	RemoveOnComplete *RemovePolicy   `json:"removeOnComplete,omitempty"`
	RemoveOnFail     *RemovePolicy   `json:"removeOnFail,omitempty"`
	Prefix           string          `json:"prefix,omitempty"`
}

type WorkerEndpoint struct {
	Url     string            `json:"url"`
	Method  string            `json:"method,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Timeout float64           `json:"timeout,omitempty"`
}
