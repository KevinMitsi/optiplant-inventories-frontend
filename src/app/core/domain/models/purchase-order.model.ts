/**
 * Línea de una orden de compra (`PurchaseOrderItemResponse` en APIDOC.json).
 * `receivedQuantity` acumula lo recibido hasta ahora — admite recepción
 * parcial (HU-19), así que puede ser menor que `quantity` mientras la orden
 * sigue confirmada.
 */
export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discountPercentage: number;
}

/**
 * Orden de compra a proveedor (`PurchaseOrderResponse` en APIDOC.json,
 * HU-17/HU-18/HU-19/HU-20). Se crea en borrador sin afectar inventario;
 * `POST /purchase-orders/{id}/confirmation` la confirma con el proveedor (a
 * partir de ahí puede empezar a recibirse mercancía); cada línea recibe por
 * separado con `POST /purchase-orders/{id}/items/{itemId}/receipt`, que
 * incrementa el inventario y recalcula el costo promedio ponderado del
 * producto (RF-21/RF-23); `POST /purchase-orders/{id}/cancellation` solo
 * procede antes de recibir cualquier mercancía. El status es texto libre del
 * backend, sin enum documentado, igual criterio que `Sale.status`.
 */
export interface PurchaseOrder {
  id: string;
  branchId: string;
  supplierId: string;
  createdBy: string;
  status: string;
  orderNumber: string;
  orderDate: string;
  paymentTermDays: number;
  notes: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Línea al crear una orden (`PurchaseOrderItemRequest`); a diferencia de Ventas, `unitPrice` es obligatorio (precio pactado). */
export interface CreatePurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
}

/** Datos de alta de una orden en borrador (`CreatePurchaseOrderRequest`); al menos una línea. */
export interface CreatePurchaseOrderInput {
  supplierId: string;
  orderNumber: string;
  orderDate: string;
  paymentTermDays?: number;
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
}

/** Cantidad recibida ahora de una línea (`ReceivePurchaseOrderItemRequest`), en la unidad de la línea; admite recepción parcial. */
export interface ReceivePurchaseOrderItemInput {
  quantityReceived: number;
}

/**
 * Filtros + paginación de `GET /branches/{branchId}/purchase-orders`
 * (HU-20, RF-22). Igual que `SaleQuery`, la API no documenta `sortBy` para
 * este recurso.
 */
export interface PurchaseOrderQuery {
  supplierId?: string;
  productId?: string;
  status?: string;
  page?: number;
  size?: number;
}
