import {
    IDecorationProvider,
    IIsolatedProvider
} from '@/kernel/interfaces/editor-types';
import { loggerService } from '@/kernel/services/LoggerService';

export type {
    IDecorationContext,
    IDecorationResult,
    IDecorationProvider,
    IIsolatedProvider
} from '@/kernel/interfaces/editor-types';

const logger = loggerService.createLogger('MarkdownDecorationRegistry');

export class MarkdownDecorationRegistry {
    private providers: IDecorationProvider[] = [];
    private nodeTypeMap = new Map<string, IDecorationProvider[]>();

    private isolatedProviders: IIsolatedProvider[] = [];
    private isolatedNodeTypeMap = new Map<string, IIsolatedProvider[]>();

    registerProvider(provider: IDecorationProvider): () => void {
        this.providers.push(provider);
        provider.nodeTypes.forEach(type => {
            const list = this.nodeTypeMap.get(type) || [];
            list.push(provider);
            this.nodeTypeMap.set(type, list);
        });

        logger.debug(`Registered provider for: ${provider.nodeTypes.join(', ')}`);

        return () => {
            this.providers = this.providers.filter(p => p !== provider);
            provider.nodeTypes.forEach(type => {
                const list = this.nodeTypeMap.get(type) || [];
                this.nodeTypeMap.set(type, list.filter(p => p !== provider));
            });
        };
    }

    registerIsolatedProvider(provider: IIsolatedProvider): () => void {
        this.isolatedProviders.push(provider);
        provider.nodeTypes.forEach(type => {
            const list = this.isolatedNodeTypeMap.get(type) || [];
            list.push(provider);
            this.isolatedNodeTypeMap.set(type, list);
        });

        logger.debug(`Registered isolated provider for: ${provider.nodeTypes.join(', ')}`);

        return () => {
            this.isolatedProviders = this.isolatedProviders.filter(p => p !== provider);
            provider.nodeTypes.forEach(type => {
                const list = this.isolatedNodeTypeMap.get(type) || [];
                this.isolatedNodeTypeMap.set(type, list.filter(p => p !== provider));
            });
        };
    }

    getProvidersForType(nodeType: string): IDecorationProvider[] {
        return this.nodeTypeMap.get(nodeType) || [];
    }

    getIsolatedProvidersForType(type: string): IIsolatedProvider[] {
        return this.isolatedNodeTypeMap.get(type) || [];
    }

    getIsolatedProvidersCount(): number {
        return this.isolatedProviders.length;
    }

    getAllProviders(): IDecorationProvider[] {
        return this.providers;
    }
}
