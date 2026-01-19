# Architecture Summary

**Project:** Calo - Nutrition Tracking Application
**Generated:** 2026-01-19

---

## Overview

| Component | Technology |
|-----------|------------|
| **Backend Framework** | Express.js v4.18.2 |
| **Backend Language** | TypeScript v5.3.3 |
| **Database** | PostgreSQL (via Supabase) |
| **ORM** | Prisma v6.17.1 |
| **Cloud Provider** | Supabase (hosted on AWS) |
| **Region** | ap-northeast-1 (Tokyo) |
| **AI Service** | OpenAI API (GPT-4o-mini) |

---

## Backend Architecture

### Entry Point
- **File:** `server/src/index.ts`
- **Port:** 5000 (configurable via `PORT` env)
- **Process:** Single Node.js process with graceful shutdown

### Server Configuration
```
- Trust Proxy: Enabled (level 1)
- Compression: Level 6, threshold 1KB
- Rate Limiting: 100 req/15min (prod), 1000 req/15min (dev)
- Body Limit: 10MB (JSON & URL-encoded)
- Health Cache: 30 seconds TTL
```

### Security Middleware Stack
1. **Helmet** - Security headers (CSP disabled in dev)
2. **Compression** - GZIP compression
3. **Rate Limiter** - Request throttling
4. **CORS** - Cross-origin resource sharing
5. **Cookie Parser** - Cookie handling
6. **JSON Parser** - Body parsing

---

## API Routes (21 endpoints)

| Route | Path | Description |
|-------|------|-------------|
| Auth | `/api/auth` | Authentication (login, register, password reset) |
| User | `/api/user` | User profile management |
| Nutrition | `/api/nutrition` | Meal tracking, nutrition data |
| Questionnaire | `/api/questionnaire` | Health questionnaire |
| Chat | `/api/chat` | AI-powered nutrition chat |
| Devices | `/api/devices` | Health device integrations |
| Meal Plans | `/api/meal-plans` | Meal planning functionality |
| Recommended Menus | `/api/recommended-menus` | AI-generated menu recommendations |
| Calendar | `/api/calendar` | Meal calendar |
| Statistics | `/api/statistics` | Nutrition statistics & analytics |
| Food Scanner | `/api/food-scanner` | Barcode & image food scanning |
| Achievements | `/api/achievements` | Gamification achievements |
| Shopping Lists | `/api/shopping-lists` | Shopping list management |
| Meal Completions | `/api/meal-completions` | Meal completion tracking |
| Daily Goals | `/api/daily-goals` | Daily nutrition goals |
| Daily Goals (Simple) | `/api/daily-goals-simple` | Simplified goals endpoint |
| Recommendations | `/api/recommendations` | AI recommendations |
| Database | `/api/database` | Database utilities (dev only) |
| Schema Validation | `/api/schema` | Schema validation utilities |
| Enhanced Menu | `/api/menu/enhanced` | Enhanced menu features |
| Admin | `/api/admin` | Admin panel routes |
| Dashboard | `/api/dashboard` | Dashboard data |

---

## Services Layer (24 services)

### Core Services
| Service | File | Purpose |
|---------|------|---------|
| OpenAI | `openai.ts` | AI text/image generation |
| Chat | `chat.ts` | AI chat processing |
| Nutrition | `nutrition.ts` | Meal & nutrition CRUD |
| Statistics | `statistics.ts` | Stats calculation |
| Achievements | `achievements.ts` | Gamification logic |
| Auth | `auth.ts` | JWT authentication |

### AI/ML Services
| Service | File | Purpose |
|---------|------|---------|
| AI Recommendations | `aiRecommendations.ts` | AI-powered recommendations |
| User Context | `userContext.ts` | Comprehensive user data for AI |
| Food Scanner | `foodScanner.ts` | Food image/barcode analysis |
| Enhanced Menu | `enhancedMenuService.ts` | AI menu generation |

### Data Services
| Service | File | Purpose |
|---------|------|---------|
| Daily Goals | `dailyGoal.ts` | Daily goal management |
| Calendar | `calendar.ts` | Calendar operations |
| Meal Plans | `mealPlans.ts` | Meal plan management |
| Recommended Menu | `recommendedMenu.ts` | Menu recommendations |
| Calendar Stats | `calendarStats.ts` | Calendar statistics |

### Background Services
| Service | File | Purpose |
|---------|------|---------|
| Cron | `cron.ts` | Basic cron jobs |
| Enhanced Cron | `cron/enhanced.ts` | Advanced scheduled tasks |
| Cron Jobs | `cronJobs.ts` | Job definitions |
| User Cleanup | `userCleanup.ts` | Cleanup orphaned data |
| Usage Tracking | `usageTracking.ts` | API usage tracking |

### Database Services
| Service | File | Purpose |
|---------|------|---------|
| DB Daily Goals | `database/dailyGoals.ts` | Goals database operations |
| DB AI Recommendations | `database/aiRecommendations.ts` | AI recommendations storage |
| DB Optimization | `database/optimization.ts` | Query optimization |

---

## Database Schema (Prisma)

### Core Models
| Model | Description | Key Relations |
|-------|-------------|---------------|
| `User` | User accounts | Has many: Meals, Goals, Plans |
| `Meal` | Logged meals | Belongs to: User |
| `NutritionPlan` | Nutrition plans | Belongs to: User |
| `DailyGoal` | Daily nutrition goals | Belongs to: User |
| `UserQuestionnaire` | Health questionnaire | Belongs to: User |

### Supporting Models
| Model | Description |
|-------|-------------|
| `Achievement` | Gamification achievements |
| `UserAchievement` | User-achievement junction |
| `RecommendedMenu` | AI-generated menus |
| `MenuMeal` | Menu meal items |
| `ShoppingList` | User shopping lists |
| `WaterIntake` | Water tracking |
| `FoodProduct` | Scanned food products |
| `AIRecommendation` | AI recommendation history |

### User Gamification Fields
```prisma
level              Int    @default(1)
total_points       Int    @default(0)
current_xp         Int    @default(0)
current_streak     Int    @default(0)
best_streak        Int    @default(0)
total_complete_days Int   @default(0)
```

---

## Frontend Architecture

### Technology Stack
| Component | Technology |
|-----------|------------|
| Framework | React Native v0.81.4 |
| Platform | Expo SDK v54 |
| Navigation | Expo Router v6 |
| State Management | Redux Toolkit + React Query |
| Language | TypeScript |
| Styling | StyleSheet + Linear Gradient |
| Icons | Lucide React Native |
| Animations | React Native Reanimated v4 |
| i18n | i18next (EN/HE) |

### Key Dependencies
- `@reduxjs/toolkit` - Global state
- `@tanstack/react-query` - Server state
- `redux-persist` - State persistence
- `expo-camera` - Food scanning
- `expo-notifications` - Push notifications
- `expo-secure-store` - Secure storage
- `react-native-chart-kit` - Charts
- `react-native-health` - HealthKit integration

### Navigation Structure
```
app/
├── (auth)/          # Authentication screens
├── (tabs)/          # Main tab navigation
│   ├── index.tsx    # Home
│   ├── history.tsx  # Meal history
│   ├── camera.tsx   # Food scanner
│   ├── statistics.tsx # Statistics
│   └── profile.tsx  # Profile
├── chat/            # AI Chat
├── menu/            # Menu screens
└── questionnaire/   # Onboarding
```

---

## External Integrations

### Supabase
- **Purpose:** PostgreSQL hosting + connection pooling
- **Features Used:**
  - PostgreSQL database
  - pgBouncer connection pooler
  - (Optional) Auth & Storage available
- **Connection:** `postgresql://...pooler.supabase.com:5432/postgres?pgbouncer=true`

### OpenAI API
- **Model:** GPT-4o-mini
- **Features Used:**
  - Chat completions (nutrition advice)
  - Image analysis (food scanning)
- **Rate Limits:** Tracked per user (ai_requests_count)

---

## Environment Variables

### Server (.env)
```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# API Configuration
API_BASE_URL=http://host:5000/api
PORT=5000
NODE_ENV=development|production

# OpenAI
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx

# Email (Nodemailer)
SMTP_HOST=xxx
SMTP_USER=xxx
SMTP_PASS=xxx
```

---

## Security Considerations

### Authentication
- **Method:** JWT (Access + Refresh tokens)
- **Storage:** HTTP-only cookies (refresh), Memory (access)
- **Expiry:** Access: 15min, Refresh: 7 days

### API Security
- Helmet security headers
- CORS whitelist
- Rate limiting (100-1000 req/15min)
- Request size limits (10MB)
- Input validation (Zod)

### Data Protection
- Password hashing (bcryptjs)
- Secure token storage (expo-secure-store)
- HTTPS enforced in production

---

## Performance Optimizations

### Server
- Compression (gzip level 6)
- Health check caching (30s TTL)
- Connection pooling (pgBouncer)
- Exponential backoff for DB retries

### Client
- React Query caching
- Redux persist (AsyncStorage)
- Image optimization
- Lazy loading (Expo Router)

---

## Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Daily Goals Creation | Daily at midnight | Create daily goals for all users |
| Achievement Check | Every 6 hours | Check & award achievements |
| Streak Calculation | Daily at 1 AM | Update user streaks |
| Cleanup | Weekly | Remove orphaned data |

---

## Monitoring & Health

### Health Endpoint
- **Path:** `GET /health`
- **Response:** Database status, uptime, OpenAI status
- **Caching:** 30 seconds

### Logging
- Development: errors, warnings
- Production: errors only
- Structured console logging with emojis

---

## File Structure

```
Calo/
├── client/                 # React Native Expo app
│   ├── app/               # Expo Router screens
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom React hooks
│   └── src/
│       ├── store/         # Redux store & slices
│       ├── services/      # API services
│       ├── context/       # React contexts
│       ├── i18n/          # Internationalization
│       └── types/         # TypeScript types
│
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── lib/           # Shared utilities
│   └── prisma/
│       ├── schema.prisma  # Database schema
│       └── seed.ts        # Database seeding
│
└── scripts/               # Utility scripts
```

---

## Version Information

| Package | Version |
|---------|---------|
| Node.js | v20+ (recommended) |
| TypeScript | 5.3.3 |
| Express | 4.18.2 |
| Prisma | 6.17.1 |
| React Native | 0.81.4 |
| Expo | 54.0.2 |
| React | 19.1.0 |
