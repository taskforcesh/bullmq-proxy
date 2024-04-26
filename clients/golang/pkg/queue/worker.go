package queue

import (
	"context"
	"fmt"

	// add other required imports
	"taskforce.sh/bullmq_proxy_client/pkg/client/proxyapi"
	"taskforce.sh/bullmq_proxy_client/pkg/client/wsclient"
)

type JobResult struct {
	Result interface{} `json:"result"`
}

type JobError struct {
	Message string `json:"message"`
	Stack   string `json:"stack"`
}

type ProcessorFunc func(job interface{}) (interface{}, error)

type QueueWorker struct {
	ws *wsclient.WebSocket[*proxyapi.WorkerCommand]
}

func NewWorker(ctx context.Context, host string, queueName string, token string, concurrency int, processor ProcessorFunc) (*QueueWorker, error) {
	url := fmt.Sprintf("%s/queues/%s/process/%d?token=%s", host, queueName, concurrency, token)
	ws, err := wsclient.New[*proxyapi.WorkerCommand](ctx, url)
	if err != nil {
		return nil, err
	}

	var qw = &QueueWorker{ws: ws}
	go qw.listen(processor)

	return qw, nil
}

func (qw *QueueWorker) listen(processor ProcessorFunc) {
	for {
		message, err := qw.ws.ReceiveMessage() // assuming this blocks until a message is received
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
