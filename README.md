# BeGreen v2

Environmental project management system.

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js & npm](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Database Setup (Docker)

To start the MongoDB database and the management UI (Mongo Express):

```bash
docker-compose up -d
```

- **MongoDB**: `localhost:27017`
- **Mongo Express (UI)**: [http://localhost:8081](http://localhost:8081)
  - **Username**: `admin`
  - **Password**: `pass`

### 2. Default Credentials

The system automatically seeds a default administrator account on the first run:

- **Email**: `admin@begreen.com`
- **Password**: `admin123`

> [!IMPORTANT]
> Change the default password immediately after the first login via the Settings module.

### 3. Backend Setup (API)

```bash
cd BeGreen.Api
dotnet restore
dotnet run
```

The API will be available at `http://localhost:5030` (or similar, check console output).
Swagger documentation: `http://localhost:5030/swagger`

### 3. Frontend Setup (Web)

```bash
cd BeGreen.Web
npm install
npm start
```

The web application will be available at `http://localhost:4200`.

## Features

- **Dynamic Dashboard**: Real-time status tracking.
- **Password Reset**: Secure email-based flow.
- **Settings Module**: Manage users, roles, departments, and divisions.
- **Module Support**: Petty Cash, Cash Advance, Engineering Orders, IT Orders, Glitches, BEOs, Taxi Orders, and Expenses.
