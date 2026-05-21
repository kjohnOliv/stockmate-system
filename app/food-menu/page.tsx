"use client";

import FoodMenuScreen from "@/components/menu/FoodMenuScreen";

export default function FoodMenuPage() {
  return (
    <FoodMenuScreen
      allowProtectedFallback={true}
      mode="public"
      emptyStateMessage="No public menu available"
      failureStateMessage="Failed to load public menu"
    />
  );
}
