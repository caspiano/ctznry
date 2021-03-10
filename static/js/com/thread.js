import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as toast from './toast.js'
import { getPost, getComment, getThread } from '../lib/getters.js'
import { emit } from '../lib/dom.js'
import * as session from '../lib/session.js'
import * as displayNames from '../lib/display-names.js'
import './post-expanded.js'
import './comment.js'
import './comment-composer.js'

export class Thread extends LitElement {
  static get properties () {
    return {
      subject: {type: Object},
      isFullPage: {type: Boolean, attribute: 'full-page'},
      setDocumentTitle: {type: Boolean, attribute: 'set-document-title'},
      post: {type: Object},
      thread: {type: Array},
      isReplying: {type: Boolean}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.subject = undefined
    this.isFullPage = false
    this.setDocumentTitle = false
    this.replyCount = 0
    this.post = undefined
    this.thread = undefined
    this.isReplying = false
    this.isLoading = false
  }

  reset () {
    this.post = undefined
    this.thread = undefined
    this.replyCount = 0
  }

  get subjectSchemaId () {
    const urlp = new URL(this.subject.dbUrl)
    const pathParts = urlp.pathname.split('/')
    return pathParts.slice(3, -1).join('/')
  }

  async load () {
    this.isLoading = true
    // this.reset() TODO causes a flash of the loading spinner, needed?
    console.log('loading', this.subject)
    const onError = e => ({
      error: true,
      message: e.toString()
    })
    if (this.subject.dbUrl.includes('ctzn.network/comment')) {
      let comment = await getComment(this.subject.authorId, this.subject.dbUrl).catch(onError)
      if (comment.error) {
        this.post = comment
      } else {
        this.post = await getPost(comment.value.reply.root.authorId, comment.value.reply.root.dbUrl).catch(onError)
        this.thread = await getThread(
          comment.value.reply.root.authorId,
          comment.value.reply.root.dbUrl,
          comment.value.community?.userId
        ).catch(onError)
      }
    } else {
      this.post = await getPost(this.subject.authorId, this.subject.dbUrl).catch(onError)
      this.thread = await getThread(
        this.subject.authorId,
        this.subject.dbUrl,
        this.post.value.community?.userId
      ).catch(onError)
    }
    await this.updateComplete
    emit(this, 'load')
    console.log(this.post)
    console.log(this.thread)
    this.isLoading = false
  }

  updated (changedProperties) {
    if (typeof this.post === 'undefined' && !this.isLoading) {
      this.load()
    } else if (changedProperties.has('subject') && changedProperties.get('subject') != this.subject) {
      this.load()
    }
  }

  scrollHighlightedPostIntoView () {
    try {
      this.querySelector('.highlight').scrollIntoView()
    } catch (e) { /* ignore */ }
  }

  // rendering
  // =

  render () {
    return html`
      <div class="border-t border-b sm:border-l sm:border-r mb-1 border-gray-200 bg-white sm:rounded">
        ${this.post ? html`
          <ctzn-post-expanded
            .post=${this.post}
            hover-bg-color=${this.subject.dbUrl === this.post?.url ? 'indigo-100' : 'gray-50'}
            noborders
            view-content-on-click
            @delete-post=${this.onDeletePost}
            @moderator-remove-post=${this.onModeratorRemovePost}
          ></ctzn-post-expanded>
        ` : html`
          <span class="spinner"></span>
        `}
      </div>
      ${this.post ? this.renderCommentBox() : ''}
      ${this.thread ? this.renderReplies(this.thread) : ''}
    `
  }

  renderReplies (replies) {
    if (replies?.error) {
      if (this.post?.error) {
        return ''
      }
      return html`
        <div class="pl-3 py-2 border-l border-gray-200 mx-2 sm:mx-0">
          <div class="font-semibold text-gray-500">
            <span class="fas fa-fw fa-exclamation-circle"></span>
            Failed to load thread
          </div>
          ${replies.message ? html`
            <div class="pl-6 text-sm text-gray-400">
              ${replies.message}
            </div>
          ` : ''}
        </div>
      `
    }
    if (!replies?.length) return ''
    return html`
      <div class="pl-3 border-l-2 border-gray-200 mx-2 sm:mx-0">
        ${repeat(replies, r => r.url, reply => {
          const isSubject = this.subject.dbUrl === reply.url
          return html`
            <div class="mb-1 ${isSubject ? 'highlight bg-indigo-50' : ''}">
              <ctzn-comment
                .comment=${reply}
                @publish-reply=${this.onPublishReply}
                @delete-comment=${this.onDeleteComment}
                @moderator-remove-comment=${this.onModeratorRemoveComment}
              ></ctzn-comment>
            </div>
            ${reply.replies?.length ? this.renderReplies(reply.replies) : ''}
          `
        })}
      </div>
    `
  }

  renderCommentBox () {
    if (this.post?.error) {
      return ''
    }
    if (this.post?.value?.community) {
      if (!session.isInCommunity(this.post.value.community.userId)) {
        return html`
          <div class="bg-white border border-gray-200 py-2 px-3 my-2 rounded mx-2 sm:mx-0">
            <div class="italic text-gray-500 text-sm">
              Join <a href="/${this.post.value.community.userId}" class="hover:underline">${displayNames.render(this.post.value.community.userId)}</a> to reply.
            </div>
          </div>
        `
      }
    } else {
      if (!session.isFollowingMe(this.post?.author?.userId)) {
        return html`
          <div class="bg-white border border-gray-200 py-2 px-3 my-2 rounded mx-2 sm:mx-0">
            <div class="italic text-gray-500 text-sm">
              Only people followed by <a href="/${this.post.author.userId}" class="hover:underline">${this.post.author.displayName}</a> can reply.
            </div>
          </div>
        `
      }
    }
    return html`
      <div class="bg-white border border-gray-200 py-3 px-3 my-2 rounded mx-2 sm:mx-0">
        ${this.isReplying ? html`
          <ctzn-comment-composer
            autofocus
            .community=${this.post.value.community}
            .subject=${{dbUrl: this.post.url, authorId: this.post.author.userId}}
            placeholder="Write your comment"
            @publish=${this.onPublishReply}
            @cancel=${this.onCancelReply}
          ></ctzn-comment-composer>
        ` : html`
          <div class="cursor-text italic text-gray-500" @click=${this.onStartReply}>
            Write your comment
          </div>
        `}
      </div>
    `
  }

  // events
  // =

  onStartReply (e) {
    this.isReplying = true
  }

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    this.load()
    this.isReplying = false
  }

  onCancelReply (e) {
    this.isReplying = false
  }

  async onDeletePost (e) {
    try {
      await session.api.posts.del(e.detail.post.key)
      toast.create('Post deleted')
      this.load()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onDeleteComment (e) {
    try {
      await session.api.comments.del(e.detail.comment.key)
      toast.create('Comment deleted')
      this.load()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onModeratorRemovePost (e) {
    try {
      const post = e.detail.post
      await session.api.communities.removePost(post.value.community.userId, post.url)
      this.load()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onModeratorRemoveComment (e) {
    try {
      const comment = e.detail.comment
      await session.api.communities.removeComment(
        comment.value.community.userId,
        comment.value.reply.root.dbUrl,
        comment.url
      )
      this.load()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('ctzn-thread', Thread)