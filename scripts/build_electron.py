#!/usr/bin/env python3
"""
Electron 构建脚本 (优化版)
"""

import os
import subprocess
import shutil
import sys
from pathlib import Path

class ElectronBuilder:
    def __init__(self, project_root: str = "."):
        self.root = Path(project_root)
        self.electron_dir = self.root / "electron"
        self.dist_dir = self.electron_dir / "dist"
    
    def clean(self):
        print("🧹 清理构建目录...")
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)
        self.dist_dir.mkdir(parents=True, exist_ok=True)
    
    def compile_typescript(self):
        print("\n📦 编译 Electron TypeScript...")
        tsconfig = self.electron_dir / "tsconfig.json"
        
        try:
            is_windows = sys.platform == 'win32'
            # 移除 capture_output=True，让 tsc 的输出直接显示在控制台，这样你就能看到具体的报错了
            result = subprocess.run(
                ["npx", "tsc", "-p", str(tsconfig)],
                cwd=str(self.root),
                shell=is_windows
            )
            
            if result.returncode == 0:
                print("  ✅ TypeScript 编译成功")
                self._rename_to_cjs("main.js", "main.cjs")
                self._rename_to_cjs("preload.js", "preload.cjs")
                return True
            else:
                print(f"  ❌ TypeScript 编译失败 (代码: {result.returncode})")
                return False
        except Exception as e:
            print(f"  ❌ 编译执行出错: {e}")
            return False

    def _rename_to_cjs(self, src_name, dest_name):
        src = self.dist_dir / src_name
        dest = self.dist_dir / dest_name
        if src.exists():
            if dest.exists(): os.remove(dest)
            os.rename(src, dest)

    def copy_static_files(self):
        package_json = self.dist_dir / "package.json"
        package_json.write_text('{"type": "commonjs"}', encoding='utf-8')
    
    def verify_output(self):
        required = ["main.cjs", "preload.cjs"]
        missing = [f for f in required if not (self.dist_dir / f).exists()]
        if missing:
            print(f"  ⚠️  缺少文件: {', '.join(missing)}")
            return False
        return True
    
    def build(self):
        print("🚀 开始构建 Electron...\n")
        self.clean()
        if not self.compile_typescript(): return False
        self.copy_static_files()
        return self.verify_output()

def main():
    if sys.stdout.encoding != 'utf-8':
        try: sys.stdout.reconfigure(encoding='utf-8')
        except: pass
    builder = ElectronBuilder(sys.argv[1] if len(sys.argv) > 1 else ".")
    sys.exit(0 if builder.build() else 1)

if __name__ == "__main__":
    main()