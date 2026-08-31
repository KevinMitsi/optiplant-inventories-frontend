import { environment } from '../../../../environments/environment';

/**
 * Rutas de la API (ver APIDOC.json). Centralizadas para que ningún
 * repositorio de infraestructura concatene strings sueltos.
 */
export const ApiEndpoints = {
  auth: {
    login: () => `${environment.apiBaseUrl}/auth/login`,
    refresh: () => `${environment.apiBaseUrl}/auth/refresh`,
    me: () => `${environment.apiBaseUrl}/auth/me`,
  },
  users: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/users`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/users`,
    byId: (userId: string) => `${environment.apiBaseUrl}/users/${userId}`,
    profile: (userId: string) => `${environment.apiBaseUrl}/users/${userId}/profile`,
    assignment: (userId: string) => `${environment.apiBaseUrl}/users/${userId}/assignment`,
    activate: (userId: string) => `${environment.apiBaseUrl}/users/${userId}/activation`,
    deactivate: (userId: string) => `${environment.apiBaseUrl}/users/${userId}/deactivation`,
  },
  branches: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/branches`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/branches`,
    byId: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}`,
    activate: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/activation`,
    deactivate: (branchId: string) =>
      `${environment.apiBaseUrl}/branches/${branchId}/deactivation`,
  },
  categories: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/categories`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/categories`,
    byId: (categoryId: string) => `${environment.apiBaseUrl}/categories/${categoryId}`,
    activate: (categoryId: string) => `${environment.apiBaseUrl}/categories/${categoryId}/activation`,
    deactivate: (categoryId: string) =>
      `${environment.apiBaseUrl}/categories/${categoryId}/deactivation`,
  },
  carriers: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/carriers`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/carriers`,
    byId: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}`,
    activate: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}/activation`,
    deactivate: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}/deactivation`,
  },
  suppliers: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/suppliers`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/suppliers`,
    byId: (supplierId: string) => `${environment.apiBaseUrl}/suppliers/${supplierId}`,
    activate: (supplierId: string) => `${environment.apiBaseUrl}/suppliers/${supplierId}/activation`,
    deactivate: (supplierId: string) =>
      `${environment.apiBaseUrl}/suppliers/${supplierId}/deactivation`,
  },
  unitsOfMeasure: {
    list: () => `${environment.apiBaseUrl}/units-of-measure`,
  },
  products: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/products`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/products`,
    byId: (productId: string) => `${environment.apiBaseUrl}/products/${productId}`,
    activate: (productId: string) => `${environment.apiBaseUrl}/products/${productId}/activation`,
    deactivate: (productId: string) => `${environment.apiBaseUrl}/products/${productId}/deactivation`,
    addUnit: (productId: string) => `${environment.apiBaseUrl}/products/${productId}/units`,
    unitFactor: (productId: string, productUnitId: string) =>
      `${environment.apiBaseUrl}/products/${productId}/units/${productUnitId}/factor`,
    activateUnit: (productId: string, productUnitId: string) =>
      `${environment.apiBaseUrl}/products/${productId}/units/${productUnitId}/activation`,
    deactivateUnit: (productId: string, productUnitId: string) =>
      `${environment.apiBaseUrl}/products/${productId}/units/${productUnitId}/deactivation`,
    baseUnit: (productId: string) => `${environment.apiBaseUrl}/products/${productId}/base-unit`,
  },
  priceLists: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/price-lists`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/price-lists`,
    byId: (priceListId: string) => `${environment.apiBaseUrl}/price-lists/${priceListId}`,
    activate: (priceListId: string) => `${environment.apiBaseUrl}/price-lists/${priceListId}/activation`,
    deactivate: (priceListId: string) =>
      `${environment.apiBaseUrl}/price-lists/${priceListId}/deactivation`,
    productPrices: (priceListId: string) =>
      `${environment.apiBaseUrl}/price-lists/${priceListId}/product-prices`,
  },
  inventory: {
    search: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/inventory`,
    byProduct: (branchId: string, productId: string) =>
      `${environment.apiBaseUrl}/branches/${branchId}/inventory/${productId}`,
    minimumStock: (branchId: string, productId: string) =>
      `${environment.apiBaseUrl}/branches/${branchId}/inventory/${productId}/minimum-stock`,
    movements: (branchId: string, productId: string) =>
      `${environment.apiBaseUrl}/branches/${branchId}/inventory/${productId}/movements`,
    entries: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/inventory/entries`,
    exits: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/inventory/exits`,
  },
  inventoryAdjustments: {
    create: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/inventory-adjustments`,
    byId: (adjustmentId: string) => `${environment.apiBaseUrl}/inventory-adjustments/${adjustmentId}`,
    approve: (adjustmentId: string) =>
      `${environment.apiBaseUrl}/inventory-adjustments/${adjustmentId}/approval`,
  },
  inventoryAlerts: {
    search: () => `${environment.apiBaseUrl}/inventory-alerts`,
    dismiss: (alertId: string) => `${environment.apiBaseUrl}/inventory-alerts/${alertId}/dismissal`,
    resolve: (alertId: string) => `${environment.apiBaseUrl}/inventory-alerts/${alertId}/resolution`,
  },
  sales: {
    search: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/sales`,
    create: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/sales`,
    byId: (saleId: string) => `${environment.apiBaseUrl}/sales/${saleId}`,
    confirm: (saleId: string) => `${environment.apiBaseUrl}/sales/${saleId}/confirmation`,
    cancel: (saleId: string) => `${environment.apiBaseUrl}/sales/${saleId}/cancellation`,
  },
  purchaseOrders: {
    search: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/purchase-orders`,
    create: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/purchase-orders`,
    byId: (purchaseOrderId: string) => `${environment.apiBaseUrl}/purchase-orders/${purchaseOrderId}`,
    confirm: (purchaseOrderId: string) =>
      `${environment.apiBaseUrl}/purchase-orders/${purchaseOrderId}/confirmation`,
    cancel: (purchaseOrderId: string) =>
      `${environment.apiBaseUrl}/purchase-orders/${purchaseOrderId}/cancellation`,
    receiveItem: (purchaseOrderId: string, itemId: string) =>
      `${environment.apiBaseUrl}/purchase-orders/${purchaseOrderId}/items/${itemId}/receipt`,
  },
  logisticsRoutes: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/logistics-routes`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/logistics-routes`,
    byId: (routeId: string) => `${environment.apiBaseUrl}/logistics-routes/${routeId}`,
    activate: (routeId: string) => `${environment.apiBaseUrl}/logistics-routes/${routeId}/activation`,
    deactivate: (routeId: string) => `${environment.apiBaseUrl}/logistics-routes/${routeId}/deactivation`,
  },
  transfers: {
    search: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/transfers`,
    create: (originBranchId: string) => `${environment.apiBaseUrl}/branches/${originBranchId}/transfers`,
    byId: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}`,
    approve: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/approval`,
    startPreparation: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/preparation`,
    assignLogistics: (transferId: string) =>
      `${environment.apiBaseUrl}/transfers/${transferId}/logistics-assignment`,
    dispatch: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/dispatch`,
    receive: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/reception`,
    cancel: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/cancellation`,
    issues: (transferId: string) => `${environment.apiBaseUrl}/transfers/${transferId}/issues`,
    resolveIssue: (transferId: string, issueId: string) =>
      `${environment.apiBaseUrl}/transfers/${transferId}/issues/${issueId}/resolution`,
  },
  dashboard: {
    salesSummary: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/dashboard/sales-summary`,
    productRotation: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/dashboard/product-rotation`,
    branchComparison: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/dashboard/branch-comparison`,
  },
} as const;
