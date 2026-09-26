import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RootRedirect } from '@/features/auth/RootRedirect'
import { LoginLayout } from '@/layout/LoginLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage'
import { IssueLicensePage } from '@/pages/licensing/IssueLicensePage'
import { LicensesListPage } from '@/pages/licensing/LicensesListPage'
import { CustomersListPage } from '@/pages/customers/CustomersListPage'
import { CustomerEditorPage } from '@/pages/customers/CustomerEditorPage'
import { OperatorsListPage } from '@/pages/operators/OperatorsListPage'
import { PlanListPage } from '@/pages/licensing/PlanListPage'
import { CreatePlanPage } from '@/pages/licensing/CreatePlanPage'
import { PlanDetailPage } from '@/pages/licensing/PlanDetailPage'
import { GrantModulesPage } from '@/pages/licensing/GrantModulesPage'
import { TrainingSessionsListPage } from '@/pages/training/TrainingSessionsListPage'
import { ScheduleTrainingPage } from '@/pages/training/ScheduleTrainingPage'
import { PlatformEmailSettingsPage } from '@/pages/settings/PlatformEmailSettingsPage'
import { PlatformShellLayout } from '@/shell/PlatformShellLayout'
import { RoadmapPlaceholderPage } from '@/pages/RoadmapPlaceholderPage'

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <PlatformShellLayout />,
        children: [
          { index: true, element: <Navigate to="inicio" replace /> },
          { path: 'inicio', element: <DashboardHomePage /> },
          { path: 'licencias/nueva', element: <IssueLicensePage /> },
          { path: 'licencias/historial', element: <LicensesListPage /> },
          { path: 'licencias/:grantId/modulos', element: <GrantModulesPage /> },
          { path: 'operadores', element: <OperatorsListPage /> },
          { path: 'clientes', element: <CustomersListPage /> },
          { path: 'clientes/nuevo', element: <CustomerEditorPage /> },
          { path: 'clientes/:customerId/editar', element: <CustomerEditorPage /> },
          { path: 'planes', element: <PlanListPage /> },
          { path: 'planes/nuevo', element: <CreatePlanPage /> },
          { path: 'planes/:code', element: <PlanDetailPage /> },
          { path: 'capacitaciones', element: <TrainingSessionsListPage /> },
          { path: 'capacitaciones/nueva', element: <ScheduleTrainingPage /> },
          { path: 'configuracion/correo', element: <PlatformEmailSettingsPage /> },
          { path: 'soporte', element: <RoadmapPlaceholderPage /> },
        ],
      },
    ],
  },
  { path: '/licencias', element: <Navigate to="/app/licencias/nueva" replace /> },
  { path: '/', element: <RootRedirect /> },
  { path: '*', element: <RootRedirect /> },
]
