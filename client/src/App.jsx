import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { DashboardRedirect, GuestOnly, RequireAuth } from './components/layout/Guards.jsx';
import { Layout } from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';

// Route-level code splitting keeps the first load small (LCP target under 2.5 s).
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));

const PostRequest = lazy(() => import('./pages/PostRequest.jsx'));
const BrowseRequests = lazy(() => import('./pages/BrowseRequests.jsx'));
const RequestDetails = lazy(() => import('./pages/RequestDetails.jsx'));
const Providers = lazy(() => import('./pages/Providers.jsx'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard.jsx'));
const MyRequests = lazy(() => import('./pages/customer/MyRequests.jsx'));

const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard.jsx'));
const MyOffers = lazy(() => import('./pages/provider/MyOffers.jsx'));
const EditProfile = lazy(() => import('./pages/provider/EditProfile.jsx'));
const Availability = lazy(() => import('./pages/provider/Availability.jsx'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminOverview = lazy(() => import('./pages/admin/Overview.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));
const AdminVerifications = lazy(() => import('./pages/admin/Verifications.jsx'));
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'));
const AdminRequests = lazy(() => import('./pages/admin/Requests.jsx'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews.jsx'));
const AdminCategories = lazy(() => import('./pages/admin/Categories.jsx'));
const AdminTips = lazy(() => import('./pages/admin/Tips.jsx'));
const AdminInbox = lazy(() => import('./pages/admin/Inbox.jsx'));
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations.jsx'));

const HowItWorks = lazy(() => import('./pages/help/HowItWorks.jsx'));
const Faq = lazy(() => import('./pages/help/Faq.jsx'));
const About = lazy(() => import('./pages/help/About.jsx'));
const Contact = lazy(() => import('./pages/help/Contact.jsx'));
const Safety = lazy(() => import('./pages/help/Safety.jsx'));
const Terms = lazy(() => import('./pages/help/Terms.jsx'));
const Privacy = lazy(() => import('./pages/help/Privacy.jsx'));
const Tips = lazy(() => import('./pages/help/Tips.jsx'));
const TipDetail = lazy(() => import('./pages/help/TipDetail.jsx'));
const Developers = lazy(() => import('./pages/help/Developers.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="reset-password" element={<ResetPassword />} />

        <Route path="requests" element={<BrowseRequests />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="providers" element={<Providers />} />
        <Route path="providers/:id" element={<ProviderProfile />} />

        <Route path="post-request" element={<PostRequest />} />

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardRedirect />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route element={<RequireAuth roles={['customer']} />}>
          <Route path="customer" element={<CustomerDashboard />} />
          <Route path="customer/requests" element={<MyRequests />} />
        </Route>

        <Route element={<RequireAuth roles={['provider']} />}>
          <Route path="provider" element={<ProviderDashboard />} />
          <Route path="provider/requests" element={<BrowseRequests forProvider />} />
          <Route path="provider/offers" element={<MyOffers />} />
          <Route path="provider/profile" element={<EditProfile />} />
          <Route path="provider/availability" element={<Availability />} />
        </Route>

        <Route element={<RequireAuth roles={['admin']} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="tips" element={<AdminTips />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="integrations" element={<AdminIntegrations />} />
          </Route>
        </Route>

        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="faq" element={<Faq />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="safety" element={<Safety />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="tips" element={<Tips />} />
        <Route path="tips/:slug" element={<TipDetail />} />
        <Route path="developers" element={<Developers />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
