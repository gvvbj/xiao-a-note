export interface IExternalPluginManifest {
    id: string;
    name: string;
    version: string;
    path: string;
    main: string;
    hidden?: boolean;
}

export type CommonJsModule = { exports: unknown };
export type PluginConstructor = new () => unknown;
