import type { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { loggerService, type ILogger } from '@/kernel/services/LoggerService';
import type { IExternalPluginManifest } from './ExternalPluginTypes';

export class ExternalPluginDiscovery {
    constructor(
        private readonly fileSystem: IFileSystem,
        private readonly logger: ILogger = loggerService.createLogger('ExternalPluginDiscovery'),
    ) { }

    async discoverPlugins(): Promise<IExternalPluginManifest[]> {
        try {
            const manifests = await this.fileSystem.getExternalPluginList();
            this.logger.info(`Discovered ${manifests.length} external plugins`);
            return manifests;
        } catch (error) {
            this.logger.error('Failed to discover plugins', error);
            return [];
        }
    }
}
