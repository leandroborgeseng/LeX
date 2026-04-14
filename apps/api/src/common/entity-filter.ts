/**
 * Quando o escopo é PF ou PJ mas não existe nenhuma entidade desse tipo, não podemos usar
 * `financialEntityId: { in: [] }` (comportamento ambíguo / SQL inválido em alguns casos).
 * Usamos um UUID fixo que nunca é gerado pelo Prisma `@default(uuid())`.
 */
export const EMPTY_SCOPE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

export function financialEntityInFilter(ids: string[]): { financialEntityId: { in: string[] } } {
  return { financialEntityId: { in: ids.length > 0 ? ids : [EMPTY_SCOPE_ENTITY_ID] } };
}
