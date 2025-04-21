# SOLDecoderBot

A Discord bot that monitors channels for attachments and automatically pins them with formatted descriptions.

## Features

- Monitors specified Discord channels
- Automatically detects images with description messages
- Auto-pins with enhanced formatting
- Handles pin limit management
- Supports role/user mentions
- Supports image embeds

## Commands

- `/monitor` - Start monitoring this channel
- `/unmonitor` - Stop monitoring this channel
- `/scan` - Scan up to 10,000 past messages and process attachments
- `/clear` - Unpin messages and delete bot posts
- `/monitored` - List all monitored channels
- `/settings` - Configure pinning behavior
- `/help` - Show all available commands

## Architecture

The bot uses a robust architecture with:

- Comprehensive, typed error handling
- Advanced logging system
- Command guards for consistent validation
- Secure permission management

## Logging System

The bot implements a professional logging system that:

- Displays logs in the console with colorization
- Writes logs to date-stamped files in the `logs/` directory
- Uses different log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Includes structured metadata for easier debugging
- Handles precise timestamps

Log files are named by the current date (`YYYY-MM-DD.log`) and are created automatically.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env_example` to `.env` and configure your tokens
4. Run `npm run deploy:commands` to register commands
5. Start the bot: `npm start`

## Configuration

Configure the bot via the `.env` file:

```
DISCORD_TOKEN=your_discord_token
CLIENT_ID=your_client_id
```

## Development

- `npm run dev` - Run in development mode with hot reloading
- `npm run typescript:check` - Check for TypeScript errors
- `npm run lint:check` - Check code style
- `npm run lint:fix` - Automatically fix style issues