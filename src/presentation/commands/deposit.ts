import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

const DEPOSIT_WALLET = '453z8oJvKejXCy59LAJnb6XXHS1JspnS9qrjLs2K9FBB';
const DEADLINE_DATE = 'July 20, 2025 at 11:42 PM';
const SOLSCAN_URL = `https://solscan.io/account/${DEPOSIT_WALLET}`;

export const data = new SlashCommandBuilder()
  .setName('deposit')
  .setDescription('Shows information for making a SOL deposit');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x9945ff) // Solana purple
    .setTitle('💰 SOL Deposit Information')
    .addFields(
      {
        name: '🏦 Deposit Address',
        value: `\`\`\`${DEPOSIT_WALLET}\`\`\``,
        inline: false,
      },
      {
        name: '⏰ Deadline',
        value: `**${DEADLINE_DATE}**`,
        inline: true,
      },
      {
        name: '⚠️ Important',
        value: '**After this date, all funds will be returned and will not be counted!**',
        inline: false,
      },
      {
        name: '🔍 Verification',
        value: `[View on Solscan](${SOLSCAN_URL})`,
        inline: true,
      },
      {
        name: '⚡ Instructions',
        value:
          '• **Verify the address** before sending\n' +
          '• **Double-check** on Solscan\n' +
          '• **Respect the deadline**\n' +
          '• **Keep transaction proof**',
        inline: false,
      },
    )
    .setFooter({
      text: '⚠️ Warning: Always verify the address before sending funds!',
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
