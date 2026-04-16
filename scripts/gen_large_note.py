#!/usr/bin/env python3
"""
gen_large_note.py - 生成大型 Markdown 测试文件

用于 Phase 12 的性能压力测试。

用法:
    python scripts/gen_large_note.py --size 10  # 生成约 10MB 的文件
    python scripts/gen_large_note.py --size 50  # 生成约 50MB 的文件

生成的文件包含:
- 多级标题结构
- 代码块 (含 mermaid 和普通代码)
- 数学公式
- 长段落文本
- 表格
- 图片链接占位符
"""

import argparse
import random
import os

# 文本片段 (用于生成随机内容)
LOREM = """
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
""".strip()

MATH_EXPRESSIONS = [
    r"$E = mc^2$",
    r"$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$",
    r"$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n$",
    r"$$\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}$$",
]

MERMAID_EXAMPLE = """
```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
```
"""

CODE_EXAMPLES = [
    """
```typescript
function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```
""",
    """
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```
""",
]

TABLE_EXAMPLE = """
| Column A | Column B | Column C | Column D |
| -------- | -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   | Data 4   |
| Value A  | Value B  | Value C  | Value D  |
| Item X   | Item Y   | Item Z   | Item W   |
"""

def generate_section(section_num: int) -> str:
    """生成一个包含多种元素的段落"""
    content = []
    
    # 标题
    content.append(f"## Section {section_num}")
    content.append("")
    
    # 随机段落
    for _ in range(random.randint(2, 4)):
        content.append(LOREM)
        content.append("")
    
    # 随机添加数学公式
    if random.random() > 0.5:
        content.append(random.choice(MATH_EXPRESSIONS))
        content.append("")
    
    # 随机添加代码块
    if random.random() > 0.6:
        content.append(random.choice(CODE_EXAMPLES).strip())
        content.append("")
    
    # 随机添加 mermaid 图表
    if random.random() > 0.8:
        content.append(MERMAID_EXAMPLE.strip())
        content.append("")
    
    # 随机添加表格
    if random.random() > 0.7:
        content.append(TABLE_EXAMPLE.strip())
        content.append("")
    
    return "\n".join(content)


def generate_large_markdown(target_size_mb: float) -> str:
    """生成目标大小的 Markdown 文件内容"""
    target_bytes = int(target_size_mb * 1024 * 1024)
    content_parts = ["# Performance Test Document\n\n"]
    content_parts.append("> This document was auto-generated for Phase 12 performance testing.\n\n")
    
    section_num = 1
    current_size = sum(len(p) for p in content_parts)
    
    while current_size < target_bytes:
        section = generate_section(section_num)
        content_parts.append(section)
        current_size += len(section)
        section_num += 1
        
        # 进度提示
        if section_num % 100 == 0:
            print(f"  Generated {section_num} sections, {current_size / 1024 / 1024:.2f} MB...")
    
    return "\n".join(content_parts)


def main():
    parser = argparse.ArgumentParser(description="Generate large Markdown files for performance testing")
    parser.add_argument("--size", type=float, default=10, help="Target file size in MB (default: 10)")
    parser.add_argument("--output", type=str, default=None, help="Output file path")
    args = parser.parse_args()
    
    output_path = args.output or f"test_file_{int(args.size)}mb.md"
    
    print(f"Generating ~{args.size}MB Markdown file...")
    content = generate_large_markdown(args.size)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    actual_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"Generated: {output_path} ({actual_size:.2f} MB)")


if __name__ == "__main__":
    main()
