package bull

import (
	"context"

	"taskforce.sh/bullmq_proxy_client/pkg/client"
	"taskforce.sh/bullmq_proxy_client/pkg/client/proxyapi"
)

type Queue struct {
	c    *client.Client
	name string
}

func NewQueue(c *client.Client, name string) *Queue {
	return &Queue{
		c:    c,
		name: name,
	}
}

func (q *Queue) AddJobs(ctx context.Context, jobs ...*proxyapi.JobSpec) ([]*proxyapi.Job, error) {
	return q.c.AddJobs(ctx, q.name, jobs)
}

func (q *Queue) GetJob(ctx context.Context, id string) (*proxyapi.Job, error) {
	return q.c.GetJob(ctx, q.name, id)
}

func (q *Queue) GetJobs(ctx context.Context) (*proxyapi.GetJobsResponse, error) {
	return q.c.GetJobs(ctx, q.name)
}
