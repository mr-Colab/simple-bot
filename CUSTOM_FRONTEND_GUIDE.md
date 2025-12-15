# Custom Frontend Integration Guide

This guide shows you how to create your own custom frontend that uses the WhatsApp Bot Multi-User API to connect new numbers.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Standalone HTML Page](#standalone-html-page)
3. [React Integration](#react-integration)
4. [Vue.js Integration](#vuejs-integration)
5. [Next.js Integration](#nextjs-integration)
6. [Mobile App Integration](#mobile-app-integration)
7. [API Reference](#api-reference)

---

## Quick Start

The simplest way to get started is to use the provided `frontend-example.html` file:

1. Open `frontend-example.html` in your browser
2. Enter your API server URL (e.g., `http://your-server-ip:8000`)
3. Enter your API key (if configured)
4. Enter a phone number and click "Connect WhatsApp Bot"
5. Use the pairing code displayed to link your WhatsApp

**That's it!** You can host this HTML file anywhere - on your own server, GitHub Pages, Netlify, or even open it locally.

---

## Standalone HTML Page

### Minimal Example

Here's the bare minimum code to connect a new number:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Connect WhatsApp Bot</title>
</head>
<body>
  <h1>Connect WhatsApp Bot</h1>
  
  <form id="connectForm">
    <input type="text" id="phoneNumber" placeholder="Phone Number" required>
    <button type="submit">Connect</button>
  </form>
  
  <div id="result"></div>

  <script>
    const API_URL = 'http://localhost:8000'; // Change to your server
    const API_KEY = 'your-api-key'; // Optional

    document.getElementById('connectForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const phoneNumber = document.getElementById('phoneNumber').value;
      const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');
      
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (API_KEY) headers['X-API-Key'] = API_KEY;
        
        const response = await fetch(`${API_URL}/api/sessions`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ userId, phoneNumber })
        });
        
        const data = await response.json();
        
        if (data.success && data.pairingCode) {
          document.getElementById('result').innerHTML = 
            `<h2>Pairing Code: ${data.pairingCode}</h2>
             <p>Enter this code in WhatsApp → Linked Devices</p>`;
        } else {
          document.getElementById('result').innerHTML = 
            `<p style="color: red;">Error: ${data.message}</p>`;
        }
      } catch (error) {
        document.getElementById('result').innerHTML = 
          `<p style="color: red;">Error: ${error.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

### Advanced Features

For a fully-featured version with styling, error handling, and configuration, use `frontend-example.html` included in this repository.

---

## React Integration

### Installation

```bash
npm install axios
```

### Component

```jsx
import { useState } from 'react';
import axios from 'axios';

function ConnectWhatsApp() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:8000'; // Change to your server
  const API_KEY = 'your-api-key'; // Optional

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPairingCode('');

    try {
      const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');
      const headers = { 'Content-Type': 'application/json' };
      if (API_KEY) headers['X-API-Key'] = API_KEY;

      const response = await axios.post(
        `${API_URL}/api/sessions`,
        { userId, phoneNumber },
        { headers }
      );

      if (response.data.success && response.data.pairingCode) {
        setPairingCode(response.data.pairingCode);
        setPhoneNumber('');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Connect WhatsApp Bot</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Phone Number (with country code)"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Connect Bot'}
        </button>
      </form>

      {pairingCode && (
        <div>
          <h2>Pairing Code: {pairingCode}</h2>
          <p>Enter this code in WhatsApp → Linked Devices</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}

export default ConnectWhatsApp;
```

For a complete React component with styling, see `REACT_FRONTEND_EXAMPLE.md`.

---

## Vue.js Integration

```vue
<template>
  <div class="connect-whatsapp">
    <h1>Connect WhatsApp Bot</h1>
    
    <form @submit.prevent="handleSubmit">
      <input
        v-model="phoneNumber"
        type="tel"
        placeholder="Phone Number (with country code)"
        required
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Connecting...' : 'Connect Bot' }}
      </button>
    </form>

    <div v-if="pairingCode" class="pairing-code">
      <h2>Pairing Code: {{ pairingCode }}</h2>
      <p>Enter this code in WhatsApp → Linked Devices</p>
    </div>

    <p v-if="error" class="error">Error: {{ error }}</p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ConnectWhatsApp',
  data() {
    return {
      phoneNumber: '',
      pairingCode: '',
      error: '',
      loading: false,
      API_URL: 'http://localhost:8000', // Change to your server
      API_KEY: 'your-api-key' // Optional
    };
  },
  methods: {
    async handleSubmit() {
      this.loading = true;
      this.error = '';
      this.pairingCode = '';

      try {
        const userId = 'bot_' + this.phoneNumber.replace(/[^0-9]/g, '');
        const headers = { 'Content-Type': 'application/json' };
        if (this.API_KEY) headers['X-API-Key'] = this.API_KEY;

        const response = await axios.post(
          `${this.API_URL}/api/sessions`,
          { userId, phoneNumber: this.phoneNumber },
          { headers }
        );

        if (response.data.success && response.data.pairingCode) {
          this.pairingCode = response.data.pairingCode;
          this.phoneNumber = '';
        }
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.error {
  color: red;
}
.pairing-code {
  margin-top: 20px;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}
</style>
```

---

## Next.js Integration

### API Route (Optional - for server-side proxy)

Create `pages/api/connect-whatsapp.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;
  const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');

  const API_URL = process.env.WHATSAPP_API_URL;
  const API_KEY = process.env.WHATSAPP_API_KEY;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;

    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId, phoneNumber })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Page Component

Create `pages/connect.js`:

```javascript
import { useState } from 'react';

export default function ConnectPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPairingCode('');

    try {
      const response = await fetch('/api/connect-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (data.success && data.pairingCode) {
        setPairingCode(data.pairingCode);
        setPhoneNumber('');
      } else {
        setError(data.message || 'Connection failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Connect WhatsApp Bot</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Phone Number"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Connect Bot'}
        </button>
      </form>

      {pairingCode && (
        <div>
          <h2>Pairing Code: {pairingCode}</h2>
          <p>Enter this code in WhatsApp → Linked Devices</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

Add to `.env.local`:
```
WHATSAPP_API_URL=http://your-server:8000
WHATSAPP_API_KEY=your-api-key
```

---

## Mobile App Integration

### React Native

```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import axios from 'axios';

const ConnectWhatsApp = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://your-server:8000';
  const API_KEY = 'your-api-key'; // Optional

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    setPairingCode('');

    try {
      const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');
      const headers = { 'Content-Type': 'application/json' };
      if (API_KEY) headers['X-API-Key'] = API_KEY;

      const response = await axios.post(
        `${API_URL}/api/sessions`,
        { userId, phoneNumber },
        { headers }
      );

      if (response.data.success && response.data.pairingCode) {
        setPairingCode(response.data.pairingCode);
        setPhoneNumber('');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect WhatsApp Bot</Text>
      
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Phone Number"
        keyboardType="phone-pad"
      />
      
      <Button
        title={loading ? 'Connecting...' : 'Connect Bot'}
        onPress={handleConnect}
        disabled={loading}
      />

      {pairingCode && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeTitle}>Pairing Code:</Text>
          <Text style={styles.code}>{pairingCode}</Text>
          <Text>Enter this code in WhatsApp → Linked Devices</Text>
        </View>
      )}

      {error && <Text style={styles.error}>Error: {error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  codeContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  codeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 5,
    marginVertical: 10,
  },
  error: {
    color: 'red',
    marginTop: 20,
  },
});

export default ConnectWhatsApp;
```

### Flutter

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ConnectWhatsApp extends StatefulWidget {
  @override
  _ConnectWhatsAppState createState() => _ConnectWhatsAppState();
}

class _ConnectWhatsAppState extends State<ConnectWhatsApp> {
  final _phoneController = TextEditingController();
  String _pairingCode = '';
  String _error = '';
  bool _loading = false;

  final String API_URL = 'http://your-server:8000';
  final String API_KEY = 'your-api-key'; // Optional

  Future<void> _handleConnect() async {
    setState(() {
      _loading = true;
      _error = '';
      _pairingCode = '';
    });

    try {
      final phoneNumber = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
      final userId = 'bot_$phoneNumber';

      final headers = {'Content-Type': 'application/json'};
      if (API_KEY.isNotEmpty) headers['X-API-Key'] = API_KEY;

      final response = await http.post(
        Uri.parse('$API_URL/api/sessions'),
        headers: headers,
        body: json.encode({
          'userId': userId,
          'phoneNumber': phoneNumber,
        }),
      );

      final data = json.decode(response.body);

      if (data['success'] && data['pairingCode'] != null) {
        setState(() {
          _pairingCode = data['pairingCode'];
          _phoneController.clear();
        });
      } else {
        setState(() {
          _error = data['message'] ?? 'Connection failed';
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Connect WhatsApp Bot')),
      body: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _loading ? null : _handleConnect,
              child: Text(_loading ? 'Connecting...' : 'Connect Bot'),
            ),
            if (_pairingCode.isNotEmpty) ...[
              SizedBox(height: 30),
              Container(
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Text('Pairing Code:', style: TextStyle(fontSize: 18)),
                    SizedBox(height: 10),
                    Text(
                      _pairingCode,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 5,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text('Enter this code in WhatsApp → Linked Devices'),
                  ],
                ),
              ),
            ],
            if (_error.isNotEmpty)
              Padding(
                padding: EdgeInsets.only(top: 20),
                child: Text(
                  'Error: $_error',
                  style: TextStyle(color: Colors.red),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

---

## API Reference

### Create New Session

**Endpoint:** `POST /api/sessions`

**Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key (optional)
```

**Request Body:**
```json
{
  "userId": "bot_1234567890",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created. Use the pairing code to connect.",
  "pairingCode": "ABCD-1234",
  "userId": "bot_1234567890"
}
```

For complete API documentation, see `API_GUIDE.md`.

---

## Deployment Options

### 1. Static Hosting (HTML only)

Host `frontend-example.html` on:
- GitHub Pages
- Netlify
- Vercel
- Any web server

### 2. React/Vue/Next.js

Deploy to:
- Vercel
- Netlify
- AWS Amplify
- Your own server

### 3. Mobile Apps

Publish to:
- Google Play Store (React Native/Flutter)
- Apple App Store (React Native/Flutter)

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Keep API keys secure** - don't hardcode them in frontend
3. **Validate user input** before sending to API
4. **Implement rate limiting** on your backend
5. **Use environment variables** for configuration

---

## Support

For more information:
- See `API_GUIDE.md` for complete API documentation
- See `REACT_FRONTEND_EXAMPLE.md` for detailed React example
- Check `README.md` for general information

---

## Examples Summary

- **`frontend-example.html`** - Ready-to-use standalone HTML page
- **`REACT_FRONTEND_EXAMPLE.md`** - Complete React component with styling
- This guide - Integration examples for all major frameworks

Choose the one that best fits your needs!
