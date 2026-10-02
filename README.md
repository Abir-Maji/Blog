# MERN Blog

A blog system built with MongoDB, Express, React and Node.js. It has user authentication (email/password, Google, Facebook), role-based access control, posts with soft delete, comments, an admin panel and real-time notifications.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Installation](#installation)
- [Environment setup](#environment-setup)
- [Running the app](#running-the-app)
- [Deployment](#deployment)
- [Testing](#testing)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Design notes](#design-notes)

## Features

**Authentication**
- Register, log in and log out with email and password. Passwords are hashed with bcrypt.
- Short-lived JWT access token (15 minutes) plus a refresh token (7 days).
- The refresh token is stored in an `httpOnly` cookie and rotated on every use. Reusing an old refresh token revokes all sessions of that user.
- Google and Facebook login through OAuth 2.0 (Passport).
- Rate limiting on the authentication endpoints.

**Roles and permissions**
- Two roles: `admin` and `user`.
- Users can create posts and comments, and edit or delete only their own.
- Admins can manage all users, posts and comments.
- Every rule is enforced in the API by middleware and the service layer. The frontend only hides what the user cannot do.

**Posts**
- Create, read, update and delete, with title, content, author and timestamps.
- A URL-friendly, unique slug is generated from the title.
- Soft delete: a deleted post gets `isDeleted` and `deletedAt` and disappears from the public API. Admins can see and restore it.
- Request payloads are validated with Zod.
- Paginated list with full-text search and a filter by author.

**Comments**
- Create, read, update and delete on any post.
- Each comment references its post and its author (Mongoose references).

**Admin panel**
- Dashboard with total users, posts and comments, and the recent activity log.
- Users: search, change role, activate or deactivate, delete.
- Posts: filter by status, edit, delete and restore.
- Comments: list and delete.

**Real-time notifications (bonus)**
- Socket.io pushes a notification to a post's author when someone comments on it.
- Admins are notified of every new post, new comment and new registration.

## Tech stack

| Layer | Technology |
| --- | --- |
| Database | MongoDB, Mongoose |
| API | Node.js, Express 5, Zod, Passport, JSON Web Tokens, Socket.io |
| Frontend | React 19 (function components and hooks), React Router, Axios, Tailwind CSS, Vite |
| Testing | Jest, Supertest, mongodb-memory-server |

## Installation

Requirements: **Node.js 22 or newer** and npm.

```bash
git clone <repository-url>
cd <repository-folder>
npm run install:all
```

`install:all` installs the dependencies of the root, `server/` and `client/` folders.

## Environment setup

Create the server environment file:

```bash
cp server/.env.example server/.env
```

Then fill in `server/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | yes | Secret for access tokens, at least 16 characters |
| `JWT_REFRESH_SECRET` | yes | Secret for refresh tokens, different from the one above |
| `MONGO_URI` | in production | MongoDB connection string (local or Atlas) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | recommended | An admin account with these credentials is created on first start |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google login | From the Google Cloud console |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | for Facebook login | From Meta for Developers |
| `PORT`, `CLIENT_URL`, `SERVER_URL` | no | Default to `5000`, `http://localhost:5173`, `http://localhost:5000` |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Database.** If `MONGO_URI` is empty in development, the server starts an embedded MongoDB and keeps its data in `server/.data`, so the project runs without installing MongoDB. The first start downloads the MongoDB binary once. Set `MONGO_URI` to use your own database instead.

**Social login.** Register these redirect URIs with the providers:

- Google: `http://localhost:5000/api/v1/auth/google/callback`
- Facebook: `http://localhost:5000/api/v1/auth/facebook/callback`

If a provider's credentials are not set, its button shows a "not configured" message and everything else keeps working.

The client needs no environment file in development. See `client/.env.example` for the optional variables used when the API is hosted on another origin.

## Running the app

```bash
npm run dev
```

This starts the API on http://localhost:5000 and the React app on http://localhost:5173. Open http://localhost:5173.

- Log in as admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`.
- `npm run seed` adds five demo authors (for example `priya@example.com` / `Password123`), 14 posts and 16 comments to an empty database. Stop the dev server first if you use the embedded database.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev --prefix server` | API only, restarts on file changes |
| `npm run dev --prefix client` | React app only |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start --prefix server` | API without file watching |

## Deployment

In production the API serves the built React app, so one web service runs everything: the client, the REST API and Socket.io on a single origin. The repository includes a `render.yaml` blueprint for [Render](https://render.com); any Node host with WebSocket support works the same way.

1. Create a free MongoDB Atlas cluster, allow access from anywhere (`0.0.0.0/0`), and copy the connection string.
2. On Render, create a **Blueprint** from this repository. It uses:
   - Build command: `npm run deploy:build`
   - Start command: `npm start`
3. Set the environment variables: `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and both `CLIENT_URL` and `SERVER_URL` set to the service's public URL (for example `https://mern-blog.onrender.com`). The JWT secrets are generated automatically.
4. For social login, add the production redirect URIs to the providers: `<SERVER_URL>/api/v1/auth/google/callback` and `<SERVER_URL>/api/v1/auth/facebook/callback`.
5. To load the demo content into the production database, run the seed once from your machine: `MONGO_URI="<atlas-uri>" npm run seed`.

## Testing

```bash
npm test                              # all tests
npm run test:coverage --prefix server # with a coverage report
```

The tests use Jest and Supertest against an in-memory MongoDB, so they need no database and do not touch development data.

- **Unit tests** (`server/tests/unit`): slug generation, tokens, pagination, and the validation, role, rate-limit and error-handling middleware.
- **Integration tests** (`server/tests/integration`): the HTTP API for authentication, refresh-token rotation, social-login account handling, posts, comments and admin, including the permission rules.

## Project structure

```
server/
  src/
    config/        environment, database, Passport strategies
    models/        Mongoose schemas: User, Post, Comment, ActivityLog
    validators/    Zod schemas for request payloads
    middleware/    authenticate, authorize, validate, rateLimiter, activityLogger, errorHandler
    services/      business logic (auth, posts, comments, users, admin, notifications)
    controllers/   HTTP layer: read the request, call a service, send the response
    routes/v1/     Express routers, grouped by resource
    sockets/       Socket.io setup
    utils/         ApiError, response envelope, slugs, tokens, pagination, permissions
    scripts/       admin bootstrap and demo data
    app.js         Express app
    server.js      HTTP server start-up
  tests/           unit and integration tests
client/
  src/
    api/           Axios client with token refresh, and API functions
    context/       AuthContext (global auth state), NotificationContext (Socket.io, toasts)
    hooks/         useFetch
    components/    Navbar, ProtectedRoute, PostCard, CommentSection, shared UI
    pages/         Home, PostDetail, PostEditor, MyPosts, AuthPages, admin/*
```

A request flows through `route → middleware → controller → service → model`. Controllers contain no business logic and services know nothing about HTTP.

## API overview

Base URL: `/api/v1`. Protected endpoints expect `Authorization: Bearer <accessToken>`.

Successful responses:

```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false } }
```

`meta` is present on paginated lists only. Error responses:

```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "title", "message": "Title must be at least 3 characters" }] }
```

Status codes: `400` validation, `401` not authenticated, `403` not allowed, `404` not found, `409` conflict, `429` rate limited.

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create an account. Body: `name`, `email`, `password` |
| POST | `/auth/login` | public | Log in. Body: `email`, `password` |
| POST | `/auth/refresh` | refresh cookie | Get a new access token and rotate the refresh token |
| POST | `/auth/logout` | refresh cookie | Revoke the refresh token |
| GET | `/auth/me` | user | Current user |
| GET | `/auth/providers` | public | Which social logins are configured |
| GET | `/auth/google`, `/auth/facebook` | public | Start social login |
| GET | `/auth/google/callback`, `/auth/facebook/callback` | provider | OAuth callback |

Register, login and refresh return `{ user, accessToken }` and set the refresh cookie.

### Posts

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/posts` | public | List posts. Query: `page`, `limit` (max 50), `search`, `author` |
| GET | `/posts/:slug` | public | One post by slug |
| POST | `/posts` | user | Create a post. Body: `title`, `content` |
| PATCH | `/posts/:id` | owner or admin | Update `title` and/or `content` |
| DELETE | `/posts/:id` | owner or admin | Soft-delete a post |

### Comments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/posts/:postId/comments` | public | Comments of a post. Query: `page`, `limit` |
| POST | `/posts/:postId/comments` | user | Add a comment. Body: `content` |
| PATCH | `/comments/:id` | owner or admin | Edit a comment |
| DELETE | `/comments/:id` | owner or admin | Delete a comment |

### Admin (admin role only)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Totals of users, posts, soft-deleted posts and comments |
| GET | `/admin/activity` | Activity log, paginated |
| GET | `/admin/users` | List users. Query: `page`, `limit`, `search` |
| PATCH | `/admin/users/:id` | Change `role` and/or `isActive` |
| DELETE | `/admin/users/:id` | Delete a user, soft-delete their posts, remove their comments |
| GET | `/admin/posts` | List posts including deleted. Query: `status` = `all`, `active` or `deleted` |
| PATCH | `/admin/posts/:id/restore` | Restore a soft-deleted post |
| GET | `/admin/comments` | List all comments |

### Real-time events

Connect to Socket.io with `auth: { token: <accessToken> }`. The server emits `notification` with `{ type, message, link, createdAt }`. Types: `comment.created` (to the post's author and to admins), `post.created` (to admins) and `user.registered` (to admins). The person who performed the action is not notified.

## Design notes

- **Token storage.** The access token is kept in memory only, and the refresh token in an `httpOnly`, `SameSite` cookie, so JavaScript can never read a long-lived credential. After a page reload the client calls `/auth/refresh` to restore the session. Axios refreshes an expired access token once and retries the request.
- **Social login.** After the provider redirects back, the API sets the refresh cookie and redirects to the client. No token is put in the URL. A random `state` value protects the flow against login CSRF.
- **Access control at the API level.** `authenticate` verifies the JWT and reloads the user, so a role change or deactivation takes effect immediately. `authorize(...roles)` guards routes by role. Ownership is checked in the service layer by `assertOwnerOrAdmin`.
- **Activity logging.** The `logActivity(action)` middleware records logins, registrations and every create, update and delete to the `ActivityLog` collection after the response succeeds.
- **Performance.** Indexes cover the slug lookup, the post list (`isDeleted`, `createdAt`), posts by author, comments by post, and text search. Lists are paginated, use `lean()`, and populate only the author's name. List responses carry a stored `excerpt` instead of the full content, and a stored `commentCount` instead of a count query per post.
- **Slugs.** A slug stays the same when the title is edited, so existing links keep working. A duplicate title gets a short random suffix.
- **Notifications** are delivered live and are not stored; a user who is offline does not receive them later.
