# SOL Decoder Bot

A Discord bot that **tracks Solana wallet activities** and provides **scheduled PnL summaries** with customizable notifications and formatting options.

## ✨ Core Features

| Feature | Description |
| ------- | ----------- |
| **Wallet Tracking** | Monitor any Solana wallet and receive **periodic PnL summaries** (daily/weekly/monthly) in your chosen channel. |
| **Customizable Alerts** | Configure notifications with optional tags, auto-pinning, and threshold filters. |
| **Rich UI** | Interactive dashboards with embeds, buttons, and modals for easy management. |
| **Timezone Support** | Server-wide timezone configuration for consistent reporting. |

## 🏗️ Tech Stack

| Component | Technology | Notes |
| --------- | ---------- | ----- |
| Runtime | **Node.js 22 LTS** | Native ES2023 features |
| Discord API | **discord.js 14.x** | TypeScript, Components v2 |
| Storage | **AWS DynamoDB** | Single-table design with GSIs |
| Scheduled Jobs | **AWS EventBridge** | Timezone-aware scheduling |
| Code Quality | **TypeScript + Biome** | Strict typing, modern tooling |

## 🏛 Architecture

The project follows Clean Architecture principles with clear separation of concerns. See [STRUCTURE.md](./STRUCTURE.md) for detailed architecture documentation.

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables
5. Start development:
   ```bash
   npm run dev
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the code style (Biome)
4. Submit a pull request

## License

MIT © 2024 — SOL Decoder Bot
