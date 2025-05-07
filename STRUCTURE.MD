## 📂 General Folder Structure

```
src/
├─ domain/
│   ├─ entities/
│   │   ├─ watcher.ts
│   │   └─ wallet.ts
│   ├─ value-objects/
│   │   ├─ threshold.ts
│   │   └─ frequency.ts
│   ├─ errors/
│   │   └─ domain-errors.ts
│   └─ interfaces/
│       ├─ i-watcher-repository.ts
│       ├─ i-wallet-repository.ts
│       ├─ i-metlex-mapper.ts
│       └─ i-lpagent-client.ts
│
├─ application/
│   ├─ use-cases/
│   │   ├─ add-watcher.use-case.ts
│   │   ├─ edit-watcher.use-case.ts
│   │   ├─ remove-watcher.use-case.ts
│   │   ├─ list-watchers.use-case.ts
│   │   ├─ process-closed-message.use-case.ts
│   │   ├─ add-wallet.use-case.ts
│   │   ├─ toggle-wallet.use-case.ts
│   │   └─ summary-wallet.use-case.ts
│   ├─ dtos/
│   │   ├─ add-watcher.dto.ts
│   │   └─ wallet-summary.dto.ts
│   └─ errors/
│       └─ application-errors.ts
│
├─ infrastructure/
│   ├─ repositories/
│   │   ├─ dynamo-watcher-repository.ts
│   │   └─ dynamo-wallet-repository.ts
│   ├─ services/
│   │   ├─ discord-adapter.ts
│   │   ├─ metlex-mapper.ts
│   │   ├─ lpagent-client.ts
│   │   └─ canvas-renderer.ts
│   └─ config/
│       ├─ env.ts
│       └─ aws.ts
│
├─ presentation/
│   ├─ commands/
│   │   ├─ follow.command.ts
│   │   ├─ unfollow.command.ts
│   │   ├─ watchers.command.ts
│   │   ├─ watch.command.ts
│   │   ├─ unwatch.command.ts
│   │   ├─ follows.command.ts
│   │   └─ clear.command.ts
│   ├─ listeners/
│   │   └─ closed-message.listener.ts
│   ├─ components/
│   │   ├─ add-watcher.modal.ts
│   │   ├─ edit-watcher.modal.ts
│   │   ├─ add-wallet.modal.ts
│   │   └─ manage-wallet.select-menu.ts
│   └─ utils/
│       ├─ embed-builder.ts
│       └─ interaction-collector.ts
│
├─ schemas/
│   ├─ metlex-link.schema.ts
│   ├─ position-response.schema.ts
│   └─ command-options.schema.ts
│
├─ shared/
│   ├─ logger.ts
│   └─ error-handler.ts
│
├─ injection/
│   └─ container.ts
│
└─ index.ts
```

---

## 🔍 Layer Details

### 1. **Domain**

* **Entities**: Pure classes (`Watcher`, `Wallet`) encapsulating business rules.
* **Value objects**: `Threshold`, `Frequency` to ensure validity (±%, DAY/WEEK/MONTH).
* **Interfaces**: Abstractions (`IWatcherRepository`, `IMetlexMapper`, etc.) – no mention of DynamoDB or Discord here.
* **Errors**: Typed business exceptions.

### 2. **Application**

* **Use cases**: Each interaction or business workflow (e.g., `AddWatcher`, `ProcessClosedMessage`).
* **DTOs**: Transfer objects validated with Zod (e.g., `AddWatcherDto`).
* **Errors**: Handles execution errors (repository, validation, etc.).

### 3. **Infrastructure**

* **Repositories**: Concrete implementations of `IWatcherRepository` and `IWalletRepository` using DynamoDB (AWS SDK v3, single-table).
* **External services**:

  * `DiscordAdapter` (sending embeds, modals, components).
  * `MetlexMapper` (caching MetlexHash → tx).
  * `LpagentClient` (typed HTTP requests with retry).
  * `CanvasRenderer` (optional PnL image generation).
* **Config**: Centralization of environment variables and AWS/Discord configuration.

### 4. **Presentation**

* **Slash commands** (in `commands/`): Parse options, call the corresponding use case, return a clean response (`ephemeral` / embed).
* **Listeners**: `closed-message.listener.ts` subscribes to the `messageCreate` event, filters, and triggers `ProcessClosedMessageUseCase`.
* **Components**: Buttons, menus, modals, handled by `InteractionCollector` to chain UI → business logic.
* **Utils**: Custom `EmbedBuilder`, interaction wrapper to simplify code.

### 5. **Schemas**

* **Zod** in every DTO and for validating `lpagent.io` API responses and Metlex URLs.
* Ensures *strict typing* everywhere, *no* untyped `any`.

### 6. **Shared**

* Central **Logger** (`winston` or `pino`) with levels (`info`, `error`).
* Global **Error handler** to catch rejected promises and log cleanly.

### 7. **Injection**

* **DI container** (e.g., `tsyringe`) in `injection/container.ts`: injects repositories, services, and use cases into the handlers to facilitate unit testing.

---

## 🛠️ Best Practices & Conventions

* **Files & folders**: `kebab-case` everywhere (`add-watcher.use-case.ts`, not `AddWatcherUseCase.ts`).
* **TypeScript**:

  * `"strict": true` in `tsconfig.json`.
  * No `any`, only `unknown` followed by Zod validation.
* **Clean code**:

  * Functions ≤ 20 lines, classes ≤ 200 lines.
  * One responsibility per module.
* **Testing**:

  * Unit tests for each use case & service (Jest + ts-jest).
  * Interface mocks to isolate the business layer.
* **Lint & format**: ESLint + Prettier with Airbnb rules adapted for TypeScript.

---

If you want, I can also provide an English diagram or visual representation of this architecture to make it clearer. Want me to?
