package bull

import (
	"context"

	"taskforce.sh/bullmq_proxy_client/pkg/client"
	"taskforce.sh/bullmq_proxy_client/pkg/client/proxyapi"
)

type Worker struct {
	c     *client.Client
	queue string
}

func NewWorker(c *client.Client, queue string) *Worker {
	return &Worker{
		c:     c,
		queue: queue,
	}
}

func (w *Worker) Start(ctx context.Context, endpoint proxyapi.WorkerEndpoint, options *proxyapi.WorkerSimpleOptions) (func(ctx context.Context) error, error) {
	// attempt to add a worker
	err := w.c.AddWorker(ctx, &proxyapi.WorkerMetadata{
		Queue:    w.queue,
		Endpoint: endpoint,
		Options:  options,
	})
	if err != nil {
		return nil, err
	}
	stopCh := make(chan struct{})
	go func() {
		for {
			select {
			case <-stopCh:
			default:
			}
		}
	}()
	return func(ctx context.Context) error {
		close(stopCh)
		return w.c.RemoveWorker(ctx, w.queue)
	}, nil
}
