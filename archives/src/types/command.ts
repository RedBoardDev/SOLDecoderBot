import type {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';

export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder;

export interface Command {
  data: CommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
