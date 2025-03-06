import { Client } from 'discord.js';
import { Task } from '.';
import { Logger } from '../utils/logger';
import { setupRoleReactionMessage } from '../features/roleReaction';

export class RoleReactionTask extends Task {
  private readonly client: Client;

  constructor(client: Client, logger: Logger) {
    super('RoleReactionTask', logger);
    this.client = client;
  }

  protected async execute(): Promise<void> {
    await setupRoleReactionMessage(this.client, this.logger);
  }
}