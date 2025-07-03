# FinFun TypeScript Application Architecture Documentation

## Overview
FinFun is a financial portfolio analysis application built with TypeScript that provides both traditional and AI-powered stock analysis. The application follows a typical web application architecture with a React frontend, Express.js backend, and SQLite database.

## Technology Stack

### Frontend
- **React 18** - UI framework for building interactive user interfaces
- **TypeScript** - Adds static type checking to JavaScript
- **Material-UI (MUI)** - React component library for consistent UI design
- **Axios** - HTTP client for API communication
- **Vite** - Build tool and development server

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web framework for building REST APIs
- **TypeScript** - Provides type safety on the backend
- **TypeORM** - Object-Relational Mapping (ORM) for database operations
- **SQLite** - Lightweight embedded database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token authentication

### External Services
- **FinRobot API** (Python) - AI-powered stock analysis service
- **Python API** - Sector normalization and metrics service

## Database Architecture

The application uses 7 main database entities that work together to manage users, portfolios, and analysis data:

### Core Entities

1. **User** - Authentication and user management
2. **Portfolio & PortfolioStock** - Investment portfolio management
3. **StockAnalysis** - Traditional financial analysis results
4. **AIStockAnalysis** - AI-generated stock analysis
5. **SectorMetrics** - Industry sector statistical data
6. **Config** - Application configuration settings

## Full Stack Flow Example: Portfolio Management

Let's trace how the portfolio feature works from frontend to database, demonstrating the complete application architecture.

### 1. Frontend Component Layer
**File**: `finfun-ts/frontend/src/components/Portfolio.tsx`

```typescript
// React component that displays user's portfolio
export const Portfolio: React.FC = () => {
    const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
    
    // Load portfolio data when component mounts
    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            const data = await api.getPortfolio();  // Call to API service
            setPortfolio(data);
        } catch (error) {
            setError('Failed to load portfolio');
        }
    };
}
```

**What happens**: The React component manages the user interface state and calls the API service to get portfolio data.

### 2. API Service Layer
**File**: `finfun-ts/frontend/src/services/api.ts`

```typescript
export const api = {
    getPortfolio: async (): Promise<Portfolio> => {
        const response = await apiClient.get('/portfolio');
        return response.data;
    }
}

// API client setup with authentication
const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Automatically include JWT token in requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

**What happens**: The API service layer handles HTTP communication with the backend. It automatically includes authentication tokens and manages the request/response cycle.

### 3. Backend Route Layer
**File**: `finfun-ts/backend/src/routes/portfolio.ts`

```typescript
// GET /api/portfolio - Get user's portfolio
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const portfolioRepository = AppDataSource.getRepository(Portfolio);
        
        // Find portfolio for current user with related stocks
        const portfolio = await portfolioRepository.findOne({
            where: { userId: req.user.id },
            relations: ['stocks', 'user']  // Load related data
        });

        if (!portfolio) {
            // Create empty portfolio if none exists
            const newPortfolio = new Portfolio();
            newPortfolio.userId = req.user.id;
            newPortfolio.name = 'My Portfolio';
            const savedPortfolio = await portfolioRepository.save(newPortfolio);
            return res.json(savedPortfolio);
        }

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
```

**What happens**: The route handler processes the HTTP request, authenticates the user, and coordinates with the database through the ORM.

### 4. Authentication Middleware
**File**: `finfun-ts/backend/src/middleware/auth.ts`

```typescript
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract JWT token

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ 
            where: { id: decoded.userId, isActive: true } 
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;  // Add user to request object
        next();  // Continue to route handler
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
```

**What happens**: Middleware intercepts requests to verify JWT tokens and load user information from the database before the route handler executes.

### 5. Database Entity Layer
**File**: `finfun-ts/backend/src/entities/Portfolio.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity()  // Marks this class as a database table
export class Portfolio {
    @PrimaryGeneratedColumn()  // Auto-incrementing primary key
    id!: number;

    @Column({ nullable: true })  // Database column
    name!: string;

    @Column()  // Foreign key to User table
    userId!: number;

    @ManyToOne(() => User)  // Relationship: Many portfolios belong to one user
    @JoinColumn({ name: 'userId' })
    user!: User;

    @OneToMany(() => PortfolioStock, stock => stock.portfolio)  // One portfolio has many stocks
    stocks!: PortfolioStock[];

    @CreateDateColumn()  // Automatically managed timestamp
    createdAt!: Date;

    @UpdateDateColumn()  // Automatically updated timestamp
    updatedAt!: Date;
}
```

**What happens**: TypeORM entities define the database schema and relationships. Decorators tell TypeORM how to map between JavaScript objects and database tables.

### 6. Database Configuration
**File**: `finfun-ts/backend/src/server.ts`

```typescript
export const AppDataSource = new DataSource({
    type: "sqlite",                    // Database type
    database: "finfun.db",            // Database file
    synchronize: true,                 // Auto-create/update tables
    logging: true,                     // Log SQL queries
    entities: [Portfolio, PortfolioStock, StockAnalysis, /* ... */],
});
```

**What happens**: TypeORM configuration defines how to connect to the database and which entities to manage.

## Complete Request Flow

Here's what happens when a user views their portfolio:

1. **Browser**: User navigates to `/portfolio` page
2. **React Router**: Loads Portfolio component
3. **Portfolio Component**: Calls `api.getPortfolio()` on mount
4. **API Service**: Makes HTTP GET request to `/api/portfolio` with JWT token
5. **Express Server**: Receives request, routes to portfolio handler
6. **Auth Middleware**: Validates JWT token, loads user from database
7. **Route Handler**: Uses TypeORM to query Portfolio table with user ID
8. **TypeORM**: Converts query to SQL, executes against SQLite database
9. **Database**: Returns portfolio data with related stocks
10. **TypeORM**: Converts SQL results back to JavaScript objects
11. **Route Handler**: Sends JSON response with portfolio data
12. **API Service**: Receives response, returns typed Portfolio object
13. **Portfolio Component**: Updates React state, triggers re-render
14. **Browser**: Displays portfolio data to user

## Key Architectural Patterns

### 1. Separation of Concerns
- **Frontend**: Handles UI logic and user interactions
- **Backend**: Manages business logic, authentication, and data access
- **Database**: Stores and retrieves data

### 2. TypeScript Throughout
- **Type Safety**: Compile-time checking prevents runtime errors
- **IntelliSense**: Better development experience with autocomplete
- **Interfaces**: Shared type definitions between frontend and backend

### 3. ORM Pattern (TypeORM)
- **Object-Relational Mapping**: Work with JavaScript objects instead of raw SQL
- **Relationships**: Automatic loading of related data (users, stocks, analyses)
- **Migrations**: Version control for database schema changes

### 4. REST API Design
- **Standard HTTP Methods**: GET, POST, PUT, DELETE
- **Resource-Based URLs**: `/api/portfolio`, `/api/analysis`
- **Status Codes**: Proper HTTP status codes for different scenarios

### 5. JWT Authentication
- **Stateless**: No server-side session storage required
- **Token-Based**: Secure authentication across frontend/backend
- **Middleware**: Centralized authentication logic

### 6. Repository Pattern
TypeORM provides repository objects for each entity:

```typescript
const portfolioRepository = AppDataSource.getRepository(Portfolio);
const portfolio = await portfolioRepository.findOne({
    where: { userId: req.user.id },
    relations: ['stocks', 'user']
});
```

## Database Relationships Explained

### One-to-Many: User → Portfolio
- One user can have one portfolio
- Portfolio belongs to exactly one user
- Foreign key: `Portfolio.userId` references `User.id`

### One-to-Many: Portfolio → PortfolioStock
- One portfolio contains many stocks
- Each stock belongs to one portfolio
- Foreign key: `PortfolioStock.portfolioId` references `Portfolio.id`

### Analysis Relationships
- `StockAnalysis` and `AIStockAnalysis` can be associated with multiple portfolios
- Uses JSON array field `portfolioIds` to store which portfolios the analysis applies to

## Error Handling Strategy

### Frontend
```typescript
try {
    const data = await api.getPortfolio();
    setPortfolio(data);
} catch (error) {
    setError('Failed to load portfolio');
}
```

### Backend
```typescript
try {
    const portfolio = await portfolioRepository.findOne(...);
    res.json(portfolio);
} catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
}
```

## Development vs Production

### Development
- SQLite database (single file)
- Synchronize: true (auto-create tables)
- Logging: true (see SQL queries)
- CORS enabled for local development

### Production Considerations
- PostgreSQL database (more robust)
- Synchronize: false (use migrations)
- Logging: false (performance)
- Proper environment variables for secrets

## Adding a New Feature

To add a new feature (e.g., "Watchlist"), you would:

1. **Create Entity**: Define database schema with TypeORM decorators
2. **Add to DataSource**: Include entity in TypeORM configuration
3. **Create Routes**: Add API endpoints for CRUD operations
4. **Add Middleware**: Include authentication/authorization as needed
5. **Create API Service**: Add frontend functions to call backend
6. **Build Components**: Create React components for UI
7. **Add Types**: Define TypeScript interfaces for type safety

This architecture provides a solid foundation for building complex financial analysis features while maintaining code organization and type safety throughout the stack. 