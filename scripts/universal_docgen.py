#!/usr/bin/env python3
"""
通用项目文档生成器 - 配置化版本
支持动态配置目录和排除规则
"""

import os
import json
from pathlib import Path

# ==================== 配置文件 ====================
CONFIG = {
    "project_name": None,  # 自动检测
    "include_dirs": ["src", "electron"],  # 包含的目录
    "exclude_dirs": ["node_modules", "dist", ".git", "test", "scripts"],  # 排除的目录
    "exclude_files": [  # 排除的文件
        "*.pyc", "*.log", ".DS_Store",
        "export_code_to_md.py",
        "generate_directory_structure.py",
        "project_code_documentation.md",
        "final_project_structure.md"
    ],
    "file_extensions": {  # 文件扩展名映射
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".css": "css",
        ".json": "json",
        ".md": "markdown",
        ".html": "html",
        ".py": "python",
        ".svg": "xml",
        ".txt": "text"
    }
}

# ==================== 工具函数 ====================

def load_config_file(config_path: str = ".docgen.json"):
    """
    从文件加载配置（如果存在）
    """
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                custom_config = json.load(f)
                CONFIG.update(custom_config)
                print(f"✅ 已加载配置文件: {config_path}")
        except Exception as e:
            print(f"⚠️  配置文件加载失败: {e}，使用默认配置")

def should_exclude_dir(dir_name: str) -> bool:
    """判断目录是否应该被排除"""
    return dir_name in CONFIG["exclude_dirs"]

def should_exclude_file(file_name: str) -> bool:
    """判断文件是否应该被排除"""
    for pattern in CONFIG["exclude_files"]:
        if pattern.startswith('*'):
            if file_name.endswith(pattern[1:]):
                return True
        elif file_name == pattern:
            return True
    return False

def get_file_content(file_path: str) -> str:
    """读取文件内容，自动处理编码"""
    encodings = ['utf-8', 'gbk', 'latin-1']
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except (UnicodeDecodeError, LookupError):
            continue
    return "[文件编码无法识别]"

# ==================== 主要功能 ====================

def generate_code_documentation(output_file: str = "project_code_documentation.md"):
    """生成代码文档"""
    project_root = os.getcwd()
    project_name = CONFIG["project_name"] or os.path.basename(project_root)
    
    markdown_content = f"# {project_name} 代码文档\n\n"
    markdown_content += f"本文件包含项目中 {', '.join(CONFIG['include_dirs'])} 目录下的代码文件。\n\n"
    
    for directory in CONFIG["include_dirs"]:
        dir_path = os.path.join(project_root, directory)
        if not os.path.exists(dir_path):
            markdown_content += f"## ⚠️  目录 {directory} 不存在\n\n"
            continue
        
        for root, dirs, files in os.walk(dir_path):
            # 排除不需要的目录
            dirs[:] = [d for d in dirs if not should_exclude_dir(d)]
            files.sort()
            
            for file in files:
                if should_exclude_file(file):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, project_root)
                file_ext = os.path.splitext(file)[1].lower()
                language = CONFIG["file_extensions"].get(file_ext, '')
                
                markdown_content += f"## {relative_path}\n\n"
                markdown_content += f"```{language}\n"
                file_content = get_file_content(file_path)
                markdown_content += file_content
                if not file_content.endswith('\n'):
                    markdown_content += '\n'
                markdown_content += f"```\n\n"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"📄 代码文档已生成: {output_file}")

def generate_directory_structure(output_file: str = "final_project_structure.md"):
    """生成目录结构"""
    project_root = os.getcwd()
    project_name = CONFIG["project_name"] or os.path.basename(project_root)
    
    def build_tree(current_path: str, indent: str = "", is_last: bool = True) -> str:
        result = ""
        items = os.listdir(current_path)
        items.sort()
        
        # 过滤
        filtered_items = [
            item for item in items
            if not (
                (os.path.isdir(os.path.join(current_path, item)) and should_exclude_dir(item)) or
                (os.path.isfile(os.path.join(current_path, item)) and should_exclude_file(item))
            )
        ]
        
        for index, item in enumerate(filtered_items):
            is_last_item = index == len(filtered_items) - 1
            item_path = os.path.join(current_path, item)
            prefix = "└── " if is_last else "├── "
            result += f"{indent}{prefix}{item}\n"
            
            if os.path.isdir(item_path):
                new_indent = indent + ("    " if is_last else "│   ")
                result += build_tree(item_path, new_indent, is_last_item)
        
        return result
    
    tree = build_tree(project_root)
    
    markdown_content = f"# {project_name} 项目目录结构\n\n```\n{project_name}/\n{tree}```\n\n"
    markdown_content += "## 配置说明\n\n"
    markdown_content += f"- 包含目录: {', '.join(CONFIG['include_dirs'])}\n"
    markdown_content += f"- 排除目录: {', '.join(CONFIG['exclude_dirs'])}\n"
    markdown_content += f"- 可通过 `.docgen.json` 自定义配置\n"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"📁 目录结构已生成: {output_file}")

def create_config_template():
    """创建配置文件模板"""
    config_file = ".docgen.json"
    if os.path.exists(config_file):
        print(f"⚠️  配置文件已存在: {config_file}")
        return
    
    template = {
        "project_name": "My Project",
        "include_dirs": ["src", "lib"],
        "exclude_dirs": ["node_modules", "dist", ".git"],
        "exclude_files": ["*.log", "*.pyc"],
        "file_extensions": {
            ".ts": "typescript",
            ".js": "javascript"
        }
    }
    
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(template, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 配置模板已创建: {config_file}")
    print("   请根据需要修改配置，然后重新运行脚本")

# ==================== CLI ====================

if __name__ == "__main__":
    import sys
    
    # 加载配置
    load_config_file()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "init":
            create_config_template()
        elif command == "doc":
            generate_code_documentation()
        elif command == "tree":
            generate_directory_structure()
        elif command == "all":
            generate_code_documentation()
            generate_directory_structure()
        else:
            print(f"❌ 未知命令: {command}")
            print("用法: python scripts/universal_docgen.py [init|doc|tree|all]")
    else:
        # 默认生成所有文档
        generate_code_documentation()
        generate_directory_structure()