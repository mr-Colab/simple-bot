# React Frontend Example for WhatsApp Bot API

This is a React component example that demonstrates how to integrate the WhatsApp Bot API into your React application.

## Installation

```bash
npm install axios
```

## Component Code

### ConnectWhatsApp.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConnectWhatsApp.css'; // CSS file included below

const ConnectWhatsApp = () => {
  // State management
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [showPairing, setShowPairing] = useState(false);

  // Load saved configuration from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('whatsapp_api_url');
    const savedKey = localStorage.getItem('whatsapp_api_key');
    
    if (savedUrl) setApiUrl(savedUrl);
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Save configuration to localStorage
  const saveConfig = () => {
    localStorage.setItem('whatsapp_api_url', apiUrl);
    localStorage.setItem('whatsapp_api_key', apiKey);
  };

  // Show alert message
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        setAlert({ message: '', type: '' });
      }, 5000);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Save configuration
    saveConfig();
    
    if (!apiUrl) {
      showAlert('Please enter API Server URL', 'error');
      return;
    }

    if (!phoneNumber) {
      showAlert('Please enter phone number', 'error');
      return;
    }

    setLoading(true);
    setPairingCode('');
    setShowPairing(false);

    try {
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add API key if provided
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      // Generate userId from phone number
      const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');

      // Make API request
      const response = await axios.post(
        `${apiUrl}/api/sessions`,
        {
          userId: userId,
          phoneNumber: phoneNumber
        },
        { headers }
      );

      if (response.data.success) {
        if (response.data.pairingCode) {
          setPairingCode(response.data.pairingCode);
          setShowPairing(true);
          showAlert('✅ ' + response.data.message, 'success');
          setPhoneNumber(''); // Clear phone number
        } else {
          showAlert('✅ ' + response.data.message, 'success');
        }
      } else {
        showAlert('❌ ' + (response.data.message || 'Failed to connect'), 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      showAlert('❌ Connection error: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="whatsapp-connect-container">
      <div className="whatsapp-connect-card">
        <div className="logo">
          <h1>🤖 WhatsApp Bot</h1>
          <p>Connect Your Number</p>
        </div>

        {/* Configuration Section */}
        <div className="config-section">
          <h3>⚙️ API Configuration</h3>
          <div className="form-group">
            <label>API Server URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              onBlur={saveConfig}
              placeholder="http://your-server-ip:8000"
            />
            <div className="hint">Enter your API server URL</div>
          </div>
          <div className="form-group">
            <label>API Key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={saveConfig}
              placeholder="Leave empty if not required"
            />
            <div className="hint">Enter your API key if configured on server</div>
          </div>
        </div>

        {/* Alert Box */}
        {alert.message && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        {/* Pairing Code Display */}
        {showPairing && pairingCode && (
          <div className="pairing-box">
            <div className="pairing-code-box">
              <h3>Your Pairing Code</h3>
              <div className="pairing-code">{pairingCode}</div>
            </div>
            
            <div className="instructions">
              <h4>📱 How to connect:</h4>
              <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings → Linked Devices</strong></li>
                <li>Tap <strong>"Link a Device"</strong></li>
                <li>Enter the pairing code shown above</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connection Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>📞 Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="1234567890"
              pattern="[0-9]+"
              required
            />
            <div className="hint">
              Enter with country code, no spaces or special characters (e.g., 1234567890)
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? (
              <>
                <span className="loader"></span> Connecting...
              </>
            ) : (
              'Connect WhatsApp Bot'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectWhatsApp;
```

### ConnectWhatsApp.css

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.whatsapp-connect-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.whatsapp-connect-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  padding: 40px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo h1 {
  color: #667eea;
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 5px;
}

.logo p {
  color: #6b7280;
  font-size: 0.95em;
}

.config-section {
  background: #f9fafb;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 25px;
  border: 1px solid #e5e7eb;
}

.config-section h3 {
  color: #374151;
  font-size: 1em;
  margin-bottom: 15px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
  font-size: 0.95em;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 16px;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  background: #f9fafb;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.hint {
  margin-top: 6px;
  font-size: 0.85em;
  color: #6b7280;
}

.btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 0.95em;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

.alert-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.pairing-box {
  margin-bottom: 25px;
}

.pairing-code-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.pairing-code-box h3 {
  font-size: 1em;
  margin-bottom: 15px;
  opacity: 0.9;
  font-weight: 500;
}

.pairing-code {
  font-size: 3em;
  font-weight: 700;
  letter-spacing: 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.instructions {
  background: #f9fafb;
  border-left: 4px solid #667eea;
  padding: 16px;
  border-radius: 8px;
  font-size: 0.9em;
  color: #374151;
}

.instructions h4 {
  color: #667eea;
  margin-bottom: 10px;
  font-size: 1em;
}

.instructions ol {
  margin-left: 20px;
  line-height: 1.8;
}

.loader {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Usage in Your React App

```jsx
import React from 'react';
import ConnectWhatsApp from './components/ConnectWhatsApp';

function App() {
  return (
    <div className="App">
      <ConnectWhatsApp />
    </div>
  );
}

export default App;
```

## Features

- ✅ Clean, modern UI with smooth animations
- ✅ Configuration saved to localStorage
- ✅ Support for optional API key authentication
- ✅ Real-time pairing code display
- ✅ Clear instructions for WhatsApp connection
- ✅ Error handling with user-friendly messages
- ✅ Loading states during API calls
- ✅ Form validation
- ✅ Responsive design

## Customization

You can easily customize:

1. **Colors**: Change the gradient colors in the CSS
2. **API URL default**: Modify the initial `apiUrl` state
3. **Branding**: Update the logo text and styling
4. **Layout**: Adjust padding, margins, and container widths

## Integration with Backend

This component works with the Multi-User API endpoints:
- `POST /api/sessions` - Creates a new bot session and returns pairing code
- Requires `userId` and `phoneNumber` in the request body
- Optional `X-API-Key` header for authentication

See `API_GUIDE.md` for complete API documentation.
