import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import React, { Component, useState, useEffect, createContext, useContext, useRef } from "react";

// Context for YouTube API Key
const YTApiKeyContext = createContext<{ apiKey: string; setApiKey: (key: string) => void }>({ apiKey: "", setApiKey: () => {} });

export function useYTApiKey() {
  return useContext(YTApiKeyContext);
}

function YTApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    try {
    const stored = localStorage.getItem("yt_api_key");
      if (stored && typeof stored === 'string' && stored.trim()) {
        setApiKeyState(stored);
      }
    } catch (error) {
      console.error('Error reading API key from localStorage:', error);
      // If localStorage is not available, continue without it
    }
  }, []);
  
  const setApiKey = (key: string) => {
    try {
      if (typeof key === 'string' && key.trim()) {
    setApiKeyState(key);
    localStorage.setItem("yt_api_key", key);
    setShowModal(false);
      } else {
        throw new Error('Invalid API key format');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      // Still update state even if localStorage fails
      setApiKeyState(key);
      setShowModal(false);
    }
  };
  
  const handleReenter = () => {
    setShowModal(true);
  };
  return (
    <YTApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      <UserProfile apiKey={apiKey} onChangeApiKey={handleReenter} />
      {(!apiKey || showModal) ? <ApiKeyModal setApiKey={setApiKey} onClose={() => setShowModal(false)} canClose={!!apiKey} /> : <div key={apiKey}>{children}</div>}
    </YTApiKeyContext.Provider>
  );
}

function UserProfile({ apiKey, onChangeApiKey }: { apiKey: string, onChangeApiKey: () => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Logout handler
  const handleLogout = () => {
    try {
      localStorage.removeItem("yt_api_key");
      sessionStorage.clear();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    window.location.reload();
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setOpen(false);
    } catch (error) {
      console.error('Failed to copy API key:', error);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = apiKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setOpen(false);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[10001]">
      <button
        className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gray-800/90 hover:bg-gray-700 backdrop-blur-sm rounded-full shadow-lg border border-gray-600/50 transition-all duration-200 touch-target"
        onClick={() => setOpen(v => !v)}
        aria-label="User Profile"
      >
        <span className="text-2xl sm:text-3xl" role="img" aria-label="user">👤</span>
        {/* API key status indicator */}
        <span
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
            apiKey ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={apiKey ? 'API Key Connected' : 'API Key Not Set'}
        />
      </button>

      {open && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1] md:hidden" onClick={() => setOpen(false)} />
          
          <div
            ref={dropdownRef}
            className="absolute top-16 right-0 w-80 max-w-[calc(100vw-2rem)] bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700/50 animate-in"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-300">API Status:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span className={`text-sm font-semibold ${apiKey ? 'text-green-400' : 'text-red-400'}`}>
                      {apiKey ? 'Connected' : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* API Key Display */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Current API Key:</div>
                <div className="font-mono text-sm text-gray-300 truncate">
                  {apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-8)}` : "Not set"}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              {apiKey && (
                <button
                  onClick={copyApiKey}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <span>📋</span>
                  Copy API Key
                </button>
              )}
              
              <button
                onClick={() => { setOpen(false); onChangeApiKey(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <span>🔑</span>
                Change API Key
              </button>
              
              <div className="border-t border-gray-700/50 pt-2 mt-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <span>🚪</span>
                  Logout & Clear Data
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ApiKeyModal({ setApiKey, onClose, canClose }: { setApiKey: (key: string) => void, onClose: () => void, canClose: boolean }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const testApiKeys = [
    "AIzaSyB5UKhMFBcaxkoQIc4yHqsUwfjWG294QT8",
    "AIzaSyAKmmSXOyaCn2fNKWAu0mXXLMRFm5ITH44"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input) {
      setApiKey(input);
      setInput("");
      setError(null);
    } else {
      setError("Please enter a valid YouTube API key.");
    }
  };

  const copyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(apiKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedKey(apiKey);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const useTestKey = (apiKey: string) => {
    setInput(apiKey);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-[10000] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-md mx-auto shadow-2xl border border-gray-700/50">
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800/50 transition-all"
            aria-label="Close"
          >
            ×
          </button>
        )}
        
        {/* Hero Section */}
        <div className="text-center p-6 pb-4">
          {/* Logo and Title */}
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-600 rounded-full w-12 h-12 flex items-center justify-center mr-3 shadow-lg">
              <span className="text-white text-2xl font-bold">▶</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">YouTube Rating Analyzer</h1>
              <p className="text-gray-400 text-sm">AI-powered video insights</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-3 text-left">
              <div className="text-blue-400 text-sm font-medium">🎯 Smart Analysis</div>
              <div className="text-gray-300 text-xs">Real comment insights</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-left">
              <div className="text-green-400 text-sm font-medium">🔒 Private</div>
              <div className="text-gray-300 text-xs">No data stored</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-left">
              <div className="text-purple-400 text-sm font-medium">⚡ Fast</div>
              <div className="text-gray-300 text-xs">Instant results</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-left">
              <div className="text-yellow-400 text-sm font-medium">📱 Mobile</div>
              <div className="text-gray-300 text-xs">Works anywhere</div>
            </div>
          </div>

          {/* Test API Keys */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-4 mb-6 border border-blue-500/20">
            <h3 className="text-white font-semibold mb-3 text-sm">🚀 Try these API keys for testing:</h3>
            <div className="space-y-2">
              {testApiKeys.map((apiKey, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                  <code className="flex-1 text-xs text-gray-300 font-mono truncate">
                    {apiKey}
                  </code>
                  <button
                    onClick={() => copyApiKey(apiKey)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      copiedKey === apiKey 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {copiedKey === apiKey ? '✓' : 'Copy'}
                  </button>
                  <button
                    onClick={() => useTestKey(apiKey)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-all"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Key Input Form */}
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2 text-sm">
                Enter YouTube API Key
              </label>
              <p className="text-gray-400 text-xs mb-3">
                Need your own key? <a href='https://youtu.be/fXPuQY1LKbY?feature=shared' target='_blank' rel='noopener noreferrer' className='text-blue-400 hover:text-blue-300 underline'>Get one here</a>
              </p>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Paste your YouTube API key here"
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <div className="text-red-400 text-sm">{error}</div>
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-[1.02] focus:ring-2 focus:ring-red-500/20"
            >
              Start Analyzing Videos
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Global Error Boundary
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: any, errorInfo: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
    
    // Update state with error info for better debugging
    this.setState({ errorInfo });
    
    // You could also send error to an analytics service here
    // Example: analytics.track('error_boundary', { error: error.message, stack: error.stack });
  }
  
  handleReload = () => {
    window.location.reload();
  };
  
  handleGoHome = () => {
    window.location.href = '/';
  };
  
  handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };
  
  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.message?.includes('Failed to fetch');
      
      const isApiError = this.state.error?.message?.includes('API') ||
                        this.state.error?.message?.includes('quota') ||
                        this.state.error?.message?.includes('key');
      
      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181818 0%, #232323 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#181818', padding: 36, borderRadius: 16, minWidth: 340, maxWidth: 480, boxShadow: '0 8px 32px 0 #0008', border: '1.5px solid #303030', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 38, fontWeight: 900, color: '#FF0000', marginRight: 8, letterSpacing: '-2px' }}>▶</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px', fontFamily: 'Roboto, Arial, sans-serif' }}>YouTube Rating Analyzer</span>
            </div>
            
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Something went wrong</div>
            
            <div style={{ color: '#ccc', fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>
              {isNetworkError ? (
                'Network connection issue detected. Please check your internet connection and try again.'
              ) : isApiError ? (
                'YouTube API issue detected. Please check your API key or try again later.'
              ) : (
                this.state.error?.message || 'An unexpected error occurred. Please try reloading the page.'
              )}
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <button 
                onClick={this.handleReload} 
                style={{ 
                  background: '#FF0000', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: 16, 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 32px', 
                  cursor: 'pointer',
                  minWidth: 140
                }}
              >
                Reload Page
              </button>
              
              <button 
                onClick={this.handleGoHome} 
                style={{ 
                  background: '#333', 
                  color: '#fff', 
                  fontWeight: 600, 
                  fontSize: 14, 
                  border: 'none', 
                  borderRadius: 6, 
                  padding: '8px 24px', 
                  cursor: 'pointer',
                  minWidth: 140
                }}
              >
                Go to Homepage
              </button>
              
              <button 
                onClick={this.handleClearStorage} 
                style={{ 
                  background: 'transparent', 
                  color: '#888', 
                  fontWeight: 500, 
                  fontSize: 12, 
                  border: '1px solid #444', 
                  borderRadius: 4, 
                  padding: '6px 16px', 
                  cursor: 'pointer',
                  minWidth: 140
                }}
              >
                Clear Data & Reload
              </button>
            </div>
            
            {/* Development info */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary style={{ color: '#888', cursor: 'pointer', fontSize: 12 }}>Debug Info (Development)</summary>
                <pre style={{ 
                  color: '#ccc', 
                  fontSize: 10, 
                  background: '#1a1a1a', 
                  padding: 8, 
                  borderRadius: 4, 
                  marginTop: 8,
                  overflow: 'auto',
                  maxHeight: 200
                }}>
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
    <YTApiKeyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </YTApiKeyProvider>
    </ErrorBoundary>
  );
}

export default App;
