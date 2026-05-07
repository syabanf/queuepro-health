import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout({ user }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}