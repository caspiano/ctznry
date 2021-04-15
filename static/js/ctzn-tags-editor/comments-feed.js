import { html } from '../../vendor/lit-element/lit-html/lit-html.js'
import { createWidgetBaseClass } from './base.js'
import { makeSafe } from '../lib/strings.js'

// exported api
// =

export const name = 'ctzn-comments-feed'
export const validElements = 'ctzn-comments-feed[user-id|limit]'

export function setup (win, doc, editor) {
  class CtznCommentsFeed extends createWidgetBaseClass(win) {
    static get observedAttributes () {
      return ['user-id', 'limit']
    }

    renderHeader () {
      return html`
        <strong>Comments Feed</strong>
        of
        ${this['user-id'] ? html`
          <span class="link" @click=${e => this.onClickUser(e)}>${this['user-id']}</span>
        ` : html`
          this user
        `}
      `
    }

    renderFooter () {
      return html`
        ${this.limit ? `Limit: ${this.limit}` : 'Infinite scroll'}
      `
    }

    onClickEdit (e) {
      doPropertiesDialog(this, editor)
    }

    onClickUser (e) {
      e.preventDefault()
      e.stopPropagation()
      window.open(`/${this['user-id']}`)
    }
  }
  win.customElements.define('ctzn-comments-feed', CtznCommentsFeed)
}

export function insert (editor) {
  editor.insertContent(`<ctzn-comments-feed></ctzn-comments-feed>`)
}

// internal methods
// =

function doPropertiesDialog (el, editor) {
  editor.windowManager.open({
    title: 'Comments feed',
    body: {
      type: 'panel',
      items: [
        {
          type: 'input',
          name: 'user-id',
          label: 'User ID',
          placeholder: 'Whose feed to show? (Defaults to the profile being viewed.)'
        },
        {
          type: 'input',
          name: 'limit',
          label: 'Comments limit',
          placeholder: 'How many comments should we show? (Defaults to infinite scroll.)'
        }
      ]
    },
    buttons: [
      {
        type: 'cancel',
        name: 'closeButton',
        text: 'Cancel'
      },
      {
        type: 'submit',
        name: 'submitButton',
        text: 'Save',
        primary: true
      }
    ],
    initialData: {
      'user-id': el?.['user-id'] || '',
      limit: el?.limit || ''
    },
    onSubmit: (dialog) => {
      var data = dialog.getData()

      data.limit = parseInt(data.limit) || ''
      
      if (!el) {
        let attrs = []
        if (data['user-id']) attrs.push(`user-id="${makeSafe(data['user-id'])}"`)
        if (data.limit) attrs.push(`limit="${makeSafe(data.limit)}"`)
        editor.insertContent(`<ctzn-comments-feed ${attrs.join(' ')}></ctzn-comments-feed>`)
      }
      else {
        editor.undoManager.transact(() => {
          for (let k in data) {
            if (!data[k]) {
              el[k] = undefined
              delete data[k]
            } else {
              el[k] = data[k]
            }
          }
          editor.dom.setAttribs(el, data)
        })
        editor.nodeChanged()
      }
      dialog.close()
    }
  })
}