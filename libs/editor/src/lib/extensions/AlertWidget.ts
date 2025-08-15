import { Node } from '@tiptap/core'

export type AlertAttrs = {
  type?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  message?: string
  align?: 'left' | 'center' | 'right'
  size?: 'small' | 'medium' | 'large'
  textAlign?: 'left' | 'center' | 'right'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alertWidget: {
      setAlertWidget: (attrs?: AlertAttrs) => ReturnType
    }
  }
}

const AlertWidget = Node.create({
  name: 'alertWidget',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      type: { default: 'info' },
      title: { default: '' },
      message: { default: '' },
      align: { default: 'center' },
      size: { default: 'medium' },
      textAlign: { default: 'left' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-alert-widget]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-alert-widget': '', ...HTMLAttributes },
      ['strong', {}, HTMLAttributes.title || ''],
      ['div', {}, HTMLAttributes.message || ''],
    ]
  },

  addCommands() {
    return {
      setAlertWidget:
        (attrs: AlertAttrs = {}) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    }
  },
})

export default AlertWidget