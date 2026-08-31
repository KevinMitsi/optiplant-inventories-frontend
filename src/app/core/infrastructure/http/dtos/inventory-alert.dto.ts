/** Forma de red exacta de `APIDOC.json` para alertas de inventario. */

export interface InventoryAlertResponseDto {
  id: string;
  inventoryId: string;
  alertType: string;
  status: string;
  triggeredQuantity: number;
  minimumStock: number;
  message: string;
  createdAt: string;
  resolvedAt?: string | null;
}
