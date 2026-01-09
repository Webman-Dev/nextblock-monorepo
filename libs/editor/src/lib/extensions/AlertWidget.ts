import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import AlertWidgetComponent from './components/AlertWidgetComponent'

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
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({ 'data-type': attributes.type }),
      },
      title: {
        default: 'Alert',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      message: {
        default: 'This is an alert message.',
        parseHTML: element => element.getAttribute('data-message'),
        renderHTML: attributes => ({ 'data-message': attributes.message }),
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
      size: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => ({ 'data-size': attributes.size }),
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-text-align'),
        renderHTML: attributes => ({ 'data-text-align': attributes.textAlign }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-alert-widget]',
        priority: 52, // Must be higher than DivNode's priority (51)
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-alert-widget': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlertWidgetComponent)
  },

  addCommands() {
    return {
      setAlertWidget:
        (attrs: AlertAttrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    }
  },
})

export default AlertWidget