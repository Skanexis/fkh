import { createBrowserRouter } from "react-router";
import { UserLayout } from "./components/UserLayout";
import { Home } from "./pages/Home";
import { Catalog } from "./pages/Catalog";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Profile } from "./pages/Profile";
import { Contacts } from "./pages/Contacts";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminPayments } from "./pages/admin/AdminPayments";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminShippingMethods } from "./pages/admin/AdminShippingMethods";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: UserLayout,
    children: [
      { index: true, Component: Home },
      { path: "catalog", Component: Catalog },
      { path: "product/:id", Component: ProductDetail },
      { path: "cart", Component: Cart },
      { path: "profile", Component: Profile },
      { path: "contacts", Component: Contacts },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "products", Component: AdminProducts },
      { path: "orders", Component: AdminOrders },
      { path: "payments", Component: AdminPayments },
      { path: "users", Component: AdminUsers },
      { path: "shipping", Component: AdminShippingMethods },
      { path: "settings", Component: AdminSettings },
    ],
  },
]);
