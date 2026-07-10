export const CONTRACT_TEMPLATES = [
  {
    slug: 'foster_supplies_provided',
    type: 'FOSTER',
    label: 'Foster Care Agreement — supplies provided by the Rescue',
    version: '2026.1',
  },
  {
    slug: 'foster_supplies_not_provided',
    type: 'FOSTER',
    label: 'Foster Care Agreement — supplies NOT provided by the Rescue',
    version: '2026.1',
  },
  {
    slug: 'adoption',
    type: 'ADOPTION',
    label: 'Cat Adoption Agreement',
    version: '2026.1',
  },
];

export function getContractTemplate(slug) {
  return CONTRACT_TEMPLATES.find((template) => template.slug === slug) || CONTRACT_TEMPLATES[0];
}

export function getContractTemplateLabel(slug) {
  return getContractTemplate(slug).label;
}
