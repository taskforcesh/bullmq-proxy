package queue

import (
	"encoding/json"
	"fmt"

	"taskforce.sh/bullmq_proxy_client/wsclient"
)

type QueueCommand struct {
	Fn   string        `json:"fn"`
	Args []interface{} `json:"args"`
}

type Queue struct {
	ws *wsclient.WebSocket[QueueCommand]
}

func NewQueue(url string) *Queue {
	var ws = wsclient.New[QueueCommand](url)
	return &Queue{ws: ws}
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
	cmd := QueueCommand{
		Fn:   "add",
		Args: []interface{}{name, data, opts},
	}

	rawData, err := q.ws.SendWebSocketMessage(cmd)
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
	cmd := QueueCommand{
		Fn:   "pause",
		Args: []interface{}{},
	}
	q.ws.SendWebSocketMessage(cmd)
}

func (q *Queue) Close() {
	q.ws.Close()
}
