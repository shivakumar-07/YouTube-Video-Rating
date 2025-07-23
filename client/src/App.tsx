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
      sessionStorage.clear(); // Also clear session storage
    } catch (error) {
      console.error('Error during logout:', error);
      // Continue with reload even if storage clearing fails
    }
    window.location.reload();
  };
  return (
    <div style={{ position: "fixed", top: 10, right: 10, zIndex: 10001 }}>
      <button
        className="bg-gray-200 hover:bg-gray-300 text-xs px-3 py-1 rounded shadow flex items-center justify-center"
        onClick={() => setOpen((v) => !v)}
        aria-label="User Profile"
        style={{ width: 48, height: 48 }} // 50% larger
      >
        <span role="img" aria-label="user" style={{ fontSize: 36 }}>👤</span>
        {/* API key status indicator */}
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: apiKey ? '#22c55e' : '#ef4444',
            marginLeft: 6,
            border: '2px solid #fff',
            boxShadow: '0 0 0 2px #8882',
          }}
          title={apiKey ? 'API Key Connected' : 'API Key Not Set'}
        />
      </button>
      {open && (
        <div ref={dropdownRef} className="bg-white border rounded shadow p-4 mt-2 min-w-[220px]">
          <div className="mb-2 text-xs text-gray-600 flex items-center gap-2">
            YouTube API Key:
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: apiKey ? '#22c55e' : '#ef4444',
                border: '1.5px solid #fff',
              }}
              title={apiKey ? 'API Key Connected' : 'API Key Not Set'}
            />
            <span className={apiKey ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {apiKey ? 'Connected' : 'Not Set'}
            </span>
          </div>
          <div className="mb-2 font-mono text-sm bg-gray-100 p-1 rounded select-all" style={{ color: '#222', background: '#f3f4f6' }}>
            {apiKey ? apiKey.slice(0, 4) + "****" + apiKey.slice(-4) : "Not set"}
          </div>
          <button
            className="text-xs text-blue-600 underline mb-2"
            onClick={async () => { 
              try {
                await navigator.clipboard.writeText(apiKey);
                setOpen(false);
              } catch (error) {
                console.error('Failed to copy API key:', error);
                // Fallback: try to copy using a temporary textarea
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
            }}
            disabled={!apiKey}
          >Copy API Key</button>
          <button
            className="block w-full bg-blue-600 text-white px-2 py-1 rounded text-xs mt-2"
            onClick={() => { setOpen(false); onChangeApiKey(); }}
          >Change API Key</button>
          <button
            className="block w-full bg-red-600 text-white px-2 py-1 rounded text-xs mt-4 hover:bg-red-700"
            onClick={handleLogout}
          >Logout</button>
        </div>
      )}
    </div>
  );
}

function ApiKeyModal({ setApiKey, onClose, canClose }: { setApiKey: (key: string) => void, onClose: () => void, canClose: boolean }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
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
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "linear-gradient(135deg, #181818 0%, #232323 100%)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#181818", padding: 36, borderRadius: 16, minWidth: 380, maxWidth: 440, position: "relative", boxShadow: "0 8px 32px 0 #0008", border: '1.5px solid #303030' }}>
          <button
            onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, fontSize: 28, background: "none", border: "none", cursor: "pointer", color: '#fff', fontWeight: 700, zIndex: 10 }}
            aria-label="Close"
          >
            ×
          </button>
        {/* YouTube-style Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#FF0000', marginRight: 8, letterSpacing: '-2px' }}>▶</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px', fontFamily: 'Roboto, Arial, sans-serif' }}>YouTube Rating Analyzer</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 10, color: '#fff' }}>Unbiased, AI-powered video quality ratings</div>
          <ul style={{ textAlign: 'left', margin: '0 auto 18px auto', maxWidth: 340, color: '#f1f1f1', fontSize: 15, lineHeight: 1.7, background: '#232323', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px #0002' }}>
            <li>• Analyze YouTube videos using real comments and engagement</li>
            <li>• Get trustworthy ratings, not just view counts</li>
            <li>• No account or history required—your privacy is protected</li>
            <li>• Works with your own YouTube Data API key</li>
          </ul>
          
          {/* Test API Keys Section */}
          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid #444' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Test the site with these API keys:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* First API Key */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: 6, padding: 8 }}>
                <code style={{ 
                  flex: 1, 
                  fontSize: 12, 
                  color: '#e5e5e5', 
                  fontFamily: 'monospace', 
                  wordBreak: 'break-all',
                  marginRight: 8
                }}>
                  AIzaSyB5UKhMFBcaxkoQIc4yHqsUwfjWG294QT8
                </code>
                <button
                  onClick={() => {
                    const apiKey = 'AIzaSyB5UKhMFBcaxkoQIc4yHqsUwfjWG294QT8';
                    navigator.clipboard.writeText(apiKey).then(() => {
                      // Optional: Add visual feedback here
                    }).catch(() => {
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = apiKey;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    });
                  }}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 50
                  }}
                  title="Copy API key"
                >
                  Copy
                </button>
              </div>
              
              {/* Second API Key */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: 6, padding: 8 }}>
                <code style={{ 
                  flex: 1, 
                  fontSize: 12, 
                  color: '#e5e5e5', 
                  fontFamily: 'monospace', 
                  wordBreak: 'break-all',
                  marginRight: 8
                }}>
                  AIzaSyAKmmSXOyaCn2fNKWAu0mXXLMRFm5ITH44
                </code>
                <button
                  onClick={() => {
                    const apiKey = 'AIzaSyAKmmSXOyaCn2fNKWAu0mXXLMRFm5ITH44';
                    navigator.clipboard.writeText(apiKey).then(() => {
                      // Optional: Add visual feedback here
                    }).catch(() => {
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = apiKey;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    });
                  }}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 50
                  }}
                  title="Copy API key"
                >
                  Copy
                </button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8, fontStyle: 'italic' }}>
              Copy any of these keys to test the application
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#fff' }}>Enter your YouTube API Key</h2>
          <p className="mb-4 text-sm" style={{ color: '#ccc' }}>You need a YouTube Data API v3 key to use this app. <a href='https://youtu.be/fXPuQY1LKbY?feature=shared' target='_blank' rel='noopener noreferrer' className='text-blue-400 underline'>Get one here</a>.</p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="border rounded px-2 py-1 w-full mb-4"
            style={{ color: '#111', background: '#fff', fontSize: 16 }}
            placeholder="Paste your YouTube API key here"
            autoFocus
          />
          {error && <div className="text-red-600 mb-2 text-sm font-semibold">{error}</div>}
          <button type="submit" className="w-full bg-red-600 text-white py-2 rounded font-bold text-lg hover:bg-red-700 transition">Continue</button>
        </form>
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
