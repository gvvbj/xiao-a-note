import type { IUIComponent } from '@/kernel/core/Kernel';
import type { IEditorEngine } from '@/kernel/interfaces/IEditorEngine';
import {
    CODEMIRROR_ENGINE_CAPABILITY_SCHEMA,
    EditorToolbarCapability,
    IEditorEngineCapabilitySchema,
    isToolbarCapabilitySupported,
} from './EngineCapabilitySchema';

const MANAGED_TOOLBAR_CAPABILITY_IDS = new Set<string>(
    Object.values(EditorToolbarCapability)
);

export interface ICapabilityAwareEditorEngine extends IEditorEngine {
    getCapabilities?: () => IEditorEngineCapabilitySchema;
}

const EMPTY_CAPABILITY_SCHEMA: IEditorEngineCapabilitySchema = {
    engineId: 'unknown',
    toolbar: { supported: [] },
    commands: { supported: [] },
};

export function isManagedToolbarCapabilityItem(itemId: string): boolean {
    return MANAGED_TOOLBAR_CAPABILITY_IDS.has(itemId);
}

export function resolveEngineCapabilitySchema(
    currentEngineId: string,
    engineService?: ICapabilityAwareEditorEngine | null
): IEditorEngineCapabilitySchema {
    const normalizedEngineId = currentEngineId.trim().toLowerCase();
    const runtimeSchema = engineService?.getCapabilities?.();

    if (runtimeSchema && runtimeSchema.engineId.trim().toLowerCase() === normalizedEngineId) {
        return runtimeSchema;
    }

    if (normalizedEngineId === CODEMIRROR_ENGINE_CAPABILITY_SCHEMA.engineId) {
        return CODEMIRROR_ENGINE_CAPABILITY_SCHEMA;
    }

    return runtimeSchema || { ...EMPTY_CAPABILITY_SCHEMA, engineId: normalizedEngineId || 'unknown' };
}

export function isToolbarItemSupported(
    item: Pick<IUIComponent, 'id'>,
    schema: IEditorEngineCapabilitySchema
): boolean {
    if (!isManagedToolbarCapabilityItem(item.id)) {
        return true;
    }
    return isToolbarCapabilitySupported(schema, item.id);
}

export function collectUnsupportedToolbarItems(
    items: IUIComponent[],
    schema: IEditorEngineCapabilitySchema
): IUIComponent[] {
    return items.filter(item => isManagedToolbarCapabilityItem(item.id) && !isToolbarItemSupported(item, schema));
}
