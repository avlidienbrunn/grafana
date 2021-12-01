package api

import (
	"fmt"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/datasources"
	apimodels "github.com/grafana/grafana/pkg/services/ngalert/api/tooling/definitions"
)

type ForkedPrometheusApi struct {
	ProxySvc, GrafanaSvc PrometheusApiService
	DatasourceCache      datasources.CacheService
}

// NewForkedProm implements a set of routes that proxy to various Prometheus-compatible backends.
func NewForkedProm(datasourceCache datasources.CacheService, proxy, grafana PrometheusApiService) *ForkedPrometheusApi {
	return &ForkedPrometheusApi{
		ProxySvc:        proxy,
		GrafanaSvc:      grafana,
		DatasourceCache: datasourceCache,
	}
}

func (p *ForkedPrometheusApi) forkRouteGetAlertStatuses(ctx *models.ReqContext) response.Response {
	t, err := backendType(ctx, p.DatasourceCache)
	if err != nil {
		return ErrResp(400, err, "")
	}

	switch t {
	case apimodels.GrafanaBackend:
		return p.GrafanaSvc.RouteGetAlertStatuses(ctx)
	case apimodels.LoTexRulerBackend:
		return p.ProxySvc.RouteGetAlertStatuses(ctx)
	default:
		return ErrResp(400, fmt.Errorf("unexpected backend type (%v)", t), "")
	}
}

func (p *ForkedPrometheusApi) forkRouteGetRuleStatuses(ctx *models.ReqContext) response.Response {
	t, err := backendType(ctx, p.DatasourceCache)
	if err != nil {
		return ErrResp(400, err, "")
	}

	switch t {
	case apimodels.GrafanaBackend:
		return p.GrafanaSvc.RouteGetRuleStatuses(ctx)
	case apimodels.LoTexRulerBackend:
		return p.ProxySvc.RouteGetRuleStatuses(ctx)
	default:
		return ErrResp(400, fmt.Errorf("unexpected backend type (%v)", t), "")
	}
}
