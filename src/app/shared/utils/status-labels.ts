/**
 * Traducciones a español de los distintos `status`/enums que el backend
 * devuelve como texto libre (sin enum documentado en APIDOC.json — mismo
 * criterio en `Sale.status`, `PurchaseOrder.status`, `Transfer.status`,
 * `InventoryAlert.status`, etc.). Centralizado aquí para no repetir el mismo
 * mapa en cada página y para que un valor nuevo que el backend empiece a
 * devolver no rompa nada: si no está en el mapa, se muestra tal cual llegó.
 */
function label(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

const SALE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};
export const saleStatusLabel = (status: string): string => label(SALE_STATUS_LABELS, status);

const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};
export const purchaseOrderStatusLabel = (status: string): string => label(PURCHASE_ORDER_STATUS_LABELS, status);

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  IN_PREPARATION: 'En preparación',
  IN_TRANSIT: 'Despachada',
  RECEIVED: 'Recibida',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
};
export const transferStatusLabel = (status: string): string => label(TRANSFER_STATUS_LABELS, status);

const TRANSFER_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};
export const transferPriorityLabel = (priority: string): string => label(TRANSFER_PRIORITY_LABELS, priority);

const TRANSFER_ISSUE_TYPE_LABELS: Record<string, string> = {
  MISSING: 'Faltante',
  DAMAGED: 'Dañado',
  EXCESS: 'Sobrante',
};
export const transferIssueTypeLabel = (issueType: string): string => label(TRANSFER_ISSUE_TYPE_LABELS, issueType);

const TRANSFER_ISSUE_RESOLUTION_LABELS: Record<string, string> = {
  RESHIPMENT: 'Reenvío',
  ADJUSTMENT: 'Ajuste',
  CLAIM: 'Reclamación',
};
export const transferIssueResolutionLabel = (resolutionType: string): string =>
  label(TRANSFER_ISSUE_RESOLUTION_LABELS, resolutionType);

const INVENTORY_MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Compra',
  SALE_OUT: 'Venta',
  RETURN_IN: 'Devolución',
  LOSS_OUT: 'Merma',
  ADJUSTMENT_IN: 'Ajuste (entrada)',
  ADJUSTMENT_OUT: 'Ajuste (salida)',
  TRANSFER_IN: 'Transferencia (entrada)',
  TRANSFER_OUT: 'Transferencia (salida)',
  MANUAL_IN: 'Entrada manual',
  MANUAL_OUT: 'Salida manual',
};
export const inventoryMovementTypeLabel = (movementType: string): string =>
  label(INVENTORY_MOVEMENT_TYPE_LABELS, movementType);

const INVENTORY_ALERT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  RESOLVED: 'Resuelta',
  DISMISSED: 'Descartada',
};
export const inventoryAlertStatusLabel = (status: string): string => label(INVENTORY_ALERT_STATUS_LABELS, status);

const INVENTORY_ALERT_TYPE_LABELS: Record<string, string> = {
  LOW_STOCK: 'Stock bajo',
  OUT_OF_STOCK: 'Sin stock',
};
export const inventoryAlertTypeLabel = (alertType: string): string => label(INVENTORY_ALERT_TYPE_LABELS, alertType);
