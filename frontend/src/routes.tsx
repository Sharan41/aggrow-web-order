import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RoleRoute } from "./auth/RoleRoute";
import { AppLayout } from "./components/AppLayout";
import { homeForRole } from "./routes-helper";
import Login from "./pages/Login";
import NewOrder from "./pages/customer/NewOrder";
import NewOrderPicker from "./pages/customer/NewOrderPicker";
import OrderHistory from "./pages/customer/OrderHistory";
import CustomerOrderDetail from "./pages/customer/OrderDetail";
import HoDashboard from "./pages/headOffice/Dashboard";
import HoOrderEdit from "./pages/headOffice/OrderEdit";
import { HoAllOrders, HoFactoryResponses, HoPending } from "./pages/headOffice/OrdersList";
import HoUsers from "./pages/headOffice/Users";
import HoCatalog from "./pages/headOffice/Catalog";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrderEdit from "./pages/admin/OrderEdit";
import { AdminAllOrders, AdminFactoryResponses, AdminPending } from "./pages/admin/OrdersList";
import { FactoryHistory, FactoryPending } from "./pages/factory/PendingOrders";
import FactoryOrderRespond from "./pages/factory/OrderRespond";
import NotificationsPage from "./pages/Notifications";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RoleRoute>
            <AppLayout />
          </RoleRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route
          path="/customer/new"
          element={
            <RoleRoute roles={["CUSTOMER"]}>
              <NewOrderPicker />
            </RoleRoute>
          }
        />
        <Route
          path="/customer/new/:formType"
          element={
            <RoleRoute roles={["CUSTOMER"]}>
              <NewOrder />
            </RoleRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <RoleRoute roles={["CUSTOMER"]}>
              <OrderHistory />
            </RoleRoute>
          }
        />
        <Route
          path="/customer/orders/:id"
          element={
            <RoleRoute roles={["CUSTOMER"]}>
              <CustomerOrderDetail />
            </RoleRoute>
          }
        />

        <Route
          path="/ho/dashboard"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <HoDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/pending"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <HoPending />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/orders"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <HoAllOrders />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/orders/:id"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <HoOrderEdit />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/factory"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <HoFactoryResponses />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/users"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <Navigate to="/ho/dashboard" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/ho/catalog"
          element={
            <RoleRoute roles={["HEAD_OFFICE"]}>
              <Navigate to="/ho/dashboard" replace />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/pending"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminPending />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminAllOrders />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminOrderEdit />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/factory"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminFactoryResponses />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <HoUsers />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/catalog"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <HoCatalog />
            </RoleRoute>
          }
        />

        <Route
          path="/factory/pending"
          element={
            <RoleRoute roles={["FACTORY"]}>
              <FactoryPending />
            </RoleRoute>
          }
        />
        <Route
          path="/factory/history"
          element={
            <RoleRoute roles={["FACTORY"]}>
              <FactoryHistory />
            </RoleRoute>
          }
        />
        <Route
          path="/factory/orders/:id"
          element={
            <RoleRoute roles={["FACTORY"]}>
              <FactoryOrderRespond />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
