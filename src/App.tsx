import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UnlockedTutorsProvider } from "@/contexts/UnlockedTutorsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";  // ← ADD THIS
import Index from "./pages/Index";
import Tutors from "./pages/Tutors";
import TutorProfile from "./pages/TutorProfile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardProfile from "./pages/dashboard/DashboardProfile";
import DashboardWallet from "./pages/dashboard/DashboardWallet";
import DashboardCalendar from "./pages/dashboard/DashboardCalendar";
import DashboardBookingDetail from "./pages/dashboard/DashboardBookingDetail";
import DashboardChat from "./pages/dashboard/DashboardChat";
import DashboardChangePassword from "./pages/dashboard/DashboardChangePassword";
import StudentHome from "./pages/students/StudentHome";
import StudentSessions from "./pages/students/StudentSessions";
import StudentMessages from "./pages/students/StudentMessages";
import StudentProfile from "./pages/students/StudentProfile";
import StudentSettings from "./pages/students/StudentSettings";
import StudentCalendar from "./pages/students/StudentCalendar";
import StudentBookingDetail from "./pages/students/StudentBookingDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UnlockedTutorsProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/tutors" element={<Tutors />} />
          <Route path="/tutors/:id" element={<TutorProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/:role" element={<SignUp />} />

          {/* Teacher Dashboard - Protected */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRole="teacher"><DashboardHome /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute allowedRole="teacher"><DashboardProfile /></ProtectedRoute>} />
          <Route path="/dashboard/wallet" element={<ProtectedRoute allowedRole="teacher"><DashboardWallet /></ProtectedRoute>} />
          <Route path="/dashboard/calendar" element={<ProtectedRoute allowedRole="teacher"><DashboardCalendar /></ProtectedRoute>} />
          <Route path="/dashboard/booking/:id" element={<ProtectedRoute allowedRole="teacher"><DashboardBookingDetail /></ProtectedRoute>} />
          <Route path="/dashboard/chat" element={<ProtectedRoute allowedRole="teacher"><DashboardChat /></ProtectedRoute>} />
          <Route path="/dashboard/change-password" element={<ProtectedRoute allowedRole="teacher"><DashboardChangePassword /></ProtectedRoute>} />

          {/* Student Dashboard - Protected */}
          <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentHome /></ProtectedRoute>} />
          <Route path="/student/sessions" element={<ProtectedRoute allowedRole="student"><StudentSessions /></ProtectedRoute>} />
          <Route path="/student/calendar" element={<ProtectedRoute allowedRole="student"><StudentCalendar /></ProtectedRoute>} />
          <Route path="/student/booking/:id" element={<ProtectedRoute allowedRole="student"><StudentBookingDetail /></ProtectedRoute>} />
          <Route path="/student/messages" element={<ProtectedRoute allowedRole="student"><StudentMessages /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRole="student"><StudentProfile /></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRole="student"><StudentSettings /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </UnlockedTutorsProvider>
  </QueryClientProvider>
);

export default App;