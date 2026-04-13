import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[400px] flex items-center justify-center p-6 relative z-50">
          <div className="bg-[#0A0A0A]/90 backdrop-blur-2xl border border-rose-500/20 p-10 rounded-[2rem] max-w-lg w-full text-center shadow-[0_0_100px_rgba(244,63,94,0.15)] glow-rose relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/5 blur-[50px] pointer-events-none group-hover:bg-rose-500/10 transition-all duration-1000" />
            
            <div className="w-20 h-20 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
              <AlertTriangle size={36} className="text-rose-500" />
            </div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Component Failure</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-8">
              {this.state.error?.message || "An unexpected rendering exception occurred"}
            </p>
            
            <button 
              onClick={this.resetBoundary}
              className="btn-command w-full h-14 bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 text-white flex items-center justify-center gap-3 transition-colors"
            >
              <RefreshCcw size={16} /> Recover State
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
