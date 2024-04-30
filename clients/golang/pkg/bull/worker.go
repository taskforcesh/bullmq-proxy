package bull

import (
	"context"

	"taskforce.sh/bullmq_proxy_client/pkg/client"
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

func (w *Worker) Start(ctx context.Context) (func(ctx context.Context) error, error) {
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
