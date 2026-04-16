import { FileNode } from '@/kernel/services/ExplorerService';

/**
 * 将文件树根据展开状态扁平化为一维数组
 * 用于 Shift 连选计算索引
 */
export function flattenTree(
  nodes: FileNode[],
  expandedPaths: Set<string>
): FileNode[] {
  const result: FileNode[] = [];

  const traverse = (list: FileNode[]) => {
    for (const node of list) {
      result.push(node);
      // 如果是文件夹且已展开，递归遍历子节点
      if (node.isDirectory && expandedPaths.has(node.path) && node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(nodes);
  return result;
}

/**
 * 获取仅包含文件夹的树（用于移动文件弹窗）
 */
export function getFolderTree(nodes: FileNode[]): FileNode[] {
  return nodes
    .filter(n => n.isDirectory)
    .map(n => ({
      ...n,
      children: n.children ? getFolderTree(n.children) : []
    }));
}