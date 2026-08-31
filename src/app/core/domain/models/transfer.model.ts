/**
 * Línea de una transferencia entre sucursales (`TransferItemResponse` en
 * APIDOC.json). Cada cantidad refleja una etapa del ciclo de vida:
 * `requestedQuantity` (solicitud), `approvedQuantity` (aprobación, HU-29),
 * `shippedQuantity` (despacho) y `receivedQuantity` (recepción, RN-09).
 */
export interface TransferItem {
  id: string;
  productId: string;
  productUnitId: string;
  requestedQuantity: number;
  approvedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
}

/**
 * Transferencia de stock entre sucursales (`TransferResponse` en
 * APIDOC.json, HU-27 a HU-41, RF-46). Ciclo de vida:
 * `POST /branches/{originBranchId}/transfers` (solicitud) →
 * `POST /transfers/{id}/approval` (aprobación, ajusta cantidades) →
 * `POST /transfers/{id}/preparation` (inicio de preparación) →
 * `POST /transfers/{id}/logistics-assignment` (transportista + ruta, solo
 * antes de despachar) → `POST /transfers/{id}/dispatch` (descuenta
 * inventario de origen vía TRANSFER_OUT, RN-08) →
 * `POST /transfers/{id}/reception` (incrementa inventario de destino vía
 * TRANSFER_IN por lo realmente recibido, RN-09; si llega incompleta abre una
 * incidencia por el faltante, RN-10, y queda PARTIALLY_RECEIVED). También
 * admite `POST /transfers/{id}/cancellation`, solo antes de despachar (ya
 * hay stock de origen comprometido después). `status`/`priority` son texto
 * libre del backend, sin enum documentado — mismo criterio que
 * `PurchaseOrder.status`.
 */
export interface Transfer {
  id: string;
  transferNumber: string;
  originBranchId: string;
  destinationBranchId: string;
  requestedBy: string;
  approvedBy: string | null;
  status: string;
  priority: string;
  carrierId: string | null;
  routeId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
  estimatedArrivalAt: string | null;
  receivedAt: string | null;
  notes: string;
  items: TransferItem[];
  createdAt: string;
  updatedAt: string;
}

/** Línea al solicitar una transferencia (`TransferItemRequest`). */
export interface CreateTransferItemInput {
  productId: string;
  productUnitId: string;
  quantity: number;
}

/** Prioridad de una transferencia (`CreateTransferRequest.priority`); `NORMAL` por defecto en el backend. */
export type TransferPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/** Datos de solicitud de una transferencia (`CreateTransferRequest`, HU-27); origen y destino deben ser distintos (RN-07). */
export interface CreateTransferInput {
  destinationBranchId: string;
  transferNumber: string;
  priority?: TransferPriority;
  notes?: string;
  items: CreateTransferItemInput[];
}

/** Cantidad por línea (`ItemQuantityRequest`), reusada en aprobación/despacho/recepción. */
export interface ItemQuantityInput {
  itemId: string;
  quantity: number;
}

/** Datos de aprobación (`ApproveTransferRequest`, HU-29): línea ausente se aprueba tal como fue solicitada. */
export interface ApproveTransferInput {
  approvedQuantities?: ItemQuantityInput[];
}

/** Datos de asignación logística (`AssignTransferLogisticsRequest`): la ruta debe conectar el origen y destino de la transferencia. */
export interface AssignTransferLogisticsInput {
  carrierId: string;
  routeId: string;
  estimatedArrivalAt?: string;
}

/** Datos de despacho (`DispatchTransferRequest`): línea ausente se despacha por la cantidad aprobada. */
export interface DispatchTransferInput {
  shippedQuantities?: ItemQuantityInput[];
}

/** Datos de recepción (`ReceiveTransferRequest`, RN-09): línea ausente se considera que no llegó nada de ella. */
export interface ReceiveTransferInput {
  receivedQuantities?: ItemQuantityInput[];
}

/** Tipo de resolución de una incidencia (`ResolveTransferIssueRequest.resolutionType`, único enum documentado de Incidencias). */
export type TransferIssueResolutionType = 'RESHIPMENT' | 'ADJUSTMENT' | 'CLAIM';

/** Datos para resolver una incidencia (HU-33): deja constancia de cómo se resolvió, no la ejecuta automáticamente. */
export interface ResolveTransferIssueInput {
  resolutionType: TransferIssueResolutionType;
}

/**
 * Incidencia de una línea de transferencia (`TransferIssueResponse`), por
 * faltante al recibir (RN-10). `issueType`/`resolutionType` son texto libre
 * del backend como respuesta; solo el campo de la petición de resolución
 * tiene enum documentado.
 */
export interface TransferIssue {
  id: string;
  transferItemId: string;
  issueType: string;
  resolutionType: string | null;
  quantity: number;
  description: string;
  reportedBy: string;
  reportedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

/**
 * Filtros + paginación de `GET /branches/{branchId}/transfers` (RF-46,
 * HU-35, HU-41). Incluye tanto lo que la sucursal solicitó como lo que le
 * están por enviar. La API solo documenta `status` como filtro.
 */
export interface TransferQuery {
  status?: string;
  page?: number;
  size?: number;
}
