export function getDefaultContractText(contract) {
  const signer = contract?.signerName || '[Signer Name]';
  const kitten = contract?.kittenName || contract?.kitten?.name || '[Kitten Name]';
  const type = contract?.type === 'ADOPTION' ? 'Adoption' : 'Foster Care';
  const version = contract?.documentVersion || '1.0';

  return `${type.toUpperCase()} AGREEMENT (Version ${version})

This ${type} Agreement ("Agreement") is entered into between Pawsitive Transformations ("Organization") and ${signer} ("Participant") regarding the care of ${kitten} ("Animal").

1. PARTICIPANT RESPONSIBILITIES
Participant agrees to provide safe, humane care and to follow all medical, feeding, and handling instructions provided by the Organization.

2. ORGANIZATION RESPONSIBILITIES
The Organization will provide guidance, support, and necessary supplies when available. Medical decisions remain under the direction of authorized Organization representatives.

3. RECORDS & COMMUNICATION
Participant agrees to maintain accurate records and respond promptly to check-in requests from the Organization.

4. RETURN OF ANIMAL
Participant agrees that any animal placed under this Agreement remains the property of the Organization until legally transferred, and will be returned upon request.

5. LIABILITY
Participant accepts responsibility for routine care and agrees to notify the Organization immediately of any injury, illness, or emergency.

6. ELECTRONIC CONSENT
Participant acknowledges that an electronic signature carries the same legal effect as a handwritten signature.

By signing below, Participant confirms they have read, understood, and agree to all terms of this Agreement.`;
}
