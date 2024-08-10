package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"taskforce.sh/bullmq_proxy_client/pkg/client/proxyapi"
	"taskforce.sh/bullmq_proxy_client/pkg/client/wsclient"
)

type Queue struct {
	ws *wsclient.WebSocket[*proxyapi.QueueCommand]
}

func NewQueue(ctx context.Context, url string, headers http.Header) (*Queue, error) {
	ws, err := wsclient.New[*proxyapi.QueueCommand](ctx, url, headers)
	if err != nil {
		return nil, err
	}
	return &Queue{ws: ws}, nil
}

type JobResponse struct {
	AttemptsMade       int                    `json:"attemptsMade,omitempty"`
	Data               map[string]interface{} `json:"data,omitempty"`
	Delay              int                    `json:"delay,omitempty"`
	ID                 string                 `json:"id,omitempty"`
	Name               string                 `json:"name,omitempty"`
	Opts               JobOpts                `json:"opts,omitempty"`
	Progress           int                    `json:"progress,omitempty"`
	QueueQualifiedName string                 `json:"queueQualifiedName,omitempty"`
	ReturnValue        interface{}            `json:"returnvalue,omitempty"`
	Stacktrace         interface{}            `json:"stacktrace,omitempty"`
	Timestamp          int64                  `json:"timestamp,omitempty"`
}

type JobOpts struct {
	Attempts *int `json:"attempts,omitempty"`
	Delay    *int `json:"delay,omitempty"`
}

func (q *Queue) AddJob(name string, data interface{}, opts interface{}) (*JobResponse, error) {
	cmd := &proxyapi.QueueCommand{
		Fn:   "add",
		Args: []interface{}{name, data, opts},
	}

	rawData, err := q.ws.Request(cmd)
	if err != nil {
		return nil, fmt.Errorf("Failed to send message: %v", err)
	}

	if rawData == nil {
		return nil, fmt.Errorf("Failed to receive response")
	}

	var jobResp JobResponse
	if err := json.Unmarshal(*rawData, &jobResp); err != nil {
		return nil, fmt.Errorf("Failed to unmarshal response: %v", err)
	}

	return &jobResp, nil
}

func (q *Queue) PauseJob() {
	cmd := &proxyapi.QueueCommand{
		Fn:   "pause",
		Args: []interface{}{},
	}
	q.ws.Request(cmd)
}

func (q *Queue) Close() {
	q.ws.Close()
}
