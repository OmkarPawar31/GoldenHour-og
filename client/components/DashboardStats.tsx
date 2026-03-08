"use client";

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border p-4">
        <h4 className="text-sm text-gray-500">Active Emergencies</h4>
        <p className="text-2xl font-bold">0</p>
      </div>
      <div className="rounded-lg border p-4">
        <h4 className="text-sm text-gray-500">Available Ambulances</h4>
        <p className="text-2xl font-bold">0</p>
      </div>
      <div className="rounded-lg border p-4">
        <h4 className="text-sm text-gray-500">Resolved Today</h4>
        <p className="text-2xl font-bold">0</p>
      </div>
    </div>
  );
}
