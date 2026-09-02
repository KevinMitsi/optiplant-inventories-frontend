/**
 * Formateo de dinero/cantidades/fechas consistente con `es-CO` — mismo
 * locale y moneda (COP) que ya usa `DashboardPage` para las gráficas
 * (`Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`).
 * Funciones puras basadas en `Intl`, no en `DatePipe`/`CurrencyPipe` de
 * Angular, para no depender de registrar `LOCALE_ID`/`registerLocaleData`
 * en `app.config.ts` solo para esto.
 */
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 });

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' });

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return currencyFormatter.format(value);
}

/** Cantidades/costos unitarios no monetarios (kg, unidades, costo promedio…): decimales recortados, sin símbolo. */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return quantityFormatter.format(value);
}

/** Fecha+hora ISO (`2026-09-02T01:17:01.318284Z`) → `2/9/26, 8:17 p.m.` en horario local. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateTimeFormatter.format(date);
}

/**
 * Solo fecha, admite tanto `date` (`2026-09-01`) como `date-time` ISO. Un
 * `date` sin zona horaria se interpretaría en UTC y podría mostrar el día
 * anterior en zonas horarias negativas; se ancla a medianoche local.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateFormatter.format(date);
}
