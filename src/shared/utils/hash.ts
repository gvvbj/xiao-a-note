/**
 * 简单的字符串 Hash 计算 (DJB2 算法)
 * 用于生成内容指纹，判断文件是否修改
 */
export const calculateHash = (str: string): string => {
  let hash = 5381;
  let i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  // 转换为无符号 32 位整数并转字符串
  return (hash >>> 0).toString(16);
};