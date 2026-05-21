"use client";

import FoodMenuScreen from "@/components/menu/FoodMenuScreen";

export default function StudentActiveMenuPage() {
  return (
    <FoodMenuScreen
      allowProtectedFallback={true}
      mode="system"
      emptyStateMessage="No approved meal plan available"
      failureStateMessage="Failed to load approved menu"
    />
  );
}
