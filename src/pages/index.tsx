/**
 * Home page - AI Lead Discovery Interface with Tabs
 */

import { useState } from 'react';
import Head from 'next/head';

type Tab = 'natural' | 'news';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('natural');
  const [query, setQuery] = useState('');
  
  // Separate state for each tab
  const [naturalLoading, setNaturalLoading] = useState(false);
  const [naturalCompanies, setNaturalCompanies] = useState<string[]>([]);
  const [naturalError, setNaturalError] = useState('');
  
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsCompanies, setNewsCompanies] = useState<string[]>([]);
  const [newsError, setNewsError] = useState('');

  const handleNaturalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setNaturalLoading(true);
    setNaturalError('');
    setNaturalCompanies([]);

    try {
      const response = await fetch('/api/discover-natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Failed to discover companies');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.company) {
              setNaturalCompanies(prev => [...prev, data.company]);
            } else if (data.error) {
              setNaturalError(data.error);
            } else if (data.done) {
              setNaturalLoading(false);
            }
          }
        }
      }
    } catch (err: any) {
      setNaturalError(err.message);
      setNaturalLoading(false);
    }
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setNewsLoading(true);
    setNewsError('');
    setNewsCompanies([]);

    try {
      const response = await fetch('/api/discover-news', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to fetch news');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.company) {
              setNewsCompanies(prev => [...prev, data.company]);
            } else if (data.error) {
              setNewsError(data.error);
            } else if (data.done) {
              setNewsLoading(false);
            }
          }
        }
      }
    } catch (err: any) {
      setNewsError(err.message);
      setNewsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Dealops Scout - AI Lead Discovery</title>
      </Head>
      
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <main style={{ 
          maxWidth: '900px', 
          margin: '0 auto', 
          padding: '3rem 2rem',
          color: 'white'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '3rem', margin: '0 0 1rem' }}>
              🚀 Dealops Scout
            </h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
              AI-Powered Lead Discovery for SaaS Companies
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <button
              onClick={() => setActiveTab('natural')}
              style={{
                background: activeTab === 'natural' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'natural' ? '3px solid white' : 'none',
                marginBottom: '-2px',
                fontWeight: activeTab === 'natural' ? '600' : 'normal'
              }}
            >
              🤖 Natural Language
            </button>
            <button
              onClick={() => setActiveTab('news')}
              style={{
                background: activeTab === 'news' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'news' ? '3px solid white' : 'none',
                marginBottom: '-2px',
                fontWeight: activeTab === 'news' ? '600' : 'normal'
              }}
            >
              📰 News & Funding
            </button>
          </div>

          {/* Natural Language Tab */}
          {activeTab === 'natural' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ marginTop: 0 }}>Describe Your Ideal Prospects</h2>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>
                Use natural language to find companies. Examples:
              </p>
              <ul style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                <li>"Fintech companies in payments with complex pricing"</li>
                <li>"B2B SaaS tools for revenue operations teams"</li>
                <li>"Fast-growing data analytics platforms"</li>
              </ul>

              <form onSubmit={handleNaturalSubmit}>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g., Find me fintech companies in payments who are struggling with pricing complexity..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '1rem',
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    marginBottom: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  disabled={naturalLoading}
                />
                <button
                  type="submit"
                  disabled={naturalLoading || !query.trim()}
                  style={{
                    background: naturalLoading ? '#666' : '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    cursor: naturalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    width: '100%'
                  }}
                >
                  {naturalLoading ? '🔍 Discovering Companies...' : '🚀 Discover & Add to Airtable'}
                </button>
              </form>
            </div>
          )}

          {/* News & Funding Tab */}
          {activeTab === 'news' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ marginTop: 0 }}>📰 Recent Funding News</h2>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>
                Discover companies from RSS feeds (Crunchbase, TechCrunch, VentureBeat, etc.)
              </p>
              <ul style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                <li>Automatically fetches recent funding announcements</li>
                <li>Analyzes each company with AI</li>
                <li>Adds high-potential leads to Airtable</li>
              </ul>

              <form onSubmit={handleNewsSubmit}>
                <button
                  type="submit"
                  disabled={newsLoading}
                  style={{
                    background: newsLoading ? '#666' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    cursor: newsLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    width: '100%'
                  }}
                >
                  {newsLoading ? '📡 Fetching Latest News...' : '📡 Fetch & Process News'}
                </button>
              </form>
            </div>
          )}

          {/* Error Messages - Show based on active tab */}
          {activeTab === 'natural' && naturalError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              ❌ {naturalError}
            </div>
          )}
          
          {activeTab === 'news' && newsError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              ❌ {newsError}
            </div>
          )}

          {/* Results - Show based on active tab */}
          {activeTab === 'natural' && naturalCompanies.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem'
            }}>
              <h3 style={{ marginTop: 0 }}>
                ✅ Found {naturalCompanies.length} Companies
                {naturalLoading && ' (searching...)'}
              </h3>
              <div style={{
                display: 'grid',
                gap: '0.5rem',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {naturalCompanies.map((company, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      animation: 'slideIn 0.3s ease-out',
                      borderLeft: '3px solid #10b981'
                    }}
                  >
                    {company}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'news' && newsCompanies.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem'
            }}>
              <h3 style={{ marginTop: 0 }}>
                ✅ Processed {newsCompanies.length} Companies
                {newsLoading && ' (processing...)'}
              </h3>
              <div style={{
                display: 'grid',
                gap: '0.5rem',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {newsCompanies.map((company, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      animation: 'slideIn 0.3s ease-out',
                      borderLeft: '3px solid #3b82f6'
                    }}
                  >
                    {company}
                  </div>
                ))}
              </div>
            </div>
          )}

          <style jsx>{`
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(-20px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
        </main>
      </div>
    </>
  );
}
