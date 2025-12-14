/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import DynamicThemeProvider from './components/layout/DynamicThemeProvider';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import RoleBasedHome from './components/layout/RoleBasedHome';
import TicketsPage from './pages/TicketsPage';
import SignIn from './pages/SignIn';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';
import EditTicket from './pages/EditTicket';
import AllTickets from './pages/AllTickets';
import { UsersPage } from './pages/UsersPage';
import { Settings } from './pages/Settings';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { EditProjectPage } from './pages/EditProjectPage';
import { NewTaskPage } from './pages/NewTaskPage';
import { EditTaskPage } from './pages/EditTaskPage';
import AlgoliaSetup from './pages/AlgoliaSetup';
import AlgoliaManualSync from './pages/AlgoliaManualSync';
import LayoutTest from './pages/LayoutTest';
import ExportPage from './pages/ExportPage';
import ImportPage from './pages/ImportPage';
import SurveyPage from './pages/SurveyPage';
import SelfHelpPage from './pages/SelfHelpPage';
import FAQManagementPage from './pages/FAQManagementPage';
import KnowledgeBaseManagementPage from './pages/KnowledgeBaseManagementPage';
import ManageWelcomeLinks from './pages/admin/ManageWelcomeLinks';
import TenantManagementPage from './pages/TenantManagementPage';
import WebhooksPage from './pages/WebhooksPage';
import CompanyManagement from './pages/CompanyManagement';
import OrganizationManagement from './pages/OrganizationManagement';
import OrganizationWebhooksPage from './pages/OrganizationWebhooksPage';
import BillingPage from './pages/BillingPage';
import { AuthProvider } from './lib/auth/AuthContext';
import { ConfigProvider } from './lib/context/ConfigContext';
import { TenantProvider } from './lib/context/TenantContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SetupGuard from './components/setup/SetupGuard';
import TenantMigrationGuard from './components/migration/TenantMigrationGuard';

function App() {
  console.log('App component rendered');
  return (
    <ThemeProvider>
      <AuthProvider>
        <TenantMigrationGuard>
          <TenantProvider>
            <ConfigProvider>
              <DynamicThemeProvider>
              <BrowserRouter>
              <Routes>
                <Route path="/signin" element={<SignIn />} />
                <Route path="/survey" element={<SurveyPage />} />
                <Route path="/*" element={
                  <SetupGuard>
                    <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RoleBasedHome />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-ticket"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NewTicket />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="tech">
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TicketsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/new"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NewTicket />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/all"
                element={
                  <ProtectedRoute requiredRole="tech">
                    <AppLayout>
                      <AllTickets />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/edit/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <EditTicket />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TicketDetail />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/self-help"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SelfHelpPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/faq-management"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <FAQManagementPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/knowledge-base"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <KnowledgeBaseManagementPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/welcome-links"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <ManageWelcomeLinks />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tenants"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <TenantManagementPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/export"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ExportPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <ImportPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/webhooks"
                element={
                  <ProtectedRoute requiredRole={["organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <WebhooksPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/companies"
                element={
                  <ProtectedRoute requiredRole={["company_admin", "organization_admin", "system_admin", "super_admin"]}>
                    <AppLayout>
                      <CompanyManagement />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <OrganizationManagement />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <BillingPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/webhooks"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <OrganizationWebhooksPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/algolia"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AlgoliaSetup />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/algolia/manual"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AlgoliaManualSync />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/test/layout"
                element={
                  <ProtectedRoute>
                    <LayoutTest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProjectsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NewProjectPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProjectDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/edit/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <EditProjectPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/tasks/new"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NewTaskPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/tasks/edit/:taskId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <EditTaskPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
                      <Route path="*" element={<div>Page not found</div>} />
                    </Routes>
                  </SetupGuard>
                } />
              </Routes>
              </BrowserRouter>
            </DynamicThemeProvider>
          </ConfigProvider>
          </TenantProvider>
        </TenantMigrationGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
