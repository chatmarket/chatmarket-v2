import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';
import ErrorHandler from '@/components/ErrorHandler';

// Add page imports here
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import ChannelPage from '@/pages/ChannelPage';
import GoLive from '@/pages/GoLive';
import LiveView from '@/pages/LiveView';
import WatchVideo from '@/pages/WatchVideo';
import Upload from '@/pages/Upload';
import Settings from '@/pages/Settings';
import MyChannel from '@/pages/MyChannel';
import PlanSelect from '@/pages/PlanSelect';
import PlanConfirm from '@/pages/PlanConfirm';
import CreatorDashboard from '@/pages/CreatorDashboard';
import RevenueManagement from '@/pages/RevenueManagement';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminAnalytics from '@/pages/AdminAnalytics';
import VideoModeration from '@/pages/VideoModeration';
import DirectChat from '@/pages/DirectChat';
import FanClub from '@/pages/FanClub';
import Community from '@/pages/Community';
import Blog from '@/pages/Blog';
import BlogDetail from '@/pages/BlogDetail';
import BlogEdit from '@/pages/BlogEdit';
import Recruit from '@/pages/Recruit';
import VideoCallPage from '@/pages/VideoCallPage';
import VideoCallRequest from '@/pages/VideoCallRequest';
import CallHistory from '@/pages/CallHistory';
import CallWaitingRoom from '@/pages/CallWaitingRoom';
import CreatorChat from '@/pages/CreatorChat';
import WithdrawalRequest from '@/pages/WithdrawalRequest';
import MyReservations from '@/pages/MyReservations';
import CallCalendar from '@/pages/CallCalendar';
import ChannelSchedule from '@/pages/ChannelSchedule';
import CreatorSchedule from '@/pages/CreatorSchedule';
import EquipmentStore from '@/pages/EquipmentStore';
import Forum from '@/pages/Forum';
import CrowdfundingList from '@/pages/CrowdfundingList';
import CrowdfundingDetail from '@/pages/CrowdfundingDetail';
import CrowdfundingNew from '@/pages/CrowdfundingNew';
import DonorDashboard from '@/pages/DonorDashboard';
import NotificationCenter from '@/pages/NotificationCenter';
import LegalCommercial from '@/pages/LegalCommercial';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import PrivacyEn from '@/pages/PrivacyEn';
import PrivacyKo from '@/pages/PrivacyKo';
import CompanyInfo from '@/pages/CompanyInfo';
import MiniSchool from '@/pages/MiniSchool';
import SchoolTickets from '@/pages/SchoolTickets';
import TicketShop from '@/pages/TicketShop';
import TicketVerify from '@/pages/TicketVerify';
import MyTickets from '@/pages/MyTickets';
import MyLibrary from '@/pages/MyLibrary';
import ContentAnalytics from '@/pages/ContentAnalytics';
import CreatorRevenueDashboard from '@/pages/CreatorRevenueDashboard';
import VodManagement from '@/pages/VodManagement';
import MillionaireChallenge from '@/pages/MillionaireChallenge';
import InfluencerCampaign from '@/pages/InfluencerCampaign';
import NgWordAnalytics from '@/pages/NgWordAnalytics';
import EnterpriseDashboard from '@/pages/EnterpriseDashboard';
import MuxVideoPage from '@/pages/MuxVideoPage';
import InfraSlide from '@/pages/InfraSlide';
import PlanDetail from '@/pages/PlanDetail';
import TestPayment from '@/pages/TestPayment';
import VideoEngineComparison from '@/pages/VideoEngineComparison';
import LandingPage from '@/pages/LandingPage';
import VodAnalytics from '@/pages/VodAnalytics';
import ObsGuide from '@/pages/ObsGuide';
import CoinCharge from '@/pages/CoinCharge';
import AffiliateAnalytics from '@/pages/AffiliateAnalytics';

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/channel/:channelId" element={<ChannelPage />} />
            <Route path="/go-live" element={<GoLive />} />
            <Route path="/live/:streamId" element={<LiveView />} />
            <Route path="/watch/:videoId" element={<WatchVideo />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-channel" element={<MyChannel />} />
            <Route path="/plan-select" element={<PlanSelect />} />
            <Route path="/plan-confirm" element={<PlanConfirm />} />
            <Route path="/plan-detail/:planId" element={<PlanDetail />} />
            <Route path="/creator-dashboard" element={<CreatorDashboard />} />
            <Route path="/revenue" element={<RevenueManagement />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/video-moderation" element={<VideoModeration />} />
            <Route path="/admin/ng-word-analytics" element={<NgWordAnalytics />} />
            <Route path="/chat/:channelId" element={<DirectChat />} />
            <Route path="/fanclub/:channelId" element={<FanClub />} />
            <Route path="/fanclub" element={<FanClub />} />
            <Route path="/community" element={<Community />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:postId" element={<BlogDetail />} />
            <Route path="/blog/edit/:postId" element={<BlogEdit />} />
            <Route path="/recruit" element={<Recruit />} />
            <Route path="/video-call/:callId" element={<VideoCallPage />} />
            <Route path="/call-request/:channelId" element={<VideoCallRequest />} />
            <Route path="/call-history" element={<CallHistory />} />
            <Route path="/call-waiting" element={<CallWaitingRoom />} />
            <Route path="/creator-chat" element={<CreatorChat />} />
            <Route path="/withdrawal-request" element={<WithdrawalRequest />} />
            <Route path="/my-reservations" element={<MyReservations />} />
            <Route path="/call-calendar/:channelId" element={<CallCalendar />} />
            <Route path="/channel-schedule/:channelId" element={<ChannelSchedule />} />
            <Route path="/creator-schedule" element={<CreatorSchedule />} />
            <Route path="/equipment" element={<EquipmentStore />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/crowdfunding" element={<CrowdfundingList />} />
            <Route path="/crowdfunding/:projectId" element={<CrowdfundingDetail />} />
            <Route path="/crowdfunding/new" element={<CrowdfundingNew />} />
            <Route path="/donor-dashboard" element={<DonorDashboard />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/legal/commercial" element={<LegalCommercial />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy/en" element={<PrivacyEn />} />
            <Route path="/privacy/ko" element={<PrivacyKo />} />
            <Route path="/company" element={<CompanyInfo />} />
            <Route path="/school" element={<MiniSchool />} />
            <Route path="/school-tickets" element={<SchoolTickets />} />
            <Route path="/tickets" element={<TicketShop />} />
            <Route path="/verify-ticket" element={<TicketVerify />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/my-library" element={<MyLibrary />} />
            <Route path="/content-analytics" element={<ContentAnalytics />} />
            <Route path="/vod-management" element={<VodManagement />} />
            <Route path="/vod-analytics" element={<VodAnalytics />} />
            <Route path="/revenue-dashboard" element={<CreatorRevenueDashboard />} />
            <Route path="/millionaire" element={<MillionaireChallenge />} />
            <Route path="/influencer-campaign" element={<InfluencerCampaign />} />
            <Route path="/enterprise" element={<EnterpriseDashboard />} />
            <Route path="/mux-video/:videoId" element={<MuxVideoPage />} />
            <Route path="/infra" element={<InfraSlide />} />
            <Route path="/test-payment" element={<TestPayment />} />
            <Route path="/video-engine" element={<VideoEngineComparison />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/obs-guide" element={<ObsGuide />} />
            <Route path="/coin-charge" element={<CoinCharge />} />
            <Route path="/admin/affiliate" element={<AffiliateAnalytics />} />
            <Route path="/live-streams" element={<Navigate to="/" replace />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
        <ErrorHandler />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}