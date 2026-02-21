import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import ProcessClaimPage from "@/pages/ProcessClaimPage";
import ImportDataPage from "@/pages/ImportDataPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CitizensPage from "@/pages/CitizensPage";
import SystemControlPage from "@/pages/SystemControlPage";

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const processClaimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/process-claim",
  component: ProcessClaimPage,
});

const importDataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import-data",
  component: ImportDataPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: TransactionsPage,
});

const citizensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/citizens",
  component: CitizensPage,
});

const systemControlRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/system-control",
  component: SystemControlPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  processClaimRoute,
  importDataRoute,
  transactionsRoute,
  citizensRoute,
  systemControlRoute,
]);
