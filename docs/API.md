# Speed Labs API Integration Guide

## Overview

Speed Labs provides a public REST API for running speed tests programmatically. This guide covers authentication, endpoints, request/response formats, and code examples.

## Base URL

```
https://your-domain.com/api
```

For local development:
```
http://localhost:3000/api
```

---

## Authentication

Currently, the API is open and does not require authentication. Rate limiting may apply.

**Future Plans**: API keys will be available for higher rate limits and advanced features.

---

## Endpoints

### GET /api/speed

Run a speed test and get results.

#### Request

```bash
GET /api/speed
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `json` | Response format: `json` or `jsonp` |
| `callback` | string | - | JSONP callback function name (required if format=jsonp) |

#### Response

```json
{
  "success": true,
  "data": {
    "download": 125.45,
    "upload": 45.23,
    "ping": 15.67,
    "jitter": 2.34,
    "grade": "A",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "server": {
      "id": "auto",
      "name": "Auto (Best)",
      "location": "Nearest Server"
    },
    "units": {
      "download": "Mbps",
      "upload": "Mbps",
      "ping": "ms",
      "jitter": "ms"
    }
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "testDuration": "~5 seconds"
  }
}
```

---

### POST /api/speed

Run a speed test with custom configuration.

#### Request Body

```json
{
  "serverId": "us-east",
  "testType": "full"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `serverId` | string | `auto` | Server to test against. Options: `auto`, `us-east`, `us-west`, `eu-west`, `eu-central`, `asia-east`, `asia-south` |
| `testType` | string | `full` | Test type: `full` or `ping-only` |

#### Response (Full Test)

```json
{
  "success": true,
  "data": {
    "download": 125.45,
    "upload": 45.23,
    "ping": 15.67,
    "jitter": 2.34,
    "grade": "A",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "server": {
      "id": "us-east",
      "name": "Server us-east",
      "location": "US East"
    },
    "units": {
      "download": "Mbps",
      "upload": "Mbps",
      "ping": "ms",
      "jitter": "ms"
    }
  }
}
```

#### Response (Ping Only)

```json
{
  "success": true,
  "data": {
    "ping": 15.67,
    "jitter": 2.34,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "server": {
      "id": "us-east",
      "name": "Server us-east",
      "location": "US East"
    }
  }
}
```

---

## Code Examples

### JavaScript (Fetch)

```javascript
// Simple GET request
async function runSpeedTest() {
  const response = await fetch('https://your-domain.com/api/speed');
  const result = await response.json();
  
  if (result.success) {
    console.log(`Download: ${result.data.download} Mbps`);
    console.log(`Upload: ${result.data.upload} Mbps`);
    console.log(`Ping: ${result.data.ping} ms`);
    console.log(`Grade: ${result.data.grade}`);
  }
}

// POST request with custom config
async function runCustomTest() {
  const response = await fetch('https://your-domain.com/api/speed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serverId: 'us-west',
      testType: 'full'
    })
  });
  
  return await response.json();
}
```

### cURL

```bash
# Simple GET
curl https://your-domain.com/api/speed

# POST with custom server
curl -X POST https://your-domain.com/api/speed \
  -H "Content-Type: application/json" \
  -d '{"serverId": "eu-west", "testType": "full"}'

# Ping only test
curl -X POST https://your-domain.com/api/speed \
  -H "Content-Type: application/json" \
  -d '{"testType": "ping-only"}'
```

### Python

```python
import requests

# Simple GET
def run_speed_test():
    response = requests.get('https://your-domain.com/api/speed')
    result = response.json()
    
    if result['success']:
        data = result['data']
        print(f"Download: {data['download']} Mbps")
        print(f"Upload: {data['upload']} Mbps")
        print(f"Ping: {data['ping']} ms")
        print(f"Grade: {data['grade']}")
    
    return result

# POST with custom config
def run_custom_test(server_id='auto', test_type='full'):
    response = requests.post(
        'https://your-domain.com/api/speed',
        json={
            'serverId': server_id,
            'testType': test_type
        }
    )
    return response.json()
```

### Node.js

```javascript
const https = require('https');

function runSpeedTest() {
  return new Promise((resolve, reject) => {
    https.get('https://your-domain.com/api/speed', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// Using async/await
async function main() {
  const result = await runSpeedTest();
  console.log(result);
}
```

### PHP

```php
<?php

// Simple GET
function runSpeedTest() {
    $response = file_get_contents('https://your-domain.com/api/speed');
    $result = json_decode($response, true);
    
    if ($result['success']) {
        echo "Download: " . $result['data']['download'] . " Mbps\n";
        echo "Upload: " . $result['data']['upload'] . " Mbps\n";
        echo "Ping: " . $result['data']['ping'] . " ms\n";
    }
    
    return $result;
}

// POST with cURL
function runCustomTest($serverId = 'auto') {
    $ch = curl_init('https://your-domain.com/api/speed');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'serverId' => $serverId,
        'testType' => 'full'
    ]));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}
?>
```

---

## Webhooks

Speed Labs supports webhook notifications for test results. See [Webhook Documentation](/docs/webhooks.md) for setup instructions.

### Webhook Payload

```json
{
  "event": "test.completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "download": 125.45,
    "upload": 45.23,
    "ping": 15.67,
    "jitter": 2.34,
    "grade": "A"
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_SERVER` | 400 | Unknown server ID |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 10 | 100 |
| Pro | 60 | 1000 |
| Enterprise | Unlimited | Unlimited |

---

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for browser-based requests.

Allowed origins: `*` (all origins)
Allowed methods: `GET`, `POST`, `OPTIONS`
Allowed headers: `Content-Type`, `Authorization`

---

## JSONP Support

For legacy systems that don't support CORS:

```html
<script>
function handleResult(data) {
  console.log('Speed test result:', data);
}
</script>
<script src="https://your-domain.com/api/speed?format=jsonp&callback=handleResult"></script>
```

---

## Best Practices

1. **Cache Results**: Avoid running tests too frequently. Cache results for at least 60 seconds.

2. **Handle Errors**: Always check `success` field and handle errors gracefully.

3. **Respect Rate Limits**: Implement exponential backoff for rate-limited requests.

4. **Use POST for Custom Tests**: Use GET for simple tests, POST when specifying server or test type.

5. **Parse Units**: Always use the `units` object to display values correctly.

---

## Support

- **Email**: api-support@speedlabs.dev
- **GitHub Issues**: https://github.com/speedlabs/speedtest/issues
- **Documentation**: https://docs.speedlabs.dev

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- GET /api/speed endpoint
- POST /api/speed with custom configuration
- JSONP support
- CORS enabled
