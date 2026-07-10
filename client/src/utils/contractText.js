import { CONTRACT_TEMPLATES, getContractTemplate } from '../constants/contractTemplates';

const SHARED_CLOSING = `By signing below, Participant confirms they have read, understood, and agree to all terms of this Agreement.`;

function fosterSuppliesProvidedText({ signer, kitten, version }) {
  return `FOSTER CARE AGREEMENT — SUPPLIES PROVIDED BY THE RESCUE (Version ${version})

This Foster Care Agreement ("Agreement") is entered into between Pawsitive Transformations ("Organization") and ${signer} ("Foster") regarding the care of ${kitten} ("Animal").

1. FOSTER RESPONSIBILITIES
Foster agrees to provide safe, humane, indoor-only care and to follow all medical, feeding, quarantine, and handling instructions provided by the Organization.

2. ORGANIZATION RESPONSIBILITIES
The Organization provides veterinary and medical care, vaccines, spay/neuter, microchipping, medications, and everyday supplies needed for the placement, including food, litter, and basic care items unless otherwise noted in writing.

3. RECORDS & COMMUNICATION
Foster agrees to maintain accurate records, attend scheduled appointments, and respond promptly to check-in requests from the Organization.

4. RETURN OF ANIMAL
Foster agrees that the Animal remains the property of the Organization until legally transferred and will be returned upon request or if the placement cannot continue.

5. LIABILITY
Foster accepts responsibility for routine daily care and agrees to notify the Organization immediately of any injury, illness, or emergency.

6. ELECTRONIC CONSENT
Foster acknowledges that an electronic signature carries the same legal effect as a handwritten signature.

${SHARED_CLOSING}`;
}

function fosterSuppliesNotProvidedText({ signer, kitten, version }) {
  return `FOSTER CARE AGREEMENT — SUPPLIES NOT PROVIDED BY THE RESCUE (Version ${version})

This Foster Care Agreement ("Agreement") is entered into between Pawsitive Transformations ("Organization") and ${signer} ("Foster") regarding the care of ${kitten} ("Animal").

1. FOSTER RESPONSIBILITIES
Foster agrees to provide safe, humane, indoor-only care and to follow all medical, feeding, quarantine, and handling instructions provided by the Organization.

2. ORGANIZATION RESPONSIBILITIES
The Organization provides veterinary and medical care, vaccines, spay/neuter, microchipping, and medications. Foster agrees to supply everyday care items for the placement, including food, litter, carriers, and other routine supplies unless the Organization agrees in writing to provide specific items.

3. RECORDS & COMMUNICATION
Foster agrees to maintain accurate records, attend scheduled appointments, and respond promptly to check-in requests from the Organization.

4. RETURN OF ANIMAL
Foster agrees that the Animal remains the property of the Organization until legally transferred and will be returned upon request or if the placement cannot continue.

5. LIABILITY
Foster accepts responsibility for routine daily care and agrees to notify the Organization immediately of any injury, illness, or emergency.

6. ELECTRONIC CONSENT
Foster acknowledges that an electronic signature carries the same legal effect as a handwritten signature.

${SHARED_CLOSING}`;
}

function adoptionAgreementText({ signer, kitten, version }) {
  return `CAT ADOPTION AGREEMENT (Version ${version})

This Cat Adoption Agreement ("Agreement") is entered into between Pawsitive Transformations ("Organization") and ${signer} ("Adopter") regarding the adoption of ${kitten} ("Animal").

1. ADOPTER RESPONSIBILITIES
Adopter agrees to provide permanent, indoor-only care, keep the Animal current on required veterinary care, and never declaw or allow free-roaming.

2. ADOPTION FEE
Adopter agrees to pay the adoption fee disclosed by the Organization at the time of adoption. The fee supports rescue operations and is not a purchase price.

3. MEDICAL DISCLOSURE
The Organization discloses all known medical history. Adopter understands rescue animals may have unknown backgrounds and accepts responsibility for ongoing routine care.

4. RETURN POLICY
If the adoption cannot continue for any reason, Adopter agrees to return the Animal to the Organization and not rehome or surrender the Animal independently.

5. ELECTRONIC CONSENT
Adopter acknowledges that an electronic signature carries the same legal effect as a handwritten signature.

${SHARED_CLOSING}`;
}

const TEMPLATE_TEXT = {
  foster_supplies_provided: fosterSuppliesProvidedText,
  foster_supplies_not_provided: fosterSuppliesNotProvidedText,
  adoption: adoptionAgreementText,
};

export function getDefaultContractText(contract) {
  const signer = contract?.signerName || '[Signer Name]';
  const kitten = contract?.kittenName || contract?.kitten?.name || '[Kitten Name]';
  const template = getContractTemplate(contract?.templateSlug);
  const version = contract?.documentVersion || template.version;
  const builder = TEMPLATE_TEXT[template.slug] || TEMPLATE_TEXT.foster_supplies_provided;
  return builder({ signer, kitten, version });
}

export function listContractTemplateOptions() {
  return CONTRACT_TEMPLATES;
}
