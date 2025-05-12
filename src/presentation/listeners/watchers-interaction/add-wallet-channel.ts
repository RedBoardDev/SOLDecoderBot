import {
  ActionRowBuilder,
  type ChannelSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export async function handleChannelSelect(interaction: ChannelSelectMenuInteraction) {
  if (interaction.customId !== 'watchers:selectChannel') return;

  const channelId = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`watchers:addWalletModal:${channelId}`)
    .setTitle('Add a new wallet')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('walletAddressInput')
          .setLabel('Wallet address (e.g. 4Nd1…)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('Enter the wallet address…'),
      ),
    );

  await interaction.showModal(modal);
}
