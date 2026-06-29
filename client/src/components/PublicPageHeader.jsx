import { PawPrint } from 'lucide-react';

function PublicPageHeader({ title, subtitle, showPaw = true }) {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 text-center lg:px-8 lg:py-14">
        <div className="flex items-center justify-center gap-3">
          {showPaw && <PawPrint className="h-7 w-7 text-brand" strokeWidth={2.5} />}
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">{title}</h1>
        </div>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{subtitle}</p>
        )}
      </div>
    </section>
  );
}

export default PublicPageHeader;
