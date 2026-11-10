// Swagger UI configuration. "Try it out" calls run against this origin with the session cookie,
// so the CSRF header the API requires is added to every request.
window.addEventListener('load', function () {
  window.ui = SwaggerUIBundle({
    url: '/api/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 0,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    withCredentials: true,
    requestInterceptor: function (request) {
      request.headers['X-Requested-With'] = 'LocalFix-Docs';
      return request;
    },
  });
});
