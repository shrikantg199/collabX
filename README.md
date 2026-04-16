## CollabX Day 1

Day 1 builds the project foundation and proves the first real collaboration loop:

- JWT-based auth
- Create and join a workspace
- Socket.IO setup
- Real-time chat without Redis

If both apps are running and MongoDB is available, the end-of-day target is met:

- Chat works in real time

## Architecture

```text
Next.js (Frontend)
   ↓
Node.js + Express
   ↓
Socket.IO
   ↓
Redis (Pub/Sub)   <- planned for Day 2
   ↓
MongoDB
```

## Project Structure

```text
collabx/
│
├── client/        # Next.js app
├── server/        # Node.js backend
├── README.md
```

## Backend Overview

The backend is structured for Day 1 delivery while keeping Day 2 expansion easy:

- `auth` routes handle register, login, and current user lookup
- `workspaces` routes handle create, join, and list
- `messages` routes fetch message history for a workspace
- Socket.IO handles room joins and live message broadcasting
- `redis.js` exists as a placeholder for Pub/Sub scaling later

## Frontend Overview

The client uses the Next.js App Router and includes:

- `/login` for sign up and sign in
- `/workspace` for workspace creation, joining, and chat
- `ChatBox`, `MessageInput`, and `Editor` components
- `api.ts` for Axios setup
- `socket.ts` for Socket.IO client connection

## Environment Setup

Create the environment files from the examples:

### `server/.env`

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/collabx
JWT_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:3000
```

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Install

Install dependencies in both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Run

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:3000`.

## Day 1 User Flow

1. Create an account or log in.
2. Create a workspace or join one using a code.
3. Open the workspace screen.
4. Send messages and see them appear live for connected members.

## Notes

- Redis is intentionally not active yet.
- The editor panel is a Day 2 placeholder so chat can ship first.
- Socket auth uses the same JWT as the REST API.
fxcx
