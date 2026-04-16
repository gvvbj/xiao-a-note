import React from 'react';
import { useKernel } from '@/kernel/core/KernelContext';
import { ServiceId } from '@/kernel/core/ServiceId';
import { useEditor } from '@/kernel/hooks/useEditor';
import { useEditorLogic } from '../../../../hooks/useEditorLogic';
import { EditorExportService } from '../services/EditorExportService';
import { SaveAsDialog } from '@/shared/components/ui/SaveAsDialog';
import { IFileSystem } from '@/kernel/interfaces/IFileSystem';
import { EDITOR_CONSTANTS } from '../../../../constants/EditorConstants';
import { useNoteEditorContext } from '../../../../context/NoteEditorContext';

/**
 * ExportModals - 导出相关的弹窗组件
 * 由 ExportPlugin 注册到 EDITOR_MODALS 插槽
 */
export const ExportModals: React.FC = () => {
    const kernel = useKernel();
    const { currentPath, fileName } = useEditorLogic();
    const { saveAsDialogOpen, setSaveAsDialogOpen } = useEditor();
    const { editorRef } = useNoteEditorContext();
    const exportService = kernel.getService<EditorExportService>(ServiceId.EDITOR_EXPORT, false);

    return (
        <SaveAsDialog
            isOpen={saveAsDialogOpen}
            defaultFileName={fileName || EDITOR_CONSTANTS.DEFAULT_FILENAME.split('.')[0]}
            onCancel={() => setSaveAsDialogOpen(false)}
            onConfirm={async (name, format) => {
                setSaveAsDialogOpen(false);
                const content = editorRef.current?.getContent();
                if (content && exportService) {
                    const fileSystem = kernel.getService<IFileSystem>(ServiceId.FILE_SYSTEM);
                    if (!fileSystem) return;
                    const savePath = await fileSystem.showSaveDialog({
                        defaultPath: `${name}.${format === 'md' ? 'md' : (format === 'pdf' ? 'pdf' : 'mht')}`,
                        filters: [{ name: format.toUpperCase(), extensions: [format === 'md' ? 'md' : (format === 'pdf' ? 'pdf' : 'mht')] }]
                    });
                    if (savePath) {
                        await exportService.exportFile(content, savePath, format, {
                            basePath: currentPath ? await fileSystem.getDirname(currentPath) : undefined
                        });
                    }
                }
            }}
        />
    );
};
