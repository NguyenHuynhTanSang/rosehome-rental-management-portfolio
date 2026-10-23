import {
  Route,
  Routes,
} from "react-router";

import WebsiteImages
  from "./pages/WebsiteImages";

import WebsiteFaqs
  from "./pages/WebsiteFaqs";

import AdminLayout
  from "./components/AdminLayout";

import ProtectedRoute
  from "./components/ProtectedRoute";


import Dashboard
  from "./pages/Dashboard";

import Login
  from "./pages/Login";

import Rooms
  from "./pages/Rooms";

import RoomDetails
  from "./pages/RoomDetails";

import Tenants
  from "./pages/Tenants";

import TenantDetails
  from "./pages/TenantDetails";

import Contracts
  from "./pages/Contracts";

import ContractDetails
  from "./pages/ContractDetails";

import MonthlyOperations
  from "./pages/MonthlyOperations";

import MeterReadings
  from "./pages/MeterReadings";

import Invoices
  from "./pages/Invoices";

import InvoiceDetails
  from "./pages/InvoiceDetails";

import Payments
  from "./pages/Payments";

import Debts
  from "./pages/Debts";

import WebsiteManagement
  from "./pages/WebsiteManagement";

import WebsiteSettings
  from "./pages/WebsiteSettings";

import WebsiteRooms
  from "./pages/WebsiteRooms";

import WebsiteRoomEdit
  from "./pages/WebsiteRoomEdit";

import AuditLogs
  from "./pages/AuditLogs";

import RosehomeAI
  from "./pages/RosehomeAI";


function App() {

  return (

    <Routes>

      {/* ==========================
          PUBLIC
      ========================== */}

      <Route
        path="/login"
        element={
          <Login />
        }
      />


      {/* ==========================
          PROTECTED ADMIN
      ========================== */}

      <Route
        element={
          <ProtectedRoute />
        }
      >

        <Route
          element={
            <AdminLayout />
          }
        >

          {/* ==========================
              DASHBOARD
          ========================== */}

          <Route
            index
            element={
              <Dashboard />
            }
          />


          {/* ==========================
              MONTHLY OPERATIONS
          ========================== */}

          <Route
            path="monthly-operations"
            element={
              <MonthlyOperations />
            }
          />


          {/* ==========================
              ROOMS
          ========================== */}

          <Route
            path="rooms"
            element={
              <Rooms />
            }
          />

          <Route
            path="rooms/:roomId"
            element={
              <RoomDetails />
            }
          />


          {/* ==========================
              TENANTS
          ========================== */}

          <Route
            path="tenants"
            element={
              <Tenants />
            }
          />

          <Route
            path="tenants/:tenantId"
            element={
              <TenantDetails />
            }
          />


          {/* ==========================
              CONTRACTS
          ========================== */}

          <Route
            path="contracts"
            element={
              <Contracts />
            }
          />

          <Route
            path="contracts/:contractId"
            element={
              <ContractDetails />
            }
          />


          {/* ==========================
              METER READINGS
          ========================== */}

          <Route
            path="meter-readings"
            element={
              <MeterReadings />
            }
          />


          {/* ==========================
              INVOICES
          ========================== */}

          <Route
            path="invoices"
            element={
              <Invoices />
            }
          />

          <Route
            path="invoices/:invoiceId"
            element={
              <InvoiceDetails />
            }
          />


          {/* ==========================
              PAYMENT HISTORY
          ========================== */}

          <Route
            path="payments"
            element={
              <Payments />
            }
          />


          {/* ==========================
              DEBTS
          ========================== */}

          <Route
            path="debts"
            element={
              <Debts />
            }
          />


          {/* ==========================
              WEBSITE MANAGEMENT
          ========================== */}

          <Route
            path="website"
            element={
              <WebsiteManagement />
            }
          />

          <Route
            path="website/settings"
            element={
              <WebsiteSettings />
            }
          />

          <Route
            path="website/rooms"
            element={
              <WebsiteRooms />
            }
          />

          <Route
            path="website/rooms/:roomId"
            element={
              <WebsiteRoomEdit />
            }
          />


          {/* ==========================
              AUDIT LOGS
          ========================== */}

          <Route
            path="audit-logs"
            element={
              <AuditLogs />
            }
          />


          {/* ==========================
              ROSEHOME AI
          ========================== */}

          <Route
            path="ai"
            element={
              <RosehomeAI />
            }
          />


          {/* ==========================
              WEBSITE FAQ
          ========================== */}

          <Route
            path="website/faq"
            element={
              <WebsiteFaqs />
            }
          />


          {/* ==========================
              WEBSITE IMAGES
          ========================== */}

          <Route
            path="website/images"
            element={
              <WebsiteImages />
            }
          />

        </Route>

      </Route>

    </Routes>

  );
}


export default App;