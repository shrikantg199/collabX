# ⚡ CollabX

**Real-time Collaboration Platform for High-Velocity Teams**

CollabX is a premium, full-stack collaborative workspace designed for modern teams. It combines instant messaging, collaborative document editing, and workspace management into a single, high-performance platform.

![CollabX Banner](https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000)

## ✨ Core Features

- **🚀 Chat-First Workspaces**: Create or join dedicated workspaces with instant invite codes.
- **💬 Real-time Communication**: Persistent chat with live typing indicators and instant message delivery via Socket.IO.
- **📝 Collaborative Editor**: Multi-user document editing with live synchronization.
- **📊 Interactive Dashboard**: High-level overview of your workspaces, activity stats, and quick actions.
- **🔒 Secure Authentication**: Robust JWT-based authentication with protected API routes.
- **📱 Mobile Responsive**: Premium, state-of-the-art UI that works perfectly across desktop, tablet, and mobile.
- **🔔 Smart Notifications**: Browser-level notifications and unread message tracking to keep you in the loop.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS (Premium Dark Mode Aesthetics)
- **State Management**: React Hooks (useRef, useMemo, useEffect)
- **Icons & Graphics**: Heroicons & Lucide-inspired SVG iconography

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Real-time**: Socket.IO
- **Database**: MongoDB (Mongoose ODM)
- **Caching/Scaling**: Redis (Pub/Sub for horizontal scaling)
- **Auth**: JSON Web Tokens (JWT) & Bcrypt

## 🏗️ Architecture

```text
Next.js (App Router) ←───────┐
       ↓                     │
Node.js + Express  ←───→ Socket.IO (WebSockets)
       ↓                     ↓
    MongoDB  ←─────────→  Redis (Pub/Sub)
```

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or Atlas)
- Redis (Optional for local development, required for multi-instance scaling)

### 2. Environment Setup

#### Server (`/server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/collabx
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:3000
```

#### Client (`/client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Installation

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Running the Application

```bash
# Start the backend (from /server)
npm run dev

# Start the frontend (from /client)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app in action.

## 📱 User Workflow

1. **Onboarding**: Sign up or sign in to access your personal dashboard.
2. **Workspace Setup**: Create a new workspace or join an existing one using a 6-character invite code.
3. **Collaborate**:
   - Use the **Chat** tab for real-time team communication.
   - Switch to the **Editor** tab for collaborative document drafting.
4. **Manage**: Workspace creators can manage members, transfer ownership, or delete workspaces.

---

Built with ❤️ for teams who ship fast.
