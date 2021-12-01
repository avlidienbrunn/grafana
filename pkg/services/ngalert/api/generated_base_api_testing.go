/*Package api contains base API implementation of unified alerting
 *
 *Generated by: Swagger Codegen (https://github.com/swagger-api/swagger-codegen.git)
 *
 *Do not manually edit these files, please find ngalert/api/swagger-codegen/ for commands on how to generate them.
 */

package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	"github.com/grafana/grafana/pkg/models"
	apimodels "github.com/grafana/grafana/pkg/services/ngalert/api/tooling/definitions"
	"github.com/grafana/grafana/pkg/services/ngalert/metrics"
	"github.com/grafana/grafana/pkg/web"
)

type TestingApiForkingService interface {
	RouteEvalQueries(*models.ReqContext) response.Response
	RouteTestRuleConfig(*models.ReqContext) response.Response
}

type TestingApiService interface {
	RouteEvalQueries(*models.ReqContext, apimodels.EvalQueriesPayload) response.Response
	RouteTestRuleConfig(*models.ReqContext, apimodels.TestRulePayload) response.Response
}

func (r *ForkedTestingApi) RouteEvalQueries(ctx *models.ReqContext) response.Response {
	conf := apimodels.EvalQueriesPayload{}
	if err := web.Bind(ctx.Req, &conf); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	return r.forkRouteEvalQueries(ctx, conf)
}

func (r *ForkedTestingApi) RouteTestRuleConfig(ctx *models.ReqContext) response.Response {
	conf := apimodels.TestRulePayload{}
	if err := web.Bind(ctx.Req, &conf); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	return r.forkRouteTestRuleConfig(ctx, conf)
}

func (api *API) RegisterTestingApiEndpoints(srv TestingApiForkingService, m *metrics.API) {
	api.RouteRegister.Group("", func(group routing.RouteRegister) {
		group.Post(
			toMacaronPath("/api/v1/eval"),
			metrics.Instrument(
				http.MethodPost,
				"/api/v1/eval",
				srv.RouteEvalQueries,
				m,
			),
		)
		group.Post(
			toMacaronPath("/api/v1/rule/test/{Recipient}"),
			metrics.Instrument(
				http.MethodPost,
				"/api/v1/rule/test/{Recipient}",
				srv.RouteTestRuleConfig,
				m,
			),
		)
	}, middleware.ReqSignedIn)
}
