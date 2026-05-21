"use client";

import FoodMenuScreen from "@/components/menu/FoodMenuScreen";

export default function PublicMenuPage() {
  return (
    <FoodMenuScreen
      allowProtectedFallback={false}
      mode="public"
      emptyStateMessage="No public menu available"
      failureStateMessage="Failed to load public menu"
    />
  );
}
