# WebGuard

A production-grade, multi-tenant website and domain security monitoring platform.

## Features

- **Domain Monitoring**: DNS record tracking, expiration alerts, status monitoring
- **SSL Certificate Monitoring**: Certificate validity, expiration warnings, chain verification
- **Uptime Monitoring**: HTTP/HTTPS probing, response time tracking, SLA statistics
- **Security Headers**: CSP, HSTS, X-Frame-Options checking
- **Multi-tenant**: Support for teams/organizations with RBAC
- **Webhook Alerts**: Real-time alert notifications

## Tech Stack

### Backend
- Rust + Axum web framework
- PostgreSQL + SQLx
- Hickory DNS, tokio-rustls, x509-parser
- Task queue with worker pool

### Frontend
- React 18 + Vite
- Zustand for state management
- UnoCSS for styling
- shadcn/ui components
- React Bits for status page animations

## Project Structure

```
web-guard/
├── backend/           # Rust backend
│   ├── migrations/    # Database migrations
│   └── src/           # Source code
├── frontend/          # React frontend
│   └── src/           # Source code
└── README.md
```

## Getting Started

### Prerequisites
- Rust 1.70+
- Node.js 20+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
cargo build
cargo run
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Development Status

This is an active work in progress. The project foundation has been established with:

- [x] Database schema design
- [x] Backend configuration and error handling
- [x] Database models and queries
- [x] Frontend structure and state management
- [ ] Authentication & authorization
- [ ] Monitoring implementations
- [ ] Task scheduler & workers
- [ ] Alert system

## License

MIT
