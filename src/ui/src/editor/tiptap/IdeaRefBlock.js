import { Node } from '@tiptap/core';
import { buildIdeaRefUrl } from '../../utils/ideaRef';
import { formatRelativeTime } from '../../utils/ideaUtils';
import i18n from '../../i18n';
import styles from '../../components/IdeaTimeline.module.css';

const IdeaRefBlock = Node.create({
  name: 'ideaRefBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      threadId: { default: '' },
      date: { default: '' },
      entries: { default: '[]' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.idea-ref',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            threadId: node.getAttribute('data-thread-id') || '',
            date: node.getAttribute('data-date') || '',
            entries: node.getAttribute('data-entries') || '[]',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    let entries = [];
    try {
      entries = JSON.parse(node.attrs.entries || '[]');
    } catch {
      entries = [];
    }
    const href = buildIdeaRefUrl({
      threadId: node.attrs.threadId,
      date: node.attrs.date,
    });
    const dateText = node.attrs.date ? node.attrs.date : '';
    const countText = `${entries.length} 条`;
    const metaText = [countText, dateText].filter(Boolean).join(' · ');
    const children = entries.map((entry, index) => {
      const isFirst = index === 0;
      const isLast = index === entries.length - 1;
      const nextIsAI = entries[index + 1]?.isAI;
      const classes = [
        styles.entryRow,
        entry.isAI ? 'ai' : '',
        isFirst ? styles.entryFirst : '',
        isLast ? styles.entryLast : '',
      ].filter(Boolean).join(' ');
      const parts = String(entry.content || '').split('\n');
      const textNodes = [];
      parts.forEach((part, idx) => {
        const trimmed = part.trim();
        const match = trimmed.match(/^\[([^\]]+)\]\((oc:\/\/[^)]+)\)\s*$/);
        if (match) {
          const label = match[1];
          const href = match[2];
          const meta = entry?.refMeta?.[href] || null;
          const isIdea = meta?.kind === 'idea' || href.startsWith('oc://idea/');
          const subtitle = meta?.description || meta?.path || '';
          if (isIdea || href.startsWith('oc://doc/')) {
            textNodes.push([
              'div',
              { class: 'my-2' },
              [
                'div',
                { class: styles.refCard },
                [
                  'span',
                  {
                    class: `${styles.refCardIcon} ${isIdea ? styles.refCardIconIdea : styles.refCardIconDoc}`,
                  },
                ],
                [
                  'div',
                  { class: styles.refCardContent },
                  [
                    'div',
                    { class: styles.refCardLabel },
                    isIdea ? i18n.t('pageRef.tabIdeas', 'Ideas') : i18n.t('pageRef.tabPages', 'Docs'),
                  ],
                  [
                    'div',
                    { class: styles.refCardTitle },
                    label,
                  ],
                  ...(subtitle ? [['div', { class: styles.refCardDesc }, subtitle]] : []),
                ],
              ],
            ]);
          } else {
            textNodes.push(part);
          }
        } else {
          textNodes.push(part);
        }
        if (idx < parts.length - 1) textNodes.push(['br']);
      });
      const imageNodes = Array.isArray(entry.images)
        ? entry.images.map((src) => ['img', { class: styles.entryImage, src, alt: '' }])
        : [];
      const lineTopClass = `${styles.lineTop} ${entry.isAI ? styles.lineAi : styles.lineUser}`;
      const lineBottomClass = `${styles.lineBottom} ${nextIsAI ? styles.lineAi : styles.lineUser}`;
      const ballClass = `${styles.ball} ${entry.isAI ? styles.ballAi : styles.ballUser}`;
      const metaText = entry.createdAt ? formatRelativeTime(entry.createdAt) : '';
      const ballChildren = [];

      return [
        'div',
        { class: classes },
        [
          'div',
          { class: styles.leftCol },
          ['span', { class: lineTopClass }],
          ['span', { class: lineBottomClass }],
          ['span', { class: ballClass }, ...ballChildren],
        ],
        [
          'div',
          { class: styles.entryRight },
          [
            'div',
            { class: styles.entryHeader },
            [
              'div',
              { class: styles.entryBody },
              ['div', { class: `${styles.entryText} ${entry.isAI ? styles.entryTextAi : ''}` }, ...(textNodes.length ? textNodes : [' '])],
              ...(imageNodes.length ? [['div', { class: styles.entryImages }, ...imageNodes]] : []),
            ],
            ['div', { class: styles.entryMeta }, metaText],
          ],
        ],
      ];
    });
    return [
      'div',
      {
        class: `idea-ref not-prose ${styles.threadRef}`,
        'data-idea-href': href,
        'data-thread-id': node.attrs.threadId,
        'data-date': node.attrs.date,
        'data-entries': node.attrs.entries,
      },
      ...children,
    ];
  },
});

export default IdeaRefBlock;
