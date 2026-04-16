import { IWindowService } from '@/kernel/interfaces/IWindowService';

export class ElectronWindowAdapter implements IWindowService {
  private get api() {
    return window.electronAPI;
  }

  minimize() { this.api?.minimize(); }
  maximize() { this.api?.maximize(); }
  toggleMaximize() { this.api?.toggleMaximize(); }
  close() { this.api?.close(); }
}
