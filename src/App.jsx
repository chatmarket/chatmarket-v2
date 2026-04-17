import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home.jsx';
import WatchVideo from './pages/WatchVideo';
import LiveView from './pages/LiveView';
import Upload from './pages/Upload';
import GoLive from './pages/GoLive';
import MyChannel from './pages/MyChannel';
import Settings from './pages/Settings.jsx';
import ChannelPage from './pages/ChannelPage';
import Search from './pages/Search';
import VideoCallPage from './pages/VideoCallPage';
import CrowdfundingList from './pages/CrowdfundingList';
import CrowdfundingDetail from './pages/CrowdfundingDetail';
import CrowdfundingNew from './pages/CrowdfundingNew';
import PlanDetail from './pages/PlanDetail';
import DirectChat from './pages/DirectChat';
import PlanSelect from './pages/PlanSelect';
import PlanConfirm from './pages/PlanConfirm';
import Blog from './pages/Blog';
import DonorDashboard from './pages/DonorDashboard';
import BlogDetail from './pages/BlogDetail';
import BlogEdit from './pages/BlogEdit';
import MyLibrary from './pages/MyLibrary';
import RevenueManagement from './pages/RevenueManagement';
import VideoCallRequest from './pages/VideoCallRequest';
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import ContentAnalytics from './pages/ContentAnalytics';
import CallHistory from './pages/CallHistory';
import CallSlotManage from './pages/CallSlotManage.jsx';
import CreatorDashboard from './pages/CreatorDashboard.jsx';
import CallCalendar from './pages/CallCalendar.jsx';
import MyReservations from './pages/MyReservations.jsx';
import MiniSchool from './pages/MiniSchool.jsx';
import SchoolTickets from './pages/SchoolTickets.jsx';
import EnterpriseDashboard from './pages/EnterpriseDashboard.jsx';
import MuxVideoPage from './pages/MuxVideoPage';
import VideoModeration from './pages/VideoModeration';
import FanClub from './pages/FanClub';
import NgWordAnalytics from './pages/NgWordAnalytics';
import CreatorRevenueDashboard from './pages/CreatorRevenueDashboard';
import WithdrawalRequest from './pages/WithdrawalRequest';
import LandingPage from './pages/LandingPage';
import CreatorSchedule from './pages/CreatorSchedule';
import ObsGuide from './pages/ObsGuide';
import EquipmentStore from './pages/EquipmentStore';
import Forum from './pages/Forum';
import ChannelSchedule from './pages/ChannelSchedule';
import MyTickets from './pages/MyTickets';
import TicketShop from './pages/TicketShop';
import TicketVerify from './pages/TicketVerify';
import MillionaireChallenge from './pages/MillionaireChallenge';
import VideoEngineComparison from './pages/VideoEngineComparison';
import InfraSlide from './pages/InfraSlide';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PrivacyEn from './pages/PrivacyEn';
import PrivacyKo from './pages/PrivacyKo';
import Recruit from './pages/Recruit';
import Community from './pages/Community';
import NotificationCenter from './pages/NotificationCenter';
import InfluencerCampaign from './pages/InfluencerCampaign';
import LegalCommercial from './pages/LegalCommercial';
import CompanyInfo from './pages/CompanyInfo';
import TestPayment from './pages/TestPayment';

// 認証不要の公開ページパス
const PUBLIC_PATHS = ['/recruit', '/terms', '/privacy', '/info', '/company', '/legal'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicPath = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && !isPublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<WatchVideo />} />
        <Route path="/live/:id" element={<LiveView />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/go-live" element={<GoLive />} />
        <Route path="/my-channel" element={<MyChannel />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/channel/:id" element={<ChannelPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/call/:callId" element={<VideoCallPage />} />
        <Route path="/crowdfunding" element={<CrowdfundingList />} />
        <Route path="/crowdfunding/new" element={<CrowdfundingNew />} />
        <Route path="/crowdfunding/:id" element={<CrowdfundingDetail />} />
        <Route path="/plan/:planId" element={<PlanDetail />} />
        <Route path="/chat/:channelId" element={<DirectChat />} />
        <Route path="/plan-select" element={<PlanSelect />} />
        <Route path="/plan-confirm" element={<PlanConfirm />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/donor-dashboard" element={<DonorDashboard />} />
        <Route path="/blog/new" element={<BlogEdit />} />
        <Route path="/blog/edit/:id" element={<BlogEdit />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/my-library" element={<MyLibrary />} />
        <Route path="/revenue" element={<RevenueManagement />} />
        <Route path="/call-request/:channelId" element={<VideoCallRequest />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/analytics" element={<ContentAnalytics />} />
        <Route path="/call-history" element={<CallHistory />} />
        <Route path="/call-slots" element={<CallSlotManage />} />
        <Route path="/call-calendar/:channelId" element={<CallCalendar />} />
        <Route path="/my-reservations" element={<MyReservations />} />
        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        <Route path="/mini-school" element={<MiniSchool />} />
        <Route path="/school-tickets" element={<SchoolTickets />} />
        <Route path="/enterprise" element={<EnterpriseDashboard />} />
        <Route path="/mux-videos" element={<MuxVideoPage />} />
        <Route path="/admin/video-moderation" element={<VideoModeration />} />
        <Route path="/fanclub" element={<FanClub />} />
        <Route path="/fanclub/:channelId" element={<FanClub />} />
        <Route path="/admin/ng-word-analytics" element={<NgWordAnalytics />} />
        <Route path="/revenue-dashboard" element={<CreatorRevenueDashboard />} />
        <Route path="/withdrawal-request" element={<WithdrawalRequest />} />
        <Route path="/info" element={<LandingPage />} />
        <Route path="/creator-schedule" element={<CreatorSchedule />} />
        <Route path="/channel-schedule/:channelId" element={<ChannelSchedule />} />
        <Route path="/obs-guide" element={<ObsGuide />} />
        <Route path="/equipment" element={<EquipmentStore />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/ticket-shop/:channelId" element={<TicketShop />} />
        <Route path="/ticket-verify" element={<TicketVerify />} />
        <Route path="/millionaire-challenge" element={<MillionaireChallenge />} />
        <Route path="/admin/video-engine-comparison" element={<VideoEngineComparison />} />
        <Route path="/infra-slide" element={<InfraSlide />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/privacy/en" element={<PrivacyEn />} />
        <Route path="/privacy/ko" element={<PrivacyKo />} />
        <Route path="/recruit" element={<Recruit />} />
        <Route path="/community" element={<Community />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/influencer-campaign" element={<InfluencerCampaign />} />
        <Route path="/legal" element={<LegalCommercial />} />
        <Route path="/legal/tokushoho" element={<LegalCommercial />} />
        <Route path="/company" element={<CompanyInfo />} />
        <Route path="/test-payment" element={<TestPayment />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster theme="dark" position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App