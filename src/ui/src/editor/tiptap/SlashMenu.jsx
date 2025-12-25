/**
 * TiptapSlashMenu - Slash command menu for Tiptap editor.
 *
 * Triggered by typing "/" in the editor. Supports:
 * - Headings (H1, H2, H3)
 * - Lists (bullet, numbered, task)
 * - Tables
 * - Quotes
 * - Code blocks
 * - Page references
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CodeBracketIcon,
  ListBulletIcon,
  QueueListIcon,
  ChatBubbleBottomCenterTextIcon,
  TableCellsIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

// Slash menu item definitions
const SLASH_ITEMS = [
  { key: 'h1', icon: <span className="font-bold text-base">H1</span>, command: 'heading', attrs: { level: 1 } },
  { key: 'h2', icon: <span className="font-bold text-sm">H2</span>, command: 'heading', attrs: { level: 2 } },
  { key: 'h3', icon: <span className="font-bold text-xs">H3</span>, command: 'heading', attrs: { level: 3 } },
  { key: 'bulletList', icon: <ListBulletIcon className="w-4 h-4" />, command: 'bulletList' },
  { key: 'numberedList', icon: <QueueListIcon className="w-4 h-4" />, command: 'orderedList' },
  { key: 'childBulletList', icon: <ListBulletIcon className="w-4 h-4" />, command: 'childBulletList', keywords: ['nested', 'child', '子', '无序'] },
  { key: 'childNumberedList', icon: <QueueListIcon className="w-4 h-4" />, command: 'childNumberedList', keywords: ['nested', 'child', '子', '有序'] },
  { key: 'taskList', icon: <span className="font-mono text-sm">[ ]</span>, command: 'taskList' },
  { key: 'table', icon: <TableCellsIcon className="w-4 h-4" />, command: 'table' },
  { key: 'image', icon: <PhotoIcon className="w-4 h-4" />, command: 'image', keywords: ['image', 'photo', 'picture', '图片', '图像', '照片'] },
  { key: 'quote', icon: <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />, command: 'blockquote' },
  { key: 'codeBlock', icon: <CodeBracketIcon className="w-4 h-4" />, command: 'codeBlock' },
  { key: 'pageRef', icon: <span className="font-semibold text-base">@</span>, command: 'pageRef', keywords: ['ref', 'reference', 'link', 'page', 'mention', '引用', '页面', '链接', '文档'] },
  { key: 'divider', icon: <span className="text-gray-400">—</span>, command: 'horizontalRule' },
];

/**
 * @param {object} props
 * @param {import('@tiptap/react').Editor} props.editor - Tiptap editor instance
 * @param {Function} props.onOpenPageRef - Callback to open page reference picker
 */
export default function TiptapSlashMenu({ editor, onOpenPageRef }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const fileInputRef = useRef(null);
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const imageUrlInputRef = useRef(null);

  // Build items with i18n labels
  const items = useMemo(() => {
    return SLASH_ITEMS.map((item) => ({
      ...item,
      label: t(`slashMenu.${item.key}.label`, item.key),
      description: t(`slashMenu.${item.key}.description`, ''),
    }));
  }, [t]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const f = (filter || '').toLowerCase();
    if (!f) return items;
    return items.filter((item) => {
      const label = String(item.label || '').toLowerCase();
      const desc = String(item.description || '').toLowerCase();
      const keywords = Array.isArray(item.keywords) ? item.keywords.join(' ').toLowerCase() : '';
      return label.includes(f) || desc.includes(f) || keywords.includes(f);
    });
  }, [filter, items]);

  // Check for slash trigger
  const checkSlash = useCallback(() => {
    if (!editor || !editor.view) return;

    try {
      const { state } = editor;
      const { selection } = state;
      const { $from, empty } = selection;

      // Only trigger on collapsed selection
      if (!empty) {
        setIsOpen(false);
        return;
      }

      // Get text before cursor in current text node
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 50), // Look back up to 50 chars
        $from.parentOffset,
        null,
        '\ufffc'
      );

      // Match /xxx pattern at the end (slash at start of line or after space)
      const match = textBefore.match(/(^|\s)\/([^\s]*)$/);

      if (match) {
        setFilter(match[2] || '');
        setSelectedIndex(0);

        // Calculate position using DOM selection
        try {
          const coords = editor.view.coordsAtPos($from.pos);
          const menuEstimatedHeight = 320; // px (approx max-h-72 + header + padding)
          const menuEstimatedWidth = 320;  // px (approx w-72 + padding)
          const viewportH = window.innerHeight || 0;
          const viewportW = window.innerWidth || 0;

          // Default: below cursor
          let top = coords.bottom + 8;
          let left = coords.left;

          // If overflowing bottom, place above
          if (top + menuEstimatedHeight > viewportH - 8) {
            top = coords.top - menuEstimatedHeight - 8;
          }

          // Prevent negative top
          if (top < 8) top = 8;

          // Clamp horizontal to viewport
          if (left + menuEstimatedWidth > viewportW - 8) {
            left = Math.max(8, viewportW - menuEstimatedWidth - 8);
          }

          setPosition({ top, left });
          setIsOpen(true);
        } catch (e) {
          console.warn('Failed to get coords:', e);
          setIsOpen(false);
        }
      } else {
        setIsOpen(false);
      }
    } catch (e) {
      console.warn('SlashMenu checkSlash error:', e);
      setIsOpen(false);
    }
  }, [editor]);

  // Listen to editor changes
  useEffect(() => {
    if (!editor) return;

    // Use transaction handler for real-time updates
    const handleTransaction = ({ transaction }) => {
      // Only check when document changes (user is typing)
      if (transaction.docChanged) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          checkSlash();
        });
      }
    };

    // Also check on selection changes
    const handleSelectionUpdate = () => {
      checkSlash();
    };

    // Check on focus
    const handleFocus = () => {
      checkSlash();
    };

    editor.on('transaction', handleTransaction);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('focus', handleFocus);

    return () => {
      editor.off('transaction', handleTransaction);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('focus', handleFocus);
    };
  }, [editor, checkSlash]);

  // Close menu on blur
  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => {
      // Delay to allow click on menu items
      setTimeout(() => {
        if (!menuRef.current?.contains(document.activeElement)) {
          setIsOpen(false);
        }
      }, 150);
    };

    editor.on('blur', handleBlur);
    return () => editor.off('blur', handleBlur);
  }, [editor]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleKeyDown = (e) => {
      if (!filteredItems.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        selectItem(filteredItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    // Capture phase to intercept before editor
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredItems, selectedIndex, editor]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !filteredItems.length) return;
    const el = itemRefs.current?.[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [isOpen, selectedIndex, filteredItems.length]);

  // Compress image if needed
  const compressImage = useCallback((file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      // If file is small enough, skip compression
      if (file.size < 500 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;
        
        // Scale down if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        // Fallback to original
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      };

      // Read file as data URL for img src
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle image file selection
  const handleImageSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // Close modal first to prevent state issues
    setShowImageModal(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Compress image if needed
      const base64 = await compressImage(file);

      // If the encoded data is still too large (> ~800KB), skip to avoid crashes
      const approxBytes = Math.max(0, (base64?.length || 0) * 0.75);
      if (approxBytes > 800 * 1024) {
        console.warn('Image too large after compression, please use URL instead.');
        return;
      }

      // Use setTimeout to ensure state is settled
      setTimeout(() => {
        try {
          editor.chain().focus().setImage({ src: base64 }).run();
        } catch (err) {
          console.error('Failed to insert image:', err);
        }
      }, 50);
    } catch (err) {
      console.error('Failed to process image:', err);
    }
  }, [editor, compressImage]);

  // Handle image URL insert
  const handleImageUrlInsert = useCallback(() => {
    if (!imageUrl.trim() || !editor) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl('');
    setShowImageModal(false);
  }, [editor, imageUrl]);

  // Focus URL input when modal opens
  useEffect(() => {
    if (showImageModal && imageUrlInputRef.current) {
      setTimeout(() => imageUrlInputRef.current?.focus(), 100);
    }
  }, [showImageModal]);

  // Execute command
  const selectItem = useCallback((item) => {
    if (!item || !editor) return;

    // Delete the /xxx trigger text
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 50),
      $from.parentOffset,
      null,
      '\ufffc'
    );
    const match = textBefore.match(/(^|\s)\/([^\s]*)$/);

    if (match) {
      const deleteLength = match[0].length - (match[1]?.length || 0);
      editor.chain()
        .focus()
        .deleteRange({ from: $from.pos - deleteLength, to: $from.pos })
        .run();
    }

    // Execute command
    switch (item.command) {
      case 'heading':
        editor.chain().focus().toggleHeading({ level: item.attrs.level }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'childBulletList':
        editor.chain().focus().command(({ editor }) => editor.commands.insertNestedBulletList?.() || false).run();
        break;
      case 'childNumberedList':
        editor.chain().focus().command(({ editor }) => editor.commands.insertNestedOrderedList?.() || false).run();
        break;
      case 'image':
        // Show image modal
        setShowImageModal(true);
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'horizontalRule':
        editor.chain().focus().setHorizontalRule().run();
        break;
      case 'pageRef':
        onOpenPageRef?.();
        break;
      default:
        break;
    }

    setIsOpen(false);
  }, [editor, onOpenPageRef]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Render image modal
  const renderImageModal = () => {
    if (!showImageModal) return null;
    
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50" onClick={() => setShowImageModal(false)}>
        <div 
          className="bg-white rounded-xl shadow-2xl w-96 p-6 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('slashMenu.image.label', '插入图片')}</h3>
          
          {/* URL Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('slashMenu.image.urlLabel', '图片 URL')}
            </label>
            <div className="flex gap-2">
              <input
                ref={imageUrlInputRef}
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImageUrlInsert();
                  }
                  if (e.key === 'Escape') {
                    setShowImageModal(false);
                  }
                }}
                placeholder="https://example.com/image.png"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleImageUrlInsert}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.confirm', '确认')}
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">{t('slashMenu.image.or', '或')}</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
          
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <PhotoIcon className="w-5 h-5" />
            {t('slashMenu.image.uploadLocal', '选择本地图片')}
          </button>
          
          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            className="w-full mt-3 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('common.cancel', '取消')}
          </button>
        </div>
      </div>
    );
  };

  // Always render file input and image modal (they need to persist)
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleImageSelect}
    />
  );

  if (!isOpen || filteredItems.length === 0 || !position) {
    return (
      <>
        {fileInput}
        {renderImageModal()}
      </>
    );
  }

  return (
    <>
      {fileInput}
      {renderImageModal()}
      <div
        ref={menuRef}
        className="fixed z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        style={{ top: position.top, left: position.left }}
      >
      <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
        {t('editor.basicBlocks', 'Basic Blocks')}
      </div>
      <div className="p-1 max-h-72 overflow-y-auto">
        {filteredItems.map((item, index) => (
          <button
            key={item.key}
            ref={(el) => { itemRefs.current[index] = el; }}
            type="button"
            className={`w-full text-left px-2 py-2 flex items-center gap-3 rounded-lg text-sm transition-colors ${
              index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            onClick={() => selectItem(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="w-10 h-10 flex items-center justify-center text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-400 truncate">{item.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
