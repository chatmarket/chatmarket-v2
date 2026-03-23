import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
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