import { ApiClient } from "@/lib/api";
import { useState, useEffect } from "react";
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
          { id: 2, from: "2026-02-09", to: "2026-02-13", status: "DONE", estimatedBudget: 8546, actualExpenses: 8157 }
        ]);
      }
    };
    loadPlans();
  }, []);

  const handleApprove = (planId: number) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, status: "ONGOING" }
          : p
      )
    );
    setSelectedPlan((prev) => (prev?.id === planId ? { ...prev, status: "ONGOING" } : prev));
  };

  const handleComplete = async () => {
    if (!selectedPlan) return;
    if (!confirm("Mark this meal plan as completed?")) return;

    await ApiClient.patch(`/api/meal-plans/${selectedPlan.id}/status`, {
      status: "DONE"
    });

    setPlans((prev) =>
      prev.map((p) => (p.id === selectedPlan.id ? { ...p, status: "DONE" } : p))
    );
    setSelectedPlan(null);
    setShowPlanner(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ONGOING": return "bg-emerald-200 text-emerald-800";
      case "DONE": return "bg-slate-300 text-slate-700";
      case "PENDING": return "bg-amber-200 text-amber-800";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-8">

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

      <div className="p-6 bg-white border-[6px] border-black">
        <h3 className="font-black uppercase text-xl">Kitchen Status</h3>
        <p className="mt-3 font-bold uppercase text-sm">{stats.pendingPlans > 0 ? "Service Active" : "Kitchen Idle"}</p>
        {stats.pendingPlans > 0 && (
          <button onClick={handleComplete} className="mt-4 px-6 py-3 bg-green-500 text-white font-black border-4 border-black">Finish Service</button>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={() => setShowPlanner(true)} className="px-6 py-3 bg-blue-700 text-white font-black rounded-xl">View Meal Plans</button>
        <button onClick={() => setShowChecklist(true)} className="px-6 py-3 bg-cyan-700 text-white font-black rounded-xl">View Checklist</button>
      </div>

      {showPlanner && (
        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-lg">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-black uppercase">Meal Planner</h3>
            <button onClick={() => setShowPlanner(false)} className="text-sm font-bold">Close</button>
          </div>

          <div className="flex gap-3 mb-4">
            <AppSelect
              value={planFilter}
              onValueChange={(value) => setPlanFilter(value as "All" | MealPlan["status"])}
              className="min-w-[180px] rounded-xl px-4 py-2"
              options={[
                { label: "All Status", value: "All" },
                { label: "Pending", value: "PENDING" },
                { label: "Ongoing", value: "ONGOING" },
                { label: "Done", value: "DONE" },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-[#fff9c4] border-b border-black">
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
                    <tr key={plan.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-3">{plan.id}</td>
                    <td className="p-3">{plan.from}</td>
                    <td className="p-3">{plan.to}</td>
                    <td className="p-3">₱{plan.estimatedBudget.toLocaleString()}</td>
                    <td className="p-3"><span className={`px-3 py-1 rounded-full ${getStatusStyle(plan.status)}`}>{plan.status}</span></td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => setSelectedPlan(plan)} className="px-3 py-1 bg-green-500 text-white rounded-lg">View</button>
                      {plan.status === 'PENDING' && <button onClick={() => handleApprove(plan.id)} className="px-3 py-1 bg-blue-500 text-white rounded-lg">Approve</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPlan && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h4 className="font-black">Selected Plan #{selectedPlan.id}</h4>
              <p>Date: {selectedPlan.from} to {selectedPlan.to}</p>
              <p>Status: {selectedPlan.status}</p>
              <p>Estimated Budget: ₱{selectedPlan.estimatedBudget.toLocaleString()}</p>
              <p>Actual Expenses: ₱{selectedPlan.actualExpenses?.toLocaleString() ?? 'N/A'}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleComplete} className="bg-green-500 text-white px-4 py-2 rounded-xl">Mark Done</button>
                <button onClick={() => setSelectedPlan(null)} className="bg-gray-300 text-black px-4 py-2 rounded-xl">Clear</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showChecklist && (
        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-lg">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-black uppercase">Checklist</h3>
            <button onClick={() => setShowChecklist(false)} className="text-sm font-bold">Close</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#fff9c4] border-b border-black">
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
                  { item: 'Carrots', required: '15', purchased: '15', price: '₱40', status: 'Done' },
                  { item: 'Potato', required: '5', purchased: '5', price: '₱28', status: 'Done' },
                  { item: 'Chicken', required: '10', purchased: '8', price: '₱360', status: 'Pending' }
                ].map((row) => (
                  <tr key={row.item} className="border-b border-slate-200">
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

          <div className="mt-4 font-black">
            <p>Total Estimated: ₱4080</p>
            <p>Total Actual: ₱4865</p>
            <p>Difference: ₱785</p>
          </div>
        </div>
      )}
    </div>
  );
}
