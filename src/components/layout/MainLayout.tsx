import { useState } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import {
  Building2,
  FolderOpen,
  Menu,
  X,
  FileText,
  Ruler,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Header from "./Header";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    current: false,
  },
  { name: "Projects", href: "/projects", icon: FolderOpen, current: true },
  {
    name: "Bill History",
    href: "/bill-history",
    icon: FileText,
    current: false,
  },
  { name: "Measurements", href: "/measurements", icon: Ruler, current: false },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  const isCurrentPath = (path: string) => {
    if (path === "/projects") {
      return (
        location.pathname === "/projects" ||
        location.pathname === "/" || // Keep / active for projects if needed, though / is now landing
        location.pathname.startsWith("/projects")
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform bg-card border-r shadow-elegant transition-all duration-300 ease-in-out lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b bg-gradient-primary">
          <div className={cn("flex items-center", sidebarCollapsed ? "justify-center w-full" : "space-x-3")}>
            <Building2 className="h-8 w-8 text-primary-foreground flex-shrink-0" />
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-primary-foreground">CRABS</h1>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-primary-foreground hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-6">
          {navigation.map((item) => {
            const current = isCurrentPath(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  sidebarCollapsed ? "justify-center" : "",
                  current
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", !sidebarCollapsed && "mr-3")} />
                {!sidebarCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar collapse toggle */}
        <div className="absolute bottom-4 left-0 right-0 px-2 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className={cn("flex flex-col min-h-screen transition-all duration-300", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
}
