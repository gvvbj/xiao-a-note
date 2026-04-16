import {
    SANDBOX_ALLOWED_EVENTS,
    SANDBOX_ALLOWED_SERVICES,
    SANDBOX_DENIED_SERVICES,
    SANDBOX_EDITOR_ALLOWED_METHODS,
    SANDBOX_FS_ALLOWED_METHODS,
    SANDBOX_PROXIED_SERVICES,
} from '../constants/SandboxAccessConstants';
import { ServiceId } from '@/kernel/core/ServiceId';

export function isSandboxServiceAllowed(serviceId: string): boolean {
    return SANDBOX_ALLOWED_SERVICES.includes(serviceId);
}

export function isSandboxServiceProxied(serviceId: string): boolean {
    return SANDBOX_PROXIED_SERVICES.includes(serviceId);
}

export function getSandboxDeniedServiceHint(serviceId: string): string | null {
    return SANDBOX_DENIED_SERVICES[serviceId] ?? null;
}

export function isSandboxEventAllowed(event: string): boolean {
    return SANDBOX_ALLOWED_EVENTS.includes(event);
}

export function getSandboxAllowedMethods(serviceId: string): readonly string[] {
    if (serviceId === ServiceId.FILE_SYSTEM) {
        return SANDBOX_FS_ALLOWED_METHODS;
    }

    if (serviceId === ServiceId.EDITOR) {
        return SANDBOX_EDITOR_ALLOWED_METHODS;
    }

    return [];
}
