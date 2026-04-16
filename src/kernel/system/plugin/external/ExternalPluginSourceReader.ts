import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { loggerService, type ILogger } from '@/kernel/services/LoggerService';

export class ExternalPluginSourceReader {
    constructor(
        private readonly fileSystem: IFileSystem,
        private readonly logger: ILogger = loggerService.createLogger('ExternalPluginSourceReader'),
    ) { }

    async readPluginDirectory(pluginId: string, pluginPath: string): Promise<Record<string, string> | null> {
        try {
            const pluginFiles = await this.fileSystem.readPluginDirectory(pluginPath);
            if (Object.keys(pluginFiles).length === 0) {
                this.logger.error(`No files found for plugin ${pluginId}`);
                return null;
            }

            return pluginFiles;
        } catch (error) {
            this.logger.error(`Failed to read plugin directory for ${pluginId}`, error);
            return null;
        }
    }
}
