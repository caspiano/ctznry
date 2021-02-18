import { LitElement, html } from '../vendor/lit-element/lit-element.js'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat.js'
import { ViewThreadPopup } from './com/popups/view-thread.js'
import { EditProfilePopup } from './com/popups/edit-profile.js'
import * as toast from './com/toast.js'
import { AVATAR_URL } from './lib/const.js'
import * as session from './lib/session.js'
import { getProfile, listFollowers, listFollows, listMembers, listMemberships } from './lib/getters.js'
import * as displayNames from './lib/display-names.js'
import { pluralize } from './lib/strings.js'
import './com/header.js'
import './com/button.js'
import './com/feed.js'
import './com/user-list.js'

class CtznUser extends LitElement {
  static get properties () {
    return {
      userProfile: {type: Object},
      currentView: {type: String},
      followers: {type: Array},
      following: {type: Array},
      memberships: {type: Array},
      members: {type: Array},
      isEmpty: {type: Boolean},
      isJoiningOrLeaving: {type: Boolean}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.userProfile = undefined
    this.currentView = 'feed'
    this.followers = undefined
    this.uniqFollowers = undefined
    this.following = undefined
    this.members = undefined
    this.isEmpty = false
    this.isJoiningOrLeaving = false

    this.userId = (new URL(location)).pathname.split('/')[1]
    if (location.hash === '#followers') {
      this.currentView = 'followers'
    }
    if (location.hash === '#following') {
      this.currentView = 'following'
    }
    window.addEventListener('popstate', e => {
      this.currentView = location.hash.slice(1) || 'feed'
    })

    this.load()
  }

  get isCitizen () {
    return this.userProfile?.dbType === 'ctzn.network/public-citizen-db'
  }

  get isCommunity () {
    return this.userProfile?.dbType === 'ctzn.network/public-community-db'
  }

  get amIFollowing () {
    return !!this.uniqFollowers?.find?.(id => id === session.info.userId)
  }

  get isFollowingMe () {
    return !!this.following?.find?.(f => f.value.subject.userId === session.info.userId)
  }

  get amIAMember () {
    return !!this.members?.find?.(m => m.value.user.userId === session.info.userId)
  }

  get userUrl () {
    return `${(new URL(location)).origin}/${this.userId}`
  }

  async load () {
    await session.setup()
    this.userProfile = await getProfile(this.userId).catch(e => ({error: true, message: e.toString()}))
    if (this.userProfile.error) {
      return this.requestUpdate()
    }
    if (this.isCitizen) {
      const [followers, following, memberships] = await Promise.all([
        listFollowers(this.userId),
        listFollows(this.userId),
        listMemberships(this.userId)
      ])
      this.followers = followers
      this.uniqFollowers = Array.from(getUniqFollowers(followers))
      this.following = following
      this.memberships = memberships
      console.log({userProfile: this.userProfile, followers, following, memberships})
    } else if (this.isCommunity) {
      this.members = await listMembers(this.userId)
      console.log({userProfile: this.userProfile, members: this.members})
    }
  }

  get isLoading () {
    let queryViewEls = Array.from(this.shadowRoot.querySelectorAll('ctzn-record-feed'))
    return !!queryViewEls.find(el => el.isLoading)
  }

  setView (str) {
    this.currentView = str
    if (str === 'feed') {
      history.pushState('', document.title, location.pathname + location.search)
    } else {
      history.pushState('', document.title, location.pathname + location.search + `#${str}`)
    }
  }

  // rendering
  // =

  render () {
    const nFollowing = this.following?.length || 0
    const nFollowers = this.uniqFollowers?.length || 0
    const nMembers = this.members?.length || 0
    const setView = (str) => e => {
      e.preventDefault()
      this.setView(str)
    }

    if (this.userProfile?.error) {
      return this.renderError()
    }

    const navCls = id => `
      text-center pt-2 pb-2.5 px-8 font-semibold cursor-pointer hover:bg-gray-50 hover:text-blue-600
      ${id === this.currentView ? 'border-b-2 border-blue-600 text-blue-600' : ''}
    `.replace('\n', '')
    
    return html`
      <main>
        <ctzn-header></ctzn-header>
        <div class="max-w-4xl mx-auto grid grid-cols-layout-twocol gap-8">
          <div class="relative">
            <div class="absolute" style="top: 8px; right: 10px">
              ${this.renderProfileControls()}
            </div>
            <div class="flex items-center py-4 px-4 border border-gray-300 border-t-0 border-b-0">
              <a href="/${this.userId}" title=${this.userProfile?.value.displayName} @click=${setView('feed')}>
                <img class="block mx-auto ml-2 mr-6 w-32 h-32 object-cover rounded-full shadow-md" src=${AVATAR_URL(this.userId)}>
              </a>
              <div class="flex-1">
                <h2 class="text-3xl font-semibold">
                  <a href="/${this.userId}" title=${this.userProfile?.value.displayName} @click=${setView('feed')}>
                    ${this.userProfile?.value.displayName}
                  </a>
                </h2>
                <h2 class="text-gray-500 font-semibold">
                  <a href="/${this.userId}" title="${this.userId}" @click=${setView('feed')}>
                    ${this.isCitizen ? html`<span class="fas fa-fw fa-user"></span>` : ''}
                    ${this.isCommunity ? html`<span class="fas fa-fw fa-users"></span>` : ''}
                    ${this.userId}
                  </a>
                </h2>
                ${this.userProfile?.value.description ? html`
                  <div class="mt-4">${this.userProfile?.value.description}</div>
                ` : ''}
              </div>
            </div>
            <div class="flex border border-gray-300 border-t-0 bg-white text-gray-400 sticky top-0 z-10">
              <a class="${navCls('feed')}" @click=${setView('feed')}>Feed</a>
              ${this.isCitizen ? html`
                <a class="${navCls('followers')}" @click=${setView('followers')}>${nFollowers} ${pluralize(nFollowers, 'Follower')}</a>
                <a class="${navCls('following')}" @click=${setView('following')}>${nFollowing} Following</a>
              ` : this.isCommunity ? html`
                <a class="${navCls('members')}" @click=${setView('members')}>${nMembers} ${pluralize(nMembers, 'Member')}</a>
              ` : ''}
            </div>
            ${this.renderCurrentView()}
          </div>
          <div>
            ${this.renderRightSidebar()}
          </div>
        </div>
      </main>
    `
  }

  renderError () {
    return html`
      <main class="bg-gray-100 min-h-screen">
        <ctzn-header></ctzn-header>
        <div class="text-center py-48">
          <h2 class="text-5xl text-gray-600 font-semibold mb-4">404 Not Found</h2>
          <div class="text-lg text-gray-600 mb-4">We couldn't find ${this.userId}</div>
          <div class="text-lg text-gray-600">
            <a class="text-blue-600 hover:underline" href="/" title="Back to home">
              <span class="fas fa-arrow-left fa-fw"></span> Home</div>
            </a>
          </div>
        </div>
      </main>
    `
  }

  renderProfileControls () {
    if (this.isCitizen) {
      return html`
        <div>
          ${session.isActive() ? html`
            ${session.info.userId === this.userId ? html`
              <ctzn-button btn-class="font-semibold px-5 py-1 rounded-full text-base" primary @click=${this.onClickEditProfile} label="Edit profile"></ctzn-button>
            ` : html`
              ${this.amIFollowing === true ? html`
                <ctzn-button btn-class="font-semibold px-5 py-1 rounded-full text-base" @click=${this.onClickUnfollow} label="Unfollow"></ctzn-button>
              ` : this.amIFollowing === false ? html`
                <ctzn-button btn-class="font-semibold px-6 py-1 rounded-full text-base" primary @click=${this.onClickFollow} label="Follow"></ctzn-button>
              ` : ``}
            `}
          ` : html`
            ${''/*TODO logged out UI*/}
          `}
        </div>
      `
    }
    if (this.isCommunity) {
      return html`
        <div>
          ${session.isActive() ? html`
            ${this.amIAMember === true ? html`
              <ctzn-button btn-class="font-semibold px-5 py-1 rounded-full text-base" @click=${this.onClickLeave} label="Leave" ?spinner=${this.isJoiningOrLeaving}></ctzn-button>
            ` : this.amIAMember === false ? html`
              <ctzn-button btn-class="font-semibold px-5 py-1 rounded-full text-base" primary @click=${this.onClickJoin} label="Join" ?spinner=${this.isJoiningOrLeaving}></ctzn-button>
            ` : ``}
          ` : html`
            ${''/*TODO logged out UI*/}
          `}
        </div>
      `
    }
  }

  renderRightSidebar () {
    if (this.isCitizen) {
      return this.renderCitizenRightSidebar()
    }
    if (this.isCommunity) {
      return this.renderCommunityRightSidebar()
    }
  }

  renderCitizenRightSidebar () {
    const nSharedFollowers = this.followers?.myFollowed?.length || 0
    const nMemberships = this.memberships?.length
    return html`
      <div class="pt-4 sticky top-0">
        <section class="mb-2">
          ${nSharedFollowers ? html`
            <div class="font-medium mb-1">Followed by</div>
            ${repeat(this.followers?.myFollowed, userId => html`
              <a class="inline-block bg-gray-100 rounded p-1 mr-.5 mb-.5 text-xs hover:bg-gray-200" href="/${userId}">${displayNames.render(userId)}</a>
            `)}
          ` : ''}
        </section>
        <section class="mb-2">
          ${nMemberships ? html`
            <div class="font-medium mb-1">Member of</div>
            ${repeat(this.memberships, membership => html`
              <a class="inline-block bg-gray-100 rounded p-1 mr-.5 mb-.5 text-xs hover:bg-gray-200" href="/${membership.value.community.userId}">${displayNames.render(membership.value.community.userId)}</a>
            `)}
          ` : html`
            <div class="py-2 px-3 text-sm text-gray-600 bg-gray-100">
              Not a member of any communities
            </div>
          `}
        </section>
      </div>
    `
  }

  renderCommunityRightSidebar () {
    return html`
      <div>
      </div>
    `
  }

  renderCurrentView () {
    if (!this.userProfile) {
      return ''
    }
    if (this.currentView === 'followers') {
      return html`
        <div class="border border-gray-300 border-t-0 p-2 bg-gray-50">
          <ctzn-user-list .ids=${this.uniqFollowers}></ctzn-user-list>
        </div>
      `
    } else if (this.currentView === 'following') {
      return html`
        <div class="border border-gray-300 border-t-0 p-2 bg-gray-50">
          <ctzn-user-list .ids=${this.following?.map(f => f.value.subject.userId)}></ctzn-user-list>
        </div>
      `      
    } else if (this.currentView === 'members') {
      return html`
        <div class="border border-gray-300 border-t-0 p-2 bg-gray-50">
          <ctzn-user-list .ids=${this.members?.map(f => f.value.user.userId)}></ctzn-user-list>
        </div>
      `      
    }
    return html`
      <div>
        ${this.isEmpty ? this.renderEmptyMessage() : ''}
        <ctzn-feed
          .source=${this.userId}
          limit="50"
          @load-state-updated=${this.onFeedLoadStateUpdated}
          @view-thread=${this.onViewThread}
          @publish-reply=${this.onPublishReply}
        ></ctzn-feed>
      </div>
    `
  }

  renderEmptyMessage () {
    return html`
      <div class="bg-gray-100 text-gray-500 py-44 text-center border border-t-0 border-gray-300">
        ${this.isCitizen ? html`
          <div>${this.userProfile?.value?.displayName} hasn't posted anything yet.</div>
        ` : this.isCommunity ? html`
          <div>Nobody has posted to ${this.userProfile?.value?.displayName} yet.</div>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  onFeedLoadStateUpdated (e) {
    if (typeof e.detail?.isEmpty !== 'undefined') {
      this.isEmpty = e.detail.isEmpty
    }
    this.requestUpdate()
  }

  async onClickEditProfile (e) {
    let newProfile = await EditProfilePopup.create(this.userId, AVATAR_URL(this.userId), this.userProfile.value)
    try {
      await session.api.profiles.put(newProfile.profile)
      this.userProfile.value = newProfile.profile
      if (newProfile.uploadedAvatar) {
        toast.create('Uploading avatar...')
        await session.api.profiles.putAvatar(newProfile.uploadedAvatar.base64buf)
      }
      toast.create('Profile updated', 'success')
      this.requestUpdate()

      if (newProfile.uploadedAvatar) {
        setTimeout(() => location.reload(), 1e3)
      }
    } catch (e) {
      toast.create(e.message, 'error')
      console.error(e)
    }
  }

  async onClickFollow (e) {
    await session.api.follows.follow(this.userId)
    this.followers = await listFollowers(this.userId)
    this.uniqFollowers = Array.from(getUniqFollowers(this.followers))
  }

  async onClickUnfollow (e) {
    await session.api.follows.unfollow(this.userId)
    this.followers = await listFollowers(this.userId)
    this.uniqFollowers = Array.from(getUniqFollowers(this.followers))
  }

  async onClickJoin (e) {
    try {
      this.isJoiningOrLeaving = true
      await session.api.communities.join(this.userId)
      this.members = await listMembers(this.userId)
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
    this.isJoiningOrLeaving = false
  }

  async onClickLeave (e) {
    try {
      this.isJoiningOrLeaving = true
      await session.api.communities.leave(this.userId)
      this.members = await listMembers(this.userId)
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
    this.isJoiningOrLeaving = false
  }

  onViewThread (e) {
    ViewThreadPopup.create({
      subject: e.detail.subject
    })
  }

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    this.load()
  }
}

customElements.define('ctzn-user', CtznUser)

function getUniqFollowers (followers) {
  return new Set(followers.community.concat(followers.myCommunity || []).concat(followers.myFollowed || []))
}