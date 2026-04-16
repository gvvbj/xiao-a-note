export class AppRegistry {
  private static instance: AppRegistry;
  private modules: string[] = [];

  private constructor() { }

  public static getInstance(): AppRegistry {
    if (!AppRegistry.instance) {
      AppRegistry.instance = new AppRegistry();
    }
    return AppRegistry.instance;
  }

  public registerModule(name: string) {
    this.modules.push(name);
  }
}