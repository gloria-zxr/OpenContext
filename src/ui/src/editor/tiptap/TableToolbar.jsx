/**
 * TiptapTableToolbar - Table toolbar using official BubbleMenu.
 *
 * Shows when cursor is inside a table. Provides:
 * - Add/remove rows and columns
 * - Delete table
 */

import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BubbleMenu } from '@tiptap/react/menus';

/**
 * @param {object} props
 * @param {import('@tiptap/react').Editor} props.editor - Tiptap editor instance
 */
function TiptapTableToolbar({ editor }) {
  const { t } = useTranslation();

  const addRowBefore = useCallback(() => {
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableToolbar"
      updateDelay={100}
      shouldShow={({ editor }) => {
        // Only show when inside a table
        return editor.isActive('table');
      }}
      className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1.5"
    >
      <TableActionButton onClick={addRowBefore} title={t('table.addRowBefore', 'Add row before')}>
        +Row ↑
      </TableActionButton>
      <TableActionButton onClick={addRowAfter} title={t('table.addRowAfter', 'Add row after')}>
        +Row ↓
      </TableActionButton>
      <TableActionButton onClick={addColumnBefore} title={t('table.addColBefore', 'Add column before')}>
        +Col ←
      </TableActionButton>
      <TableActionButton onClick={addColumnAfter} title={t('table.addColAfter', 'Add column after')}>
        +Col →
      </TableActionButton>
      
      <div className="w-px h-5 bg-gray-200 mx-1" />
      
      <TableActionButton onClick={deleteRow} title={t('table.deleteRow', 'Delete row')} danger>
        −Row
      </TableActionButton>
      <TableActionButton onClick={deleteColumn} title={t('table.deleteCol', 'Delete column')} danger>
        −Col
      </TableActionButton>
      <TableActionButton onClick={deleteTable} title={t('table.deleteTable', 'Delete table')} danger>
        {t('common.delete', 'Delete')}
      </TableActionButton>
    </BubbleMenu>
  );
}

// Action button component
const TableActionButton = memo(({ onClick, children, title, danger }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`px-2 h-7 text-xs flex items-center justify-center rounded border transition-colors ${
      danger
        ? 'border-red-200 text-red-600 hover:bg-red-50'
        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    }`}
    title={title}
  >
    {children}
  </button>
));

export default memo(TiptapTableToolbar);
