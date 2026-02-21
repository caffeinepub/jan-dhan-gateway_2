import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileCheck,
  Upload,
  Receipt,
  Users,
  Settings,
  Shield,
} from "lucide-react";
import { SystemStatusBadge } from "@/components/SystemStatusBadge";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Process Claim", href: "/process-claim", icon: FileCheck },
  { name: "Import Data", href: "/import-data", icon: Upload },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Citizens", href: "/citizens", icon: Users },
  { name: "System Control", href: "/system-control", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Shield className="h-6 w-6 text-sidebar-primary mr-3" />
          <div>
            <h1 className="text-lg font-display font-semibold text-sidebar-foreground">
              Jan-Dhan Gateway
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Benefit Distribution</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
          © 2026. Built with ❤️ using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <div className="text-sm text-muted-foreground">
            Fraud-proof benefit distribution system
          </div>
          <SystemStatusBadge />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
