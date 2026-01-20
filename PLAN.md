# Anti-Gambling Support App - Development Plan

## App Overview
A recovery-focused mobile application helping users overcome gambling addiction through:
- VPN-based gambling site blocking (user-controlled)
- PayPal subscription billing ($9.99/month)
- Community support features (real-time chat + Discord integration)
- Recovery tracking (sobriety timer + savings calculator)
- Admin controls for managing user access

## Tech Stack
- **Frontend**: Expo (React Native)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Payments**: PayPal Subscriptions API
- **Authentication**: JWT (email/password)

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: string (unique),
  username: string (unique),
  password_hash: string,
  role: "user" | "admin",
  
  // Subscription
  subscription_status: "active" | "inactive" | "trial",
  subscription_id: string (PayPal),
  subscription_start: datetime,
  subscription_end: datetime,
  
  // Recovery Data
  sobriety_start_date: datetime,
  last_gambled_date: datetime,
  gambling_history: [{
    amount: number,
    date: datetime,
    notes: string
  }],
  
  // Blocking
  is_blocked: boolean,
  blocked_reason: string,
  blocked_by_admin: ObjectId,
  blocking_enabled: boolean,
  
  created_at: datetime,
  avatar_url: string
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  username: string,
  message: string,
  timestamp: datetime,
  room: "general" (default community room)
}
```

### Settings Collection
```javascript
{
  _id: ObjectId,
  blocked_domains: [string],  // List of gambling sites
  discord_link: string,
  app_settings: {}
}
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Subscription (PayPal)
- POST `/api/subscription/create` - Create subscription
- POST `/api/subscription/cancel` - Cancel subscription
- GET `/api/subscription/status` - Check status
- POST `/api/subscription/webhook` - PayPal webhook

### Recovery Tracking
- GET `/api/recovery/stats` - Get sobriety days + savings
- POST `/api/recovery/relapse` - Record relapse
- POST `/api/recovery/gambling-history` - Add gambling entry
- PUT `/api/recovery/sobriety-start` - Set sobriety start date

### Chat (Socket.IO + REST)
- GET `/api/chat/history` - Get message history
- WebSocket: `send_message`, `new_message` events

### Blocking
- GET `/api/blocking/domains` - Get blocked domain list
- POST `/api/blocking/enable` - Enable blocking for user
- GET `/api/blocking/status` - Check if blocking enabled

### Admin
- GET `/api/admin/users` - List all users
- POST `/api/admin/block-user/:user_id` - Block user
- POST `/api/admin/unblock-user/:user_id` - Unblock user
- GET `/api/admin/stats` - Dashboard stats

### Settings
- GET `/api/settings/discord-link` - Get Discord invite
- PUT `/api/settings/discord-link` - Update Discord (admin)

## Mobile App Screens

### Authentication Flow
1. **Welcome Screen** - Logo + tagline
2. **Login Screen** - Email/password
3. **Register Screen** - Username, email, password, initial gambling history setup

### Main App (Bottom Tabs)
1. **Dashboard** 
   - Days sober (large counter)
   - Money saved (calculated from history)
   - Blocking status indicator
   - Quick stats cards
   
2. **Community**
   - Real-time group chat
   - Discord link button
   - Active users indicator
   
3. **Protection**
   - VPN/Blocking status
   - Enable/disable blocking
   - List of blocked sites
   - Emergency contact button
   
4. **Profile**
   - User info
   - Subscription status
   - Relapse report button
   - Settings
   - Logout

### Admin Screens (if admin role)
5. **Admin Panel**
   - User list with search
   - Block/unblock actions
   - Subscription overview
   - App settings

## Implementation Phases

### Phase 1: Core Infrastructure (Backend + Auth)
- [x] FastAPI server setup
- [ ] MongoDB models and connection
- [ ] JWT authentication endpoints
- [ ] User registration/login
- [ ] Basic error handling

### Phase 2: Frontend Foundation
- [ ] Expo navigation setup (Stack + Tabs)
- [ ] Auth screens (Login/Register)
- [ ] Auth context + token storage
- [ ] Protected route wrapper
- [ ] Basic UI theme/styling

### Phase 3: PayPal Integration
- [ ] PayPal SDK backend setup
- [ ] Create subscription endpoint
- [ ] Payment webhook handler
- [ ] Frontend subscription screen
- [ ] Subscription status checking

### Phase 4: Recovery Tracking
- [ ] Sobriety timer logic
- [ ] Savings calculator (auto from history)
- [ ] Gambling history CRUD
- [ ] Dashboard UI with stats
- [ ] Relapse reporting

### Phase 5: Real-time Chat
- [ ] Socket.IO backend integration
- [ ] Message storage in MongoDB
- [ ] Socket.IO client setup
- [ ] Chat UI component
- [ ] Message history pagination

### Phase 6: Blocking Features
- [ ] Blocked domains list API
- [ ] DNS blocking status logic
- [ ] Protection screen UI
- [ ] Instructions for VPN setup
- [ ] Status indicators

### Phase 7: Community Features
- [ ] Discord link integration
- [ ] User presence indicators
- [ ] Chat notifications
- [ ] Community guidelines

### Phase 8: Admin Features
- [ ] Admin role checking
- [ ] User management UI
- [ ] Block/unblock functions
- [ ] Admin dashboard
- [ ] App settings management

### Phase 9: Polish & Testing
- [ ] Error boundary implementation
- [ ] Loading states
- [ ] Offline handling
- [ ] Form validation
- [ ] Backend testing
- [ ] Frontend testing
- [ ] Bug fixes

## VPN/Blocking Implementation Strategy

Since true VPN requires native code:
1. **Educational Approach**: Guide users to set up DNS-based blocking
2. **Status Tracking**: App tracks if user has blocking enabled
3. **Domain List**: Provide comprehensive gambling site list
4. **Instructions**: Step-by-step guides for iOS/Android DNS settings
5. **Verification**: Simple check to verify blocking is active
6. **Honor System**: Track user's self-reported blocking status

## Key Libraries Needed

### Backend
- fastapi
- motor (MongoDB async driver)
- pymongo
- python-socketio
- python-jose (JWT)
- passlib (password hashing)
- python-dotenv
- paypalrestsdk

### Frontend
- expo-router (navigation)
- socket.io-client
- expo-secure-store (token storage)
- axios
- react-native-gifted-charts (for stats visualization)
- @react-navigation/native
- @react-navigation/bottom-tabs
- zustand (state management)

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=gambling_recovery_app
SECRET_KEY=<generated-secret>
PAYPAL_CLIENT_ID=<from-paypal>
PAYPAL_SECRET=<from-paypal>
PAYPAL_MODE=sandbox  # or live
CORS_ORIGINS=http://localhost:8081
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=<backend-url>
EXPO_PUBLIC_SOCKET_URL=<backend-url>
```

## Next Steps
1. Clarify PayPal API keys (if available)
2. Start with Phase 1: Backend infrastructure
3. Build authentication system
4. Create basic mobile UI
5. Integrate features incrementally
