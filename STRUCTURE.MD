# Project Structure

## 📂 Architecture Overview

```bash
src/
├─ domain/           # Business logic & core entities
├─ application/      # Use cases & DTOs
├─ infrastructure/   # AWS & external services
├─ presentation/     # Discord UI & commands
├─ schemas/          # Zod validations
└─ shared/          # Utilities & logging
```

## 🔍 Layer Details

### 1. Domain Layer

Core business logic and rules, independent of any framework or infrastructure.

- **Entities**: Business objects (e.g., `WalletWatch`, `GuildSettings`)
- **Value Objects**: Immutable, validated primitives (e.g., `Threshold`, `Frequency`, `Timezone`)
- **Interfaces**: Repository contracts and external service ports
- **Errors**: Domain-specific exceptions

### 2. Application Layer

Orchestrates the flow of data and implements use cases.

- **Use Cases**: Business workflows (e.g., add/list/remove wallet watches)
- **DTOs**: Data transfer objects with Zod validation
- **Errors**: Application-specific error handling

### 3. Infrastructure Layer

Implements interfaces defined in the domain layer.

- **Repositories**: DynamoDB implementations for data persistence
- **Services**: External integrations (Meteora API, position fetching)
- **Config**: Environment and AWS configuration

### 4. Presentation Layer

Handles Discord-specific UI and interactions.

- **Commands**: Discord slash commands
- **Listeners**: Event handlers and interaction processors
- **Utils**: UI builders and helpers

### 5. Shared Layer

Common utilities used across all layers.

- **Logger**: Centralized logging with levels
- **Error Handler**: Global error management

## 🛠️ Development Guidelines

- **TypeScript**: Strict mode, no `any`
- **Code Style**: Biome for formatting and linting
- **Architecture**: Clean Architecture principles
- **Testing**: Unit tests for use cases and services
- **Documentation**: JSDoc comments for public APIs
