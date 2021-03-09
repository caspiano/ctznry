import { LitElement, html } from '../vendor/lit-element/lit-element.js'
import * as session from './lib/session.js'
import { DRIVE_KEY_REGEX } from './lib/strings.js'
import './com/header.js'
import './views/account.js'
import './views/communities.js'
import './views/forgot-password.js'
import './views/main.js'
import './views/notifications.js'
import './views/post.js'
import './views/signup.js'
import './views/user.js'

const POST_PATH_REGEX = new RegExp('/([^/]+@[^/]+)/ctzn.network/post/([^/]+)', 'i')
const COMMENT_PATH_REGEX = new RegExp('/([^/]+@[^/]+)/ctzn.network/comment/([^/]+)', 'i')
const USER_PATH_REGEX = new RegExp('/([^/]+@[^/]+)')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch(console.error)
  )
}

class CtznApp extends LitElement {
  static get properties () {
    return {
      currentPath: {type: String},
      isLoading: {type: Boolean}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()

    this.isLoading = true
    this.currentPath = window.location.pathname
    this.addEventListener('click', this.onGlobalClick.bind(this))
    this.addEventListener('view-thread', this.onViewThread.bind(this))
    window.addEventListener('popstate', this.onHistoryPopstate.bind(this))

    this.load()
  }

  async load () {
    try {
      await session.setup()
    } finally {
      this.isLoading = false
    }
  }

  navigateTo (pathname) {
    window.history.replaceState({scrollY: window.scrollY}, null)
    window.history.pushState({}, null, pathname)
    this.currentPath = pathname
  }

  // rendering
  // =

  render () {
    if (this.isLoading) {
      return html`
        <div class="max-w-4xl mx-auto">
          <div class="py-32 text-center text-gray-400">
            <span class="spinner h-7 w-7"></span>
          </div>
        </div>
      `
    }

    switch (this.currentPath) {
      case '/':
      case '/index':
      case '/index.html':
        return html`<ctzn-main-view id="view"></ctzn-main-view>`
      case '/forgot-password':
        return html`<ctzn-forgot-password-view id="view"></ctzn-forgot-password-view>`
      case '/notifications':
        return html`<ctzn-notifications-view id="view"></ctzn-notifications-view>`
      case '/communities':
        return html`<ctzn-communities-view id="view"></ctzn-communities-view>`
      case '/account':
        return html`<ctzn-account-view id="view"></ctzn-account-view>`
      case '/search':
        return html`<ctzn-search-view id="view"></ctzn-search-view>`
      case '/signup':
        return html`<ctzn-signup-view id="view"></ctzn-signup-view>`
    }
    if (POST_PATH_REGEX.test(this.currentPath)) {
      return html`<ctzn-post-view id="view" current-path=${this.currentPath}></ctzn-post-view>`
    }
    if (COMMENT_PATH_REGEX.test(this.currentPath)) {
      return html`<ctzn-post-view id="view" current-path=${this.currentPath}></ctzn-post-view>`
    }
    if (USER_PATH_REGEX.test(this.currentPath)) {
      return html`<ctzn-user-view id="view" current-path=${this.currentPath}></ctzn-user-view>`
    }
    return html`
      <main class="bg-gray-100 min-h-screen">
        <ctzn-header></ctzn-header>
        <div class="text-center py-48">
          <h2 class="text-5xl text-gray-600 font-semibold mb-4">404 Not Found</h2>
          <div class="text-lg text-gray-600 mb-4">No page exists at this URL.</div>
          <div class="text-lg text-gray-600">
            <a class="text-blue-600 hover:underline" href="/" title="Back to home">
              <span class="fas fa-arrow-left fa-fw"></span> Home</div>
            </a>
          </div>
        </div>
      </main>
    `
  }

  // events
  // =

  onGlobalClick (e) {
    if (e.defaultPrevented) {
      return
    }

    let anchor
    for (let el of e.composedPath()) {
      if (el.tagName === 'A') {
        anchor = el
      }
    }
    if (!anchor) return

    const href = anchor.getAttribute('href')
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) {
      e.preventDefault()
      this.navigateTo(url.pathname)
    }
  }

  onViewThread (e) {
    let [_, path] = e.detail.subject.dbUrl.split(DRIVE_KEY_REGEX)
    this.navigateTo(`/${e.detail.subject.authorId}${path}`)
  }

  async onHistoryPopstate (e) {
    this.currentPath = window.location.pathname
    if (e.state.scrollY) {
      this.targetScrollY = e.state.scrollY
      await this.updateComplete

      try {
        let view = this.querySelector('#view')
        view.pageLoadScrollTo(this.targetScrollY)
      } catch (e) {}
    }
  }
}

customElements.define('ctzn-app', CtznApp)