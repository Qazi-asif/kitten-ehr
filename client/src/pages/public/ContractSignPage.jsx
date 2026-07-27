import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ContractSigningPad from '../../components/ContractSigningPad';
import { publicFetch } from '../../services/api';

function ContractSignPage() {
  const { token } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid signing link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    publicFetch(`/public/contracts/sign/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load this agreement.');
        }
        setContract(data);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load this agreement.');
        setContract(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSign(payload) {
    const response = await publicFetch(`/public/contracts/sign/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signatureImage: payload.signatureImage,
        signedAt: payload.signedAt,
        householdAcknowledgments: payload.householdAcknowledgments,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit signature.');
    }
    setSigned(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading agreement...
      </div>
    );
  }

  if (signed) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Thank you — you&apos;re signed</h1>
        <p className="mt-4 text-slate-600">
          Your electronic signature has been recorded. A copy may be emailed to you shortly.
        </p>
        <Link to="/" className="mt-8 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Back to home
        </Link>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Unable to open agreement</h1>
        <p className="mt-4 text-slate-600">{error || 'This signing link is invalid or has expired.'}</p>
        <Link to="/contact" className="mt-8 inline-block text-sm font-semibold text-brand hover:underline">
          Contact us for help
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {contract.type === 'ADOPTION' ? 'Cat Adoption Agreement' : 'Foster Care Agreement'}
        </h1>
        {contract.kittenName ? (
          <p className="mt-1 text-slate-600">For {contract.kittenName}</p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
        <ContractSigningPad
          contractId={contract.id}
          contractText={contract.agreementText}
          signerName={contract.signerName}
          contractType={contract.type}
          onClose={() => {
            window.location.href = '/';
          }}
          onSign={handleSign}
        />
      </div>
    </div>
  );
}

export default ContractSignPage;
