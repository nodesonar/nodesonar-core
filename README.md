# @nodesonar/core

[![NPM Version](https://img.shields.io/npm/v/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)
[![NPM Downloads](https://img.shields.io/npm/dm/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)
[![CI](https://github.com/nodesonar/nodesonar-core/actions/workflows/ci.yml/badge.svg)](https://github.com/nodesonar/nodesonar-core/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@nodesonar/core)](./LICENSE)
[![Node Version](https://img.shields.io/node/v/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)

A TypeScript network scanning and monitoring toolkit for Node.js. Discover devices on your network, ping hosts, and poll devices at configurable intervals — all with a clean, typed API.

---

## Features

- 📡 **Host Pinging** — Ping any host or IP address and get structured results
- 🔄 **Device Polling** — Poll one or more hosts at configurable intervals with live callbacks
- 🔍 **IP Range Scanning** — Discover reachable devices across CIDR, dash, and wildcard ranges
- 🧠 **Flexible IP Range Parsing** — Supports CIDR, dash ranges, full IP-to-IP ranges, and wildcards
- 💪 **Fully Typed** — Written in TypeScript with declaration files included

---

## Installation

```bash
npm install @nodesonar/core
```

---

## Usage

### Poller — Poll hosts at a configurable interval

```typescript
import { Poller } from '@nodesonar/core';

const poller = new Poller({ timeout: 2 });

// Poll a single host every 5 seconds
poller.pollHost({ host: '192.168.1.1', interval: 5000 }, (res) => {
  console.log(`${res.host} is ${res.status} — ${res.responseMs}ms`);
});

// Poll multiple hosts simultaneously
poller.pollHost({ host: '192.168.1.2', interval: 2000 }, (res) => {
  console.log(res);
});

// Check which hosts are currently being polled
console.log(poller.activeHosts); // ['192.168.1.1', '192.168.1.2']

// Stop polling a specific host
poller.stopPolling('192.168.1.1');

// Stop all polling
poller.stopAll();
```

---

### Ping a host directly

```typescript
import { Poller } from '@nodesonar/core';

const poller = new Poller();

const result = await poller.pingHost('192.168.1.1');
console.log(result);
// {
//   host: '192.168.1.1',
//   isReachable: true,
//   status: 'Online',
//   responseMs: 4.2,
//   packetLoss: 0,
//   output: '...'
// }
```

---

### IPScanner — Discover devices on your network

```typescript
import { IPScanner } from '@nodesonar/core';

const scanner = new IPScanner({ timeout: 2 });

// Scan a range and get all discovered devices
const devices = await scanner.discover('192.168.1.0/24');
console.log(devices);

// Stream devices as they are found
const devices = await scanner.discover('192.168.1.0-255', (device) => {
  console.log(`Found: ${device.host} (${device.responseMs}ms)`);
});
```

**Supported range formats:**

| Format | Example |
|---|---|
| CIDR | `192.168.1.0/24` |
| Short dash | `192.168.1.0-255` |
| Full IP range | `192.168.1.0-192.168.1.100` |
| Wildcard | `192.168.1.*` |
| Single IP | `192.168.1.1` |

---

## API

### `Poller`

| Method | Description |
|---|---|
| `pollHost(config, cb)` | Polls a host at the specified interval, invoking the callback with each result. |
| `stopPolling(host)` | Stops polling the specified host. |
| `stopAll()` | Stops all active polling intervals. |
| `pingHost(host)` | Pings a host once and returns the result. |
| `activeHosts` | Returns a list of hosts currently being polled. |
| `config` | Returns the current poller configuration. |

---

### `IPScanner`

| Method | Description |
|---|---|
| `discover(range, onDeviceFound?)` | Scans the given IP range and returns all reachable devices. Optionally streams results via callback. |

## Requirements

- Node.js 22+
- On Linux, raw socket access may require running with `sudo` or granting cap_net_raw capabilities

---

## License

ISC