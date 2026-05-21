import { ApiClient } from "@/lib/api";
import { useEffect, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";

interface MealPlan {
  id: number;
  from: string;
  to: string;
  status: "ONGOING" | "DONE" | "PENDING";
  estimatedBudget: number;
  actualExpenses?: number;
}

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
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [planFilter, setPlanFilter] = useState<"All" | MealPlan["status"]>("All");

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await ApiClient.get("/api/meal-plans");
        if (res.ok) {
          const result = await res.json();
          const data = result?.data || result;
          if (Array.isArray(data)) setPlans(data);
        }
      } catch (error) {
        console.warn("Failed to load meal plans", error);
        setPlans([
          { id: 1, from: "2026-02-09", to: "2026-02-13", status: "ONGOING", estimatedBudget: 8546, actualExpenses: 8157 },
          { id: 2, from: "2026-02-09", to: "2026-02-13", status: "DONE", estimatedBudget: 8546, actualExpenses: 8157 },
        ]);
      }
    };
    loadPlans();
  }, []);

  const handleApprove = (planId: number) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, status: "ONGOING" } : p)));
    setSelectedPlan((prev) => (prev?.id === planId ? { ...prev, status: "ONGOING" } : prev));
  };

  const handleComplete = async () => {
    if (!selectedPlan) return;
    if (!confirm("Mark this meal plan as completed?")) return;

    await ApiClient.patch(`/api/meal-plans/${selectedPlan.id}/status`, {
      status: "DONE",
    });

    setPlans((prev) => prev.map((p) => (p.id === selectedPlan.id ? { ...p, status: "DONE" } : p)));
    setSelectedPlan(null);
    setShowPlanner(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ONGOING":
        return "bg-emerald-100 text-emerald-700";
      case "DONE":
        return "bg-slate-200 text-slate-700";
      case "PENDING":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-8">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-900">Kitchen Status</h3>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          {stats.pendingPlans > 0 ? "Service Active" : "Kitchen Idle"}
        </p>
        {stats.pendingPlans > 0 && (
          <button onClick={handleComplete} className="mt-4 rounded-2xl bg-[#2f6f4f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#285f44]">
            Finish Service
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={() => setShowPlanner(true)} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          View Meal Plans
        </button>
        <button onClick={() => setShowChecklist(true)} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          View Checklist
        </button>
      </div>

      {showPlanner && (
        <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_rgba(47,111,79,0.08)]">
          <div className="mb-4 flex justify-between">
            <h3 className="text-xl font-black text-slate-900">Meal Planner</h3>
            <button onClick={() => setShowPlanner(false)} className="text-sm font-bold text-slate-500 transition hover:text-slate-900">
              Close
            </button>
          </div>

          <div className="mb-4 flex gap-3">
            <AppSelect
              value={planFilter}
              onValueChange={(value) => setPlanFilter(value as "All" | MealPlan["status"])}
              className="min-w-[180px] px-4 py-2"
              options={[
                { label: "All Status", value: "All" },
                { label: "Pending", value: "PENDING" },
                { label: "Ongoing", value: "ONGOING" },
                { label: "Done", value: "DONE" },
              ]}
            />
          </div>

          <div className="hidden-scrollbar overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead className="table-header-emerald border-b border-emerald-100 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f6f4f]">
                <tr>
                  <th className="p-3">Plan #</th>
                  <th className="p-3">Date From</th>
                  <th className="p-3">Date To</th>
                  <th className="p-3">Est. Budget</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans
                  .filter((plan) => planFilter === "All" || plan.status === planFilter)
                  .map((plan) => (
                    <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">{plan.id}</td>
                      <td className="p-3">{plan.from}</td>
                      <td className="p-3">{plan.to}</td>
                      <td className="p-3">PHP {plan.estimatedBudget.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(plan.status)}`}>{plan.status}</span>
                      </td>
                      <td className="flex gap-2 p-3">
                        <button onClick={() => setSelectedPlan(plan)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                          View
                        </button>
                        {plan.status === "PENDING" && (
                          <button onClick={() => handleApprove(plan.id)} className="rounded-xl bg-[#2f6f4f] px-3 py-1.5 text-sm font-black text-white transition hover:bg-[#285f44]">
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {selectedPlan && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h4 className="font-black text-slate-900">Selected Plan #{selectedPlan.id}</h4>
              <p className="mt-2 text-sm font-medium text-slate-600">Date: {selectedPlan.from} to {selectedPlan.to}</p>
              <p className="text-sm font-medium text-slate-600">Status: {selectedPlan.status}</p>
              <p className="text-sm font-medium text-slate-600">Estimated Budget: PHP {selectedPlan.estimatedBudget.toLocaleString()}</p>
              <p className="text-sm font-medium text-slate-600">Actual Expenses: PHP {selectedPlan.actualExpenses?.toLocaleString() ?? "N/A"}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={handleComplete} className="rounded-2xl bg-[#2f6f4f] px-4 py-2 text-sm font-black text-white transition hover:bg-[#285f44]">
                  Mark Done
                </button>
                <button onClick={() => setSelectedPlan(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showChecklist && (
        <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_rgba(47,111,79,0.08)]">
          <div className="mb-4 flex justify-between">
            <h3 className="text-xl font-black text-slate-900">Checklist</h3>
            <button onClick={() => setShowChecklist(false)} className="text-sm font-bold text-slate-500 transition hover:text-slate-900">
              Close
            </button>
          </div>

          <div className="hidden-scrollbar overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead className="table-header-emerald border-b border-emerald-100 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f6f4f]">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Required Qty</th>
                  <th className="p-3">Purchased Qty</th>
                  <th className="p-3">Actual Price</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "Carrots", required: "15", purchased: "15", price: "PHP 40", status: "Done" },
                  { item: "Potato", required: "5", purchased: "5", price: "PHP 28", status: "Done" },
                  { item: "Chicken", required: "10", purchased: "8", price: "PHP 360", status: "Pending" },
                ].map((row) => (
                  <tr key={row.item} className="border-b border-slate-100">
                    <td className="p-3">{row.item}</td>
                    <td className="p-3">{row.required}</td>
                    <td className="p-3">{row.purchased}</td>
                    <td className="p-3">{row.price}</td>
                    <td className="p-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 font-black text-slate-700">
            <p>Total Estimated: PHP 4080</p>
            <p>Total Actual: PHP 4865</p>
            <p>Difference: PHP 785</p>
          </div>
        </div>
      )}
    </div>
  );
}
