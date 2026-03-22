import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 glass">
          <div className="glass-card p-8 max-w-md text-center border border-red-500/30">
            <h2 className="text-2xl font-bold text-red-400 mb-4 tracking-tight">Something went wrong.</h2>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">
              We encountered an unexpected rendering error. Please try refreshing the application to restore functionality.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-xs text-red-400 mt-2 mb-6 bg-red-500/5 border border-red-500/15 p-3 rounded-xl overflow-auto max-h-40 text-left whitespace-pre-wrap break-all">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
              </pre>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500/20 text-red-400 font-semibold border border-red-500/50 px-6 py-3 rounded-xl hover:bg-red-500/30 hover:scale-[1.02] transition-all"
              >
                Reload Application
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard' }}
                className="bg-slate-700/50 text-slate-300 font-semibold border border-slate-600/50 px-6 py-3 rounded-xl hover:bg-slate-700 hover:scale-[1.02] transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
