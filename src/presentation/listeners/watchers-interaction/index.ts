import type { Client, Interaction } from 'discord.js';
import { handleWatchersButton } from './button-handler';
import { handleTimezoneSelect } from './timezone-select-handler';
import { handleWalletDashboard } from './wallet-dashboard-handler';
import { handleViewWallet } from './view-wallet-handler';
import { handleTagSelect } from './wallet-settings/tag-handler';
import { handleChannelSelect } from './add-wallet-channel';
import { handleAddWalletModal } from './add-wallet-modal';

export function registerWatchersInteractionHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (interaction.isButton()) {
        await handleWatchersButton(interaction);
        await handleWalletDashboard(interaction);
        await handleViewWallet(interaction);
      } else if (interaction.isChannelSelectMenu()) {
        await handleChannelSelect(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleAddWalletModal(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleTimezoneSelect(interaction);
      } else if (interaction.isMentionableSelectMenu()) {
        await handleTagSelect(interaction);
      }
    } catch (err) {
      console.error('❌ watchers interaction failed', err);
    }
  });
}
