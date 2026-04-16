import { Annotation } from '@codemirror/state';

import type { ProgrammaticTransactionSource } from './ProgrammaticTransactionSources';

/**
 * 内部同步事务标记
 * 用于标识由插件层同步回来的内容变更，以区别于外部强制加载文件的变更
 * 
 * 作用：拦截 CodeMirrorEditor 在 useEffect 中因 Props 改变而导致的“闪现”全量重写
 */
export const InternalSyncAnnotation = Annotation.define<boolean>();
export const ProgrammaticTransactionSourceAnnotation = Annotation.define<ProgrammaticTransactionSource>();
