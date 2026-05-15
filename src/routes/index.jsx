import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SkeletonCard } from '../components'

// Direct lazy imports - bypasses barrel file for proper code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'))
const StudentLogin = lazy(() => import('../pages/StudentLogin').then(m => ({ default: m.StudentLogin })))
const StudentDashboard = lazy(() => import('../pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const ExamPage = lazy(() => import('../pages/ExamPage').then(m => ({ default: m.ExamPage })))
const ExamInterfacePage = lazy(() => import('../pages/ExamInterfacePage').then(m => ({ default: m.ExamInterfacePage })))
const ResultPage = lazy(() => import('../pages/ResultPage').then(m => ({ default: m.ResultPage })))
const AdminLogin = lazy(() => import('../pages/AdminLogin').then(m => ({ default: m.AdminLogin })))
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminMonitoring = lazy(() => import('../pages/AdminMonitoring').then(m => ({ default: m.AdminMonitoring })))
const AdminSchedule = lazy(() => import('../pages/AdminSchedule').then(m => ({ default: m.AdminSchedule })))
const AdminStudents = lazy(() => import('../pages/AdminStudents').then(m => ({ default: m.AdminStudents })))
const AdminExams = lazy(() => import('../pages/AdminExams').then(m => ({ default: m.AdminExams })))
const AdminQuestions = lazy(() => import('../pages/AdminQuestions').then(m => ({ default: m.AdminQuestions })))
const AdminClasses = lazy(() => import('../pages/AdminClasses').then(m => ({ default: m.AdminClasses })))
const AdminAnalysis = lazy(() => import('../pages/AdminAnalysis').then(m => ({ default: m.AdminAnalysis })))
const AdminResults = lazy(() => import('../pages/AdminResults').then(m => ({ default: m.AdminResults })))
const AdminSettings = lazy(() => import('../pages/AdminSettings').then(m => ({ default: m.AdminSettings })))
const AnnouncementsPage = lazy(() => import('../pages/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))
const ResultsPage = lazy(() => import('../pages/ResultsPage').then(m => ({ default: m.ResultsPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <SkeletonCard />
  </div>
)

const ProtectedRoute = ({ children, requiredRole }) => {
  const authStorage = JSON.parse(localStorage.getItem("auth-storage") || "{}")
  const user = authStorage.state?.user
  const role = authStorage.state?.role

  if (!user || role !== requiredRole) {
    return <Navigate to={requiredRole === "admin" ? "/admin/login" : "/student/login"} />
  }

  return children
}

export const router = createBrowserRouter([
  { path: "/", element: <Suspense fallback={<LoadingFallback />}><LandingPage /></Suspense> },
  { path: "/student/login", element: <Suspense fallback={<LoadingFallback />}><StudentLogin /></Suspense> },
  { path: "/student/dashboard", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><StudentDashboard /></Suspense></ProtectedRoute> },
  { path: "/student/exams", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><ExamPage /></Suspense></ProtectedRoute> },
  { path: "/exam/:examId", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><ExamInterfacePage /></Suspense></ProtectedRoute> },
  { path: "/result/:examId", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><ResultPage /></Suspense></ProtectedRoute> },
  { path: "/announcements", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><AnnouncementsPage /></Suspense></ProtectedRoute> },
  { path: "/results", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><ResultsPage /></Suspense></ProtectedRoute> },
  { path: "/profile", element: <ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense></ProtectedRoute> },
  { path: "/admin/login", element: <Suspense fallback={<LoadingFallback />}><AdminLogin /></Suspense> },
  { path: "/admin/dashboard", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense></ProtectedRoute> },
  { path: "/admin/monitoring", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminMonitoring /></Suspense></ProtectedRoute> },
  { path: "/admin/schedule", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminSchedule /></Suspense></ProtectedRoute> },
  { path: "/admin/students", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminStudents /></Suspense></ProtectedRoute> },
  { path: "/admin/exams", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminExams /></Suspense></ProtectedRoute> },
  { path: "/admin/questions", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminQuestions /></Suspense></ProtectedRoute> },
  { path: "/admin/classes", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminClasses /></Suspense></ProtectedRoute> },
  { path: "/admin/analysis", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminAnalysis /></Suspense></ProtectedRoute> },
  { path: "/admin/results", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminResults /></Suspense></ProtectedRoute> },
  { path: "/admin/settings", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingFallback />}><AdminSettings /></Suspense></ProtectedRoute> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
})
