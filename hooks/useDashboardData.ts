import { useState, useEffect } from "react";

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    inStock: 0,
    lowStock: 0,
    noStock: 0,
    pendingUsers: 0,
    pendingPlans: 0,
  });

  useEffect(() => {
    fetch("http://localhost:8080/api/dashboard/overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch((err) => console.error("Error fetching dashboard stats:", err));
  }, []);

  return stats;
};