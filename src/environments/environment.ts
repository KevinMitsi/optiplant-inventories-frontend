export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  // Se inyecta en el pipeline de despliegue (gestor de secretos), nunca commiteada.
  countriesApiKey: '',
};
