import { useState, useEffect } from 'react';
import './App.css';

interface LogEntry {
  timestamp: string;
  message: string;
}

function App() {
  const [selectedFormat, setSelectedFormat] = useState<string>('markdown');
  const [debugLog, setDebugLog] = useState<LogEntry[]>([]);
  const [currentSite, setCurrentSite] = useState<string>('unknown');

  const log = (message: string) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      message
    };
    setDebugLog(prev => [...prev, logEntry]);
  };

  const getCurrentSite = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const url = new URL(tabs[0].url!);
        const siteMap: Record<string, string> = {
          'chatgpt.com': 'chatgpt',
          'claude.ai': 'claude',
          'poe.com': 'poe'
        };
        const detectedSite = siteMap[url.hostname] || 'unknown';
        setCurrentSite(detectedSite);
        log(`Current detected site: ${detectedSite}`);
      } else {
        log('No active tab found');
      }
    } catch (error) {
      log(`Error detecting site: ${error}`);
    }
  };

  const extractConversation = async () => {
    setDebugLog([]);
    log('Starting conversation extraction...');
    log(`Selected format: ${selectedFormat}`);

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        log(`Current URL: ${tabs[0].url}`);
        
        const response = await browser.tabs.sendMessage(tabs[0].id!, {
          action: "extract",
          format: selectedFormat
        });

        if (response?.logs) {
          response.logs.forEach((logMessage: string) => log(logMessage));
        }

        if (response?.error) {
          log(`Extraction failed: ${response.error}`);
        } else if (response) {
          log(`Extraction completed. ${response.messageCount} messages found.`);
          log(`Platform detected: ${response.platform}`);
          log(`Format used: ${selectedFormat}`);
          log(response.downloadInitiated ? 'File download initiated.' : 'File download failed to start.');
        } else {
          log('Extraction failed: No response from content script');
        }
      }
    } catch (error: any) {
      log(`Error: ${error.message}`);
      if (error.message.includes("Cannot access contents of url") ||
          error.message.includes("Could not establish connection")) {
        log("Make sure you're on a chatgpt.com, claude.ai, or poe.com page and refresh if necessary.");
      }
    }
  };

  const copyDebugLog = async () => {
    const logText = debugLog.map(entry => `${entry.timestamp}: ${entry.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      log('Debug log copied to clipboard.');
    } catch (error) {
      log(`Failed to copy debug log: ${error}`);
    }
  };

  useEffect(() => {
    getCurrentSite();
  }, []);

  return (
    <div className="popup-container">
      <h1>AI Chat Downloader</h1>
      
      <div className="format-selection" role="group" aria-label="Select export format">
        {['markdown', 'html', 'plaintext'].map((format) => (
          <div key={format} className="format-option">
            <input
              type="radio"
              id={format}
              name="format"
              value={format}
              checked={selectedFormat === format}
              onChange={(e) => setSelectedFormat(e.target.value)}
            />
            <label htmlFor={format}>
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </label>
          </div>
        ))}
      </div>
      
      <button 
        onClick={extractConversation}
        className="main-btn extract-btn"
      >
        Extract Conversation
      </button>
      
      <button 
        onClick={copyDebugLog}
        className="main-btn copy-btn"
      >
        Copy Debug Log
      </button>
      
      <div className="debug-log" aria-live="polite">
        {debugLog.map((entry, index) => (
          <div key={index} className="log-entry">
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
