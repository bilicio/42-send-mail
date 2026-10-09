/**
 * Templates de exemplo (a galeria "Start from a template") ficam na mesma
 * coleção `email_templates` dos templates normais. O que os diferencia é a flag
 * `is_example` gravada pelo frontend em `design_json.__meta` — ver
 * frontend/src/lib/api.ts (getTemplateMeta / mergeTemplateMeta).
 *
 * Clones feitos a partir de um exemplo removem o `__meta`, então contam como
 * templates normais.
 */
export const isExampleTemplate = (record: any): boolean =>
  record?.design_json?.__meta?.is_example === true
