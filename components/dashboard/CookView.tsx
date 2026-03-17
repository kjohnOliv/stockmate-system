interface CookViewProps {
  stats: {
    inStock: number;
    lowStock: number;
    noStock: number;
    pendingPlans: number;
    activePlanId: number;
  };
}

export default function CookView({ stats }: CookViewProps) {

  const handleFinishService = async () => {
    if (!stats.activePlanId) return;
    if (!confirm("Mark this meal plan as COMPLETED?")) return;

    await fetch(`http://localhost:8080/api/meal-plans/${stats.activePlanId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" })
    });

    window.location.reload();
  };

  return (
    <div className="space-y-10">

      {/* INVENTORY OVERVIEW */}
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

      {/* KITCHEN STATUS */}
      <div className="p-6 bg-white border-[6px] border-black">
        <h3 className="font-black uppercase text-xl">Kitchen Status</h3>

        <p className="mt-3 font-bold uppercase text-sm">
          {stats.pendingPlans > 0 ? "Service Active" : "Kitchen Idle"}
        </p>

        {stats.pendingPlans > 0 && (
          <button
            onClick={handleFinishService}
            className="mt-4 px-6 py-3 bg-green-500 text-white font-black border-4 border-black"
          >
            Finish Service
          </button>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="p-6 border-4 border-black bg-white cursor-pointer">
          <h3 className="font-black uppercase">View Inventory</h3>
        </div>

        <div className="p-6 border-4 border-black bg-white cursor-pointer">
          <h3 className="font-black uppercase">Create Meal Plan</h3>
        </div>

        <div className="p-6 border-4 border-black bg-white cursor-pointer">
          <h3 className="font-black uppercase">Add New Recipe</h3>
        </div>

        <div className="p-6 border-4 border-black bg-white cursor-pointer">
          <h3 className="font-black uppercase">Add Ingredient</h3>
        </div>

      </div>

    </div>
  );
}