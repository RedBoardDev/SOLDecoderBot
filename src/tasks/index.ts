import { Logger } from '../utils/logger';

export abstract class Task {
  protected readonly name: string;
  protected readonly logger: Logger;

  constructor(name: string, logger: Logger) {
    this.name = name;
    this.logger = logger;
  }

  // Méthode abstraite que chaque tâche doit implémenter
  protected abstract execute(): Promise<void>;

  // Méthode publique pour exécuter la tâche avec gestion des erreurs
  public async run(): Promise<void> {
    try {
      await this.logger.info(`Démarrage de la tâche : ${this.name}`);
      await this.execute();
      await this.logger.info(`Tâche terminée : ${this.name}`);
    } catch (error) {
      await this.logger.error(`Erreur dans la tâche ${this.name} : ${error}`);
    }
  }
}