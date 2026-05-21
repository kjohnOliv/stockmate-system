interface AdminViewProps {
  stats: {
    pendingUsers: number;
    pendingPlans: number;
    inStock: number;
    lowStock: number;
    noStock: number;
  };
}

export default function AdminView({ stats }: AdminViewProps) {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-4 text-2xl font-black text-slate-900">Inventory Overview</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">In Stock</p>
            <p className="mt-3 text-3xl font-black text-emerald-700">{stats.inStock}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Low Stock</p>
            <p className="mt-3 text-3xl font-black text-amber-600">{stats.lowStock}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">No Stock</p>
            <p className="mt-3 text-3xl font-black text-red-600">{stats.noStock}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-black text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-black text-slate-900">Manage Accounts</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">{stats.pendingUsers} pending signups</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-black text-slate-900">View Inventory</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Review current quantities and thresholds.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-black text-slate-900">Pending Meal Plans</h3>
            <p className="mt-2 text-xl font-black text-red-600">{stats.pendingPlans}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-black text-slate-900">Analytics</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="font-black text-slate-900">Most Used Ingredients</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Top 5 ingredients used in meal plans.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="font-black text-slate-900">Budget vs Expenses</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Chart will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
