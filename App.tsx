import React, { Component, ReactNode, useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { useApp } from './context/AppContext';
import { DashboardView } from './views/Dashboard';
import { AuthView } from './views/AuthView';
import { AuthActionPage } from './views/AuthActionPage';
import { LandingPage } from './views/LandingPage';
import { HistoryView, AnalyticsView, PlannerView, SettingsView, AccountsView, GoalsView, DebtsView, AIAssistantView } from './views/Modules';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/UIComponents';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.props = props;
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public render() {
    if (this.state.hasError) return <div className="p-10 text-center text-red-500 font-mono bg-dark-bg min-h-screen flex items-center justify-center">CRITICAL SYSTEM FAILURE. REFRESH REQUIRED.</div>;
    return this.props.children;
  }
}

const ViewRouter: React.FC = () => {
  const { currentView } = useApp();

  switch (currentView) {
    case 'dashboard': return <DashboardView />;
    case 'history': return <HistoryView />;
    case 'analytics': return <AnalyticsView />;
    case 'planner': return <PlannerView />;
    case 'accounts': return <AccountsView />;
    case 'debts': return <DebtsView />;
    case 'goals': return <GoalsView />;
    case 'settings': return <SettingsView />;
    case 'ai-assistant': return <AIAssistantView />;
    default: return <DashboardView />;
  }
};

/* ── Simple path-based routing (no library needed) ── */
const useRoute = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
};

const App: React.FC = () => {
  const { user, isLoading, toasts, removeToast } = useApp();
  const { path, navigate } = useRoute();

  // If user is authenticated, always show the app regardless of URL
  // If user lands on /login but is logged in, redirect to /
  useEffect(() => {
    if (user && path === '/login') {
      navigate('/');
    }
  }, [user, path, navigate]);

  // 1. Initial Loading State (Waiting for Firebase)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center transition-colors duration-500">
         <div className="flex flex-col items-center gap-6 z-10 animate-in fade-in duration-700">
             <div className="relative">
               <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center blur-md absolute inset-0 animate-pulse" />
               <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center relative backdrop-blur-sm">
                  <div className="w-8 h-8 bg-brand-500 rounded-md rotate-45 shadow-[0_0_15px_rgba(124,92,255,0.8)] animate-[spin_3s_linear_infinite]" />
               </div>
             </div>
             <div className="flex items-center gap-2 text-brand-600 dark:text-brand-500 font-mono text-xs tracking-[0.2em] uppercase font-bold">
               <Loader2 className="w-4 h-4 animate-spin" />
               Initializing Protocol
             </div>
         </div>

         {/* Background Glow */}
         <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[100px]" />
         </div>
      </div>
    );
  }

  // Auth action page (password reset, email verify) — always accessible
  if (path === '/auth/action') {
    return (
      <ErrorBoundary>
        <AuthActionPage />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
       {/* 2. Auth Gate */}
       {!user ? (
         path === '/login' ? (
           <>
             <AuthView />
             <ToastContainer toasts={toasts} removeToast={removeToast} />
           </>
         ) : (
           <LandingPage onGoToApp={() => navigate('/login')} />
         )
       ) : (
         /* 3. Authenticated: Show AppShell */
         <Layout>
           <ViewRouter />
         </Layout>
       )}
    </ErrorBoundary>
  );
};

export default App;
