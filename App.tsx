import React, { Component, ReactNode } from 'react';
import { Layout } from './components/Layout';
import { useApp } from './context/AppContext';
import { DashboardView } from './views/Dashboard';
import { AuthView } from './views/AuthView';
import { HistoryView, AnalyticsView, SettingsView, AccountsView, GoalsView, DebtsView } from './views/Modules';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/UIComponents'; // Import ToastContainer here too for AuthView

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
    case 'accounts': return <AccountsView />;
    case 'debts': return <DebtsView />;
    case 'goals': return <GoalsView />;
    case 'settings': return <SettingsView />;
    default: return <DashboardView />;
  }
};

const App: React.FC = () => {
  const { user, isLoading, toasts, removeToast } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center animate-pulse">
                <div className="w-6 h-6 bg-brand-500 rounded rotate-45" />
             </div>
             <div className="flex items-center gap-2 text-brand-500 font-mono text-xs tracking-widest uppercase">
               <Loader2 className="w-4 h-4 animate-spin" />
               Initializing System
             </div>
         </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
       {!user ? (
         <>
           <AuthView />
           <ToastContainer toasts={toasts} removeToast={removeToast} />
         </>
       ) : (
         <Layout>
           <ViewRouter />
         </Layout>
       )}
    </ErrorBoundary>
  );
};

export default App;