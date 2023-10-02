package queue

import (
	"fmt"

	// add other required imports
	"taskforce.sh/bullmq_proxy_client/wsclient"
)

type WorkerCommand struct {
	Type   string       `json:"type"`
	Payload interface{} `json:"payload"`
}

type JobResult struct {
	Result interface{} `json:"result"`
}

type JobError struct {
	Message string `json:"message"`
	Stack   string `json:"stack"`
}

type ProcessorFunc func(job interface{}) (interface{}, error)

type QueueWorker struct {
	ws *wsclient.WebSocket[WorkerCommand]
}

func NewWorker(host string, queueName string, token string, concurrency int, processor ProcessorFunc) *QueueWorker {
	url := fmt.Sprintf("%s/queues/%s/process/%d?token=%s", host, queueName, concurrency, token)
	var ws = wsclient.New[WorkerCommand](url)

	var qw = &QueueWorker{ws: ws}
	go qw.listen(processor)

	return qw;
}

func (qw *QueueWorker) listen(processor ProcessorFunc) {
	for {
		message, err := qw.ws.ReceiveWebSocketMessage() // assuming this blocks until a message is received
		if err != nil {
			fmt.Printf("Error receiving message: %v\n", err)
			continue
		}

		fmt.Printf("Receiving message: %v\n", message)
		if message.Data.Type == "process" {
			go qw.callProcessor(message.ID, message.Data.Payload, processor)
		} else {
			fmt.Printf("Unknown Worker message type %s\n", message.Data.Type)
		}
	}
}

func (qw *QueueWorker) callProcessor(id int, data interface{}, processor ProcessorFunc) {
	result, err := processor(data)
	if err != nil {
		qw.ws.Respond(id, &JobError{Message: err.Error(), Stack: ""}) // modify Respond to handle the error response
		return
	}

	qw.ws.Respond(id, &JobResult{Result: result})
}

func (qw *QueueWorker) Close() {
	qw.ws.Close()
}
