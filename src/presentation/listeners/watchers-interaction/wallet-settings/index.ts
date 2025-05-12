import type { Client, Interaction } from 'discord.js';
import { handleWalletButtons } from './button-handler';
import { handleThresholdModal } from './modal-handler';
import { handleTagButtons, handleTagSelect, handleTagButtonsClear } from './tag-handler';
import { handleSummaryToggle } from './summary-handler';

export function registerWalletDetailInteractionHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (interaction.isButton()) {
        await handleWalletButtons(interaction);
        await handleTagButtons(interaction);
        await handleTagButtonsClear(interaction);
        await handleSummaryToggle(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleThresholdModal(interaction);
      } else if (interaction.isMentionableSelectMenu()) {
        await handleTagSelect(interaction);
      }
    } catch (err) {
      console.error('💥 wallet-detail interaction failed', err);
    }
  });
}
