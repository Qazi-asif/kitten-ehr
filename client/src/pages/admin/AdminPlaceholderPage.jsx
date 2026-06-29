function AdminPlaceholderPage({ title, description }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default AdminPlaceholderPage;
