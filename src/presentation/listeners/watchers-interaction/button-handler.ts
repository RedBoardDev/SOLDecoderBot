import {
  type ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { TimezoneHelper } from '../../../domain/value-objects/timezone';
import { GetGuildSettingsUseCase } from '../../../application/use-cases/get-guild-settings.use-case';
import { InitGuildSettingsUseCase } from '../../../application/use-cases/init-guild-settings.use-case';
import { DynamoGuildSettingsRepository } from '../../../infrastructure/repositories/dynamo-guild-settings-repository';
import { buildDashboardEmbed } from '../../components/dashboard/embeds';

export async function handleWatchersButton(interaction: ButtonInteraction) {
  const [ns, action] = interaction.customId.split(':');
  if (ns !== 'watchers') return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  const repo = new DynamoGuildSettingsRepository();
  const getUseCase = new GetGuildSettingsUseCase(repo);

  if (action === 'setTimezone') {
    const allTz = TimezoneHelper.all();
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('watchers:selectTimezone')
        .setPlaceholder('Select a timezone')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(allTz.map((tz) => ({ label: tz, value: tz }))),
    );
    await interaction.deferUpdate();
    await interaction.editReply({ content: 'Choose your timezone:', components: [menuRow] });
    return;
  }

  if (action === 'mainDashboard') {
    await interaction.deferUpdate();

    let settings = await getUseCase.execute(guildId);

    if (settings === null) {
      const initUseCase = new InitGuildSettingsUseCase(repo);
      await initUseCase.execute(guildId);
      settings = await getUseCase.execute(guildId);
      if (settings === null) {
        return await interaction.editReply({
          content: '❌ Unable to initialize settings. Please try again later.',
        });
      }
    }

    const embed = buildDashboardEmbed(settings.timezone);
    const components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('watchers:setTimezone')
          .setLabel('⏰ Set Timezone')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('watchers:walletSettings')
          .setLabel('⚙️ Wallet Settings')
          .setStyle(ButtonStyle.Secondary),
      ),
    ];

    await interaction.editReply({ embeds: [embed], components });
  }
}
