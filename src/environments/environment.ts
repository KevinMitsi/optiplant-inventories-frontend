export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  // Placeholder reemplazado en build time por Dockerfile (ARG COUNTRIES_API_KEY + sed).
  // Nunca commitear el valor real aquí.
  countriesApiKey: '__COUNTRIES_API_KEY__',
};
