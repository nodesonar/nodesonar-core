# @nodesonar/core

[![NPM Version](https://img.shields.io/npm/v/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)
[![NPM Downloads](https://img.shields.io/npm/dm/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)
[![CI](https://github.com/nodesonar/nodesonar-core/actions/workflows/ci.yml/badge.svg)](https://github.com/nodesonar/nodesonar-core/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@nodesonar/core)](./LICENSE)
[![Node Version](https://img.shields.io/node/v/@nodesonar/core)](https://www.npmjs.com/package/@nodesonar/core)

A TypeScript network scanning and monitoring toolkit for Node.js. Discover devices on your network, ping hosts, poll devices at configurable intervals, and measure internet speed — all with a clean, typed API.

---

## Features

- 📡 [**Host Pinging**](#ping-a-host-directly) — Ping any host or IP address and get structured results
- 🔄 [**Device Polling**](#poller--poll-hosts-at-a-configurable-interval) — Poll one or more hosts at configurable intervals with live callbacks
- 🔍 [**IP Range Scanning**](#ipscanner--discover-devices-on-your-network) — Discover reachable devices across CIDR, dash, and wildcard ranges
- 🧠 [**Flexible IP Range Parsing**](#ipscanner--discover-devices-on-your-network) — Supports CIDR, dash ranges, full IP-to-IP ranges, and wildcards
- ⚡ [**Speed Testing**](#speedtest--measure-internet-speed) — Measure latency, jitter, download and upload throughput
- 💪 [**Fully Typed**](#types) — Written in TypeScript with declaration files included

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
  console.log(`${res.host} is ${res.status}`);
  console.log(`Packets — sent: ${res.count}, received: ${res.packetsReceived}, loss: ${res.packetLoss * 100}%`);

  if (res.latency) {
    console.log(`Latency — avg: ${res.latency.average}ms, fastest: ${res.latency.fastest}ms, slowest: ${res.latency.slowest}ms`);
  }
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
// {
//   host: '192.168.1.1',
//   isReachable: true,
//   status: 'Online',
//   count: 4,
//   packetsReceived: 4,
//   latency: {
//     average: 4.2,
//     fastest: 3.1,
//     slowest: 5.8
//   },
//   packetLoss: 0,
//   output: '...'
// }

// When host is unreachable
// {
//   host: '192.168.1.1',
//   isReachable: false,
//   status: 'Offline',
//   count: 4,
//   packetsReceived: 0,
//   latency: null,
//   packetLoss: 1,
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

// Stream devices as they are found
const streamed = await scanner.discover('192.168.1.0-255', (device) => {
  console.log(`Found: ${device.host}`);
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

### SpeedTest — Measure internet speed

```typescript
import { SpeedTest } from '@nodesonar/core';

const speedTest = new SpeedTest();

// Latency and jitter (ms), from 10 sequential round trips by default
const { median, jitter } = await speedTest.latency();
console.log(`Latency: ${median.toFixed(1)}ms (jitter ${jitter.toFixed(1)}ms)`);

// Download and upload speeds in Mbps, using the defaults
const down = await speedTest.download();
const up = await speedTest.upload();
console.log(`Download: ${down.toFixed(1)} Mbps, upload: ${up.toFixed(1)} Mbps`);

// Customise the test. Every option is optional and falls back to its default.
await speedTest.latency(20);
await speedTest.download({ bytes: 50_000_000, streams: 8 });
await speedTest.upload({ streams: 6 });
```

**Options**

| Option | Applies to | Default | Description |
|---|---|---|---|
| `samples` (argument to `latency`) | `latency` | `10` | Number of sequential requests to sample. |
| `bytes` | `download`, `upload` | `25,000,000` / `10,000,000` | Payload size per stream, in bytes. |
| `streams` | `download`, `upload` | `4` / `3` | Number of parallel connections. |

**Notes**

- Latency is an HTTP round trip, so it reads slightly higher than ICMP ping.
- Download and upload use parallel streams because a single TCP connection rarely saturates a fast link. Raise `streams` or `bytes` if results plateau on a gigabit connection.
- The defaults transfer about 100 MB down and 30 MB up per test, so keep that in mind on metered connections.
- Results are a good rough measurement but won't match Ookla exactly.

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

---

### `SpeedTest`

| Method | Description |
|---|---|
| `latency(samples?)` | Measures median round-trip latency and jitter in ms using sequential requests. |
| `download(options?)` | Measures download throughput in Mbps across parallel streams. |
| `upload(options?)` | Measures upload throughput in Mbps across parallel streams. |

## Types

### `PingHost.Response`

```typescript
interface Response {
  host: string;
  status: 'Online' | 'Offline';
  isReachable: boolean;
  count: number;
  packetsReceived: number;
  latency: {
    average: number;
    fastest: number;
    slowest: number;
  } | null;
  packetLoss: number; // 0–1 (e.g. 0.75 = 75% loss)
  output: string;
}
```

### `PingHost.Options`

```typescript
interface Options {
  count?: number;
  timeout?: number;
  packetSize?: number;
  extra?: string[];
}
```

### `PingHost.PollHostConfig`

```typescript
interface PollHostConfig {
  host: string;
  interval?: number; // ms, default 1000
}
```

### `IPScan.Discovered`

```typescript
type Discovered = Pick<PingHost.Response, 'host' | 'latency'>;
```

### `SpeedTest.Measure.Options`

```typescript
interface Options {
  bytes?: number;   // payload size per stream, default 25,000,000 (download) / 10,000,000 (upload)
  streams?: number; // parallel connections, default 4 (download) / 3 (upload)
}
```

### `SpeedTest.Measure.LatencyResponse`

```typescript
interface LatencyResponse {
  median: number; // ms
  jitter: number; // ms, mean absolute difference between consecutive samples
}
```

### `SpeedTest.Measure.Response`

```typescript
type Response = number; // Mbps
```

---

## Requirements

- Node.js 22+
- On Linux, raw socket access may require running with `sudo` or granting cap_net_raw capabilities
- Outbound HTTPS access to the speed test host for `SpeedTest`

---

## License

ISC
