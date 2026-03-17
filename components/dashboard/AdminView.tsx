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

      {/* OVERVIEW */}
      <div>
        <h2 className="font-black italic uppercase text-2xl mb-4">Inventory Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 bg-green-200 border-4 border-black">
            <p className="text-xs font-black uppercase">In Stock</p>
            <p className="text-3xl font-black">{stats.inStock}</p>
          </div>

          <div className="p-6 bg-amber-200 border-4 border-black">
            <p className="text-xs font-black uppercase">Low Stock</p>
            <p className="text-3xl font-black">{stats.lowStock}</p>
          </div>

          <div className="p-6 bg-red-200 border-4 border-black">
            <p className="text-xs font-black uppercase">No Stock</p>
            <p className="text-3xl font-black">{stats.noStock}</p>
          </div>

        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="font-black italic uppercase text-2xl mb-4">Quick Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="p-6 bg-black text-white border-4 border-black cursor-pointer hover:bg-white hover:text-black transition">
            <h3 className="font-black uppercase">Manage Accounts</h3>
            <p className="text-xs">{stats.pendingUsers} Pending Signups</p>
          </div>

          <div className="p-6 bg-white border-4 border-black cursor-pointer">
            <h3 className="font-black uppercase">View Inventory</h3>
          </div>

          <div className="p-6 bg-white border-4 border-black cursor-pointer">
            <h3 className="font-black uppercase">Pending Meal Plans</h3>
            <p className="text-xl font-black text-red-600">{stats.pendingPlans}</p>
          </div>

        </div>
      </div>

      {/* ANALYTICS */}
      <div>
        <h2 className="font-black italic uppercase text-2xl mb-4">Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="p-8 bg-white border-4 border-black">
            <h3 className="font-black uppercase">Most Used Ingredients</h3>
            <p className="text-xs text-gray-500">Top 5 ingredients used in meal plans</p>
          </div>

          <div className="p-8 bg-white border-4 border-black">
            <h3 className="font-black uppercase">Budget vs Expenses</h3>
            <p className="text-xs text-gray-500">Chart will be displayed here</p>
          </div>

        </div>
      </div>

    </div>
  );
}