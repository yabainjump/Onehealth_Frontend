# OneHealth Frontend (Ionic + Angular)

## Overview
This project is a recent Ionic Angular frontend for OneHealth connected to a NestJS backend through a centralized API service.

## Tech stack
- Ionic 8
- Angular 20
- RxJS 7
- Capacitor Preferences for JWT persistence

## Prerequisites
- Node.js 20+
- npm 10+
- Ionic CLI (optional)

## Setup
1. Install dependencies:
   npm install
2. Configure API base URL in environment files:
   - src/environments/environment.ts
   - src/environments/environment.prod.ts

## Environment
`environment.ts`
- `production`: false
- `apiBaseUrl`: backend API base URL (example: `http://localhost:3000/api`)

`environment.prod.ts`
- `production`: true
- `apiBaseUrl`: production backend API URL

## Run
- Development server:
  npm run start

## Build
- Production build:
  npm run build

## Lint
- Run linting:
  npm run lint

## Auth flow
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- JWT token storage: Capacitor Preferences
- Bearer token injection: HTTP interceptor
- Protected routes: auth guard on `/feed`, `/profile`, `/chat`

## Functional modules
- Feed:
  - Create post
  - List posts
  - Like post
  - Comment post
- Profile:
  - Fetch current user (`/api/users/me`)
  - Update profile (`/api/users/me`)
- Chat:
  - Create room
  - List rooms
  - List and send messages
  - Mark room as read

## Main structure
src/
- app/
  - core/
    - constants/
      - storage.constants.ts
    - guards/
      - auth.guard.ts
    - interceptors/
      - auth.interceptor.ts
    - models/
      - auth.models.ts
    - services/
      - api.service.ts
      - auth.service.ts
      - users.service.ts
      - posts.service.ts
      - chat.service.ts
      - token-storage.service.ts
  - pages/
    - auth/
      - login/
      - register/
    - feed/
    - profile/
    - chat/

## Security notes
- No secrets are hardcoded.
- No uncontrolled `[innerHTML]` bindings are used.
- Token is stored through Capacitor Preferences.
- Forms use strict reactive validation.
