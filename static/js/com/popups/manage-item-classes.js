/* globals beaker */
import { html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import { BasePopup } from './base.js'
import * as session from '../../lib/session.js'
import * as images from '../../lib/images.js'
import { ITEM_CLASS_ICON_URL } from '../../lib/const.js'
import '../button.js'

// exported api
// =

export class ManageItemClasses extends BasePopup {
  static get properties () {
    return {
      communityId: {type: String},
      itemClasses: {type: Array},
      isProcessing: {type: Boolean},
      currentError: {type: String},
      isCreatingNew: {type: Boolean},
      itemClassBeingEdited: {type: String}
    }
  }

  constructor (opts) {
    super()
    this.communityId = opts.communityId
    this.itemClasses = opts.itemClasses
    this.isProcessing = false
    this.currentError = undefined
    this.isCreatingNew = false
    this.itemClassBeingEdited = undefined
  }

  async reload () {
    this.itemClasses = await session.ctzn.db(this.communityId).table('ctzn.network/item-class').list()
    console.log(this.itemClasses)
  }

  get shouldShowHead () {
    return false
  }

  get shouldCloseOnEscape () {
    return false
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  get maxWidth () {
    return '520px'
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(ManageItemClasses, opts)
  }

  static destroy () {
    return BasePopup.destroy('manage-item-classes-popup')
  }

  // rendering
  // =

  renderBody () {
    if (this.isCreatingNew) {
      return html`
      <div class="px-2">
        <h2 class="text-3xl py-4">Item classes</h2>

        <section class="border border-gray-200 rounded p-3 mb-2">
          <div class="font-bold mb-2 text-lg">New Item Class</div>
          <div class="mb-3 text-gray-600">What kind of item will this be?</div>
          <div class="flex items-baseline mb-2">
            <input
              id="item-type-unique"
              type="radio"
              name="item-type"
              value="unique"
              class="mx-2"
              checked
            >
            <label for="item-type-unique" class="text-gray-600">
              <strong class="font-semibold text-black">Unique.</strong>
              Each item is distinct from others.
              Examples of unique items: a virtual pet, a user award, or a license to some piece of art.
            </label>
          </div>
          <div class="flex items-baseline mb-4">
            <input
              id="item-type-fungible"
              type="radio"
              name="item-type"
              value="fungible"
              class="mx-2"
            >
            <label for="item-type-fungible" class="text-gray-600">
              <strong class="font-semibold text-black">Fungible.</strong>
              The items are basically interchangeable.
              Examples of fungible items: points in a game, currency, or a stock of similar items (sodas, chairs).
            </label>
          </div>
          <div class="flex">
            <ctzn-button
              btn-class="px-3 py-1"
              @click=${this.onCancelEdit}
              label="Cancel"
            ></ctzn-button>
            <span class="flex-1"></span>
            <ctzn-button
              primary
              btn-class="px-3 py-1"
              @click=${this.onSelectNewTemplate}
              label="Next"
            ></ctzn-button>
          </div>
        </section>

        <div class="flex border-t border-gray-200 mt-4 pt-4">
          <ctzn-button disabled label="+ New Item Class"></ctzn-button>
          <span class="flex-1"></span>
          <ctzn-button disabled label="Close"></ctzn-button>
        </div>
      </div>
      `
    }
    if (this.itemClassBeingEdited) {
      const cls = this.itemClassBeingEdited
      console.log(cls)
      let iconUrl = this.uploadedIcon
      if (!iconUrl && cls.value.iconBlobName) {
        iconUrl = ITEM_CLASS_ICON_URL(this.communityId, cls.value.id)
      }
      if (!iconUrl) {
        iconUrl = '/img/default-item-icon.svg'
      }
      return html`
        <div class="px-2">
          <h2 class="text-3xl py-4">Item classes</h2>
  
          <form class="border border-gray-200 rounded p-3 mb-2" @submit=${this.onSubmitEdit}>
            <label class="block font-semibold p-1" for="id-input">Class ID</label>
            <input
              required
              type="text"
              id="id-input"
              name="id"
              value="${cls.value.id}"
              class="block box-border w-full border border-gray-300 rounded p-3 mb-2"
              placeholder="E.g. moneybucks, cat, award"
              ?disabled=${!cls.isNew}
            />
            <label class="block font-semibold p-1" for="displayName-input">Display Name</label>
            <input
              type="text"
              id="displayName-input"
              name="displayName"
              value="${cls.value.displayName || ''}"
              class="block box-border w-full border border-gray-300 rounded p-3 mb-2"
              placeholder="Optional"
            />
            <label class="block font-semibold p-1">Icon</label>
            <div class="border border-gray-300 flex items-center px-2 py-2 mb-2 rounded cursor-pointer hover:bg-gray-50" @click=${this.onClickIcon}>
              <img
                class="block rounded w-10 h-10 mr-2 object-cover"
                src=${iconUrl} 
              >
              <div class="text-sm text-gray-500">Should target 16x16 and 32x32, SVG is recommended.</div>
            </div>
            <input id="icon-file-input" class="hidden" type="file" accept=".svg,.jpg,.jpeg,.png" @change=${this.onChooseIconFile}>
            <label class="block font-semibold p-1" for="description-input">Description</label>
            <textarea
              type="text"
              id="description-input"
              name="description"
              class="block box-border w-full border border-gray-300 rounded p-3 mb-2"
              placeholder="Optional"
            >${cls.value.description || ''}</textarea>
            <label class="block font-semibold p-1" for="keyTemplate-input">Key template</label>
            <input
              required
              type="text"
              id="keyTemplate-input"
              name="keyTemplate"
              value="${JSON.stringify(cls.value.keyTemplate)}"
              class="block box-border w-full border border-gray-300 rounded p-3 mb-2"
              placeholder=${`[{"type": "auto"}]`}
              ?disabled=${!cls.isNew}
            />
            <label class="block font-semibold p-1" for="definition-input">Properties schema</label>
            <textarea
              id="definition-input"
              name="definition"
              class="block box-border w-full border border-gray-300 rounded p-3 mb-2"
              placeholder="Optional"
            >${JSON.stringify(cls.value.definition, null, 2)}</textarea>

            ${this.currentError ? html`
              <div class="bg-red-100 px-6 py-4 mb-4 text-red-600">${this.currentError}</div>
            ` : ''}

            <div class="flex">
              <ctzn-button
                btn-class="px-3 py-1"
                @click=${this.onCancelEdit}
                label="Cancel"
                ?disabled=${this.isProcessing}
                ?spinner=${this.isProcessing}
              ></ctzn-button>
              <span class="flex-1"></span>
              <ctzn-button
                primary
                btn-type="submit"
                btn-class="px-3 py-1"
                label="Save"
                ?disabled=${this.isProcessing}
                ?spinner=${this.isProcessing}
              ></ctzn-button>
            </div>
          </form>
  
          <div class="flex border-t border-gray-200 mt-4 pt-4">
            <ctzn-button disabled label="+ New Item Class"></ctzn-button>
            <span class="flex-1"></span>
            <ctzn-button disabled label="Close"></ctzn-button>
          </div>
        </div>
      `
    }
    return html`
      <div class="px-2">
        <h2 class="text-3xl py-4">Item classes</h2>

        ${this.itemClasses.length === 0 ? html`
          <section class="border border-gray-200 rounded p-3 mb-2 bg-gray-50">
            No item classes have been created yet.
          </section>
        ` : ''}
        ${repeat(this.itemClasses, (itemClass, i) => html`
          <div class="flex items-center border-gray-200 border-l border-r border-b ${i === 0 ? 'rounded-t border-t' : ''} ${i === this.itemClasses.length - 1 ? 'rounded-b' : ''} p-3">
            <span class="font-semibold">${itemClass.value.id}</span>
            <span class="flex-1"></span>
            <ctzn-button
              btn-class="text-red-600 px-3 py-0.5"
              transparent
              @click=${e => this.onClickDelete(e, i)}
              label="Delete"
            ></ctzn-button>
            <ctzn-button
              btn-class="px-3 py-0.5 ml-2"
              @click=${e => this.onClickEdit(e, i)}
              label="Edit"
            ></ctzn-button>
          </div>
        `)}

        ${this.currentError ? html`
          <div class="bg-red-100 px-6 py-4 my-4 text-red-600">${this.currentError}</div>
        ` : ''}

        <div class="flex border-t border-gray-200 mt-4 pt-4">
          <ctzn-button
            @click=${this.onClickNew}
            label="+ New Item Class"
            ?disabled=${this.isProcessing}
            ?spinner=${this.isProcessing}
          ></ctzn-button>
          <span class="flex-1"></span>
          <ctzn-button
            @click=${this.onReject}
            label="Close"
            ?disabled=${this.isProcessing}
            ?spinner=${this.isProcessing}
          ></ctzn-button>
        </div>
      </div>
    `
  }

  // events
  // =

  onCancelEdit (e) {
    this.isCreatingNew = false
    this.itemClassBeingEdited = false
  }

  onClickNew (e) {
    this.isCreatingNew = true
  }

  onClickEdit (e, index) {
    this.itemClassBeingEdited = this.itemClasses[index]
  }

  async onClickDelete (e, index) {
    const cls = this.itemClasses[index]
    if (!confirm(`Are you sure you want to delete "${cls.value.id}"?`)) {
      return
    }
    if (!confirm(`Deletion will freeze any existing items of that class, are you absolute sure?`)) {
      return
    }
    
    this.isProcessing = true
    this.currentError = undefined
    try {
      await session.ctzn.db(this.communityId).method('ctzn.network/delete-item-class-method', {
        classId: cls.value.id
      })
    } catch (e) {
      this.currentError = e.message || e.data || e.toString()
      this.isProcessing = false
      return
    }

    await this.reload()
    this.isProcessing = false
  }

  onSelectNewTemplate (e) {
    let keyTemplate = [{type: 'auto'}]
    if (this.querySelector('input[name="item-type"]:checked').value === 'fungible') {
      keyTemplate = [{type: 'json-pointer', value: '/owner/userId'}]
    }
    this.itemClassBeingEdited = {
      isNew: true,
      key: undefined,
      value: {
        id: '',
        keyTemplate,
        definition: undefined,
        createdAt: undefined
      }
    }
    this.isCreatingNew = false
  }

  onClickIcon (e) {
    e.preventDefault()
    this.querySelector('#icon-file-input').click()
  }

  onChooseIconFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      this.uploadedIcon = fr.result
      this.requestUpdate()
    }
    fr.readAsDataURL(file)
  }

  async onSubmitEdit (e) {
    e.preventDefault()
    e.stopPropagation()

    const isNew = this.itemClassBeingEdited.isNew
    this.isProcessing = true
    this.currentError = undefined

    const formData = new FormData(e.currentTarget)
    const value = Object.fromEntries(formData.entries())

    if (!/^([a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])$/.test(value.id)) {
      this.currentError = `Invalid ID: Must only include a-z, 0-9, or dash, and start with a character`
      this.isProcessing = false
      return
    }

    if (isNew) {
      try {
        value.keyTemplate = JSON.parse(value.keyTemplate)
      } catch (e) {
        this.currentError = `Invalid key template: ${e.toString()}`
        this.isProcessing = false
        return
      }
    }

    if (value.definition) {
      try {
        value.definition = JSON.parse(value.definition)
      } catch (e) {
        this.currentError = `Invalid properties schema: ${e.toString()}`
        this.isProcessing = false
        return
      }
    } else {
      value.definition = undefined
    }
    
    try {
      let iconSource
      if (this.uploadedIcon) {
        let {base64buf} = images.parseDataUrl(this.uploadedIcon)
        let blobRes
        try {
          blobRes = await session.ctzn.blob.create(base64buf)
        } catch (err) {
          this.currentError = err.toString()
          this.isProcessing = false
          return
        }
        iconSource = {
          userId: session.info.userId,
          dbUrl: session.info.dbUrl,
          blobName: blobRes.name
        }
      }

      if (isNew) {
        console.log('create:', {classId: value.id,
          keyTemplate: value.keyTemplate,
          iconSource,
          displayName: value.displayName,
          description: value.description,
          definition: value.definition
        })
        await session.ctzn.db(this.communityId).method('ctzn.network/create-item-class-method', {
          classId: value.id,
          keyTemplate: value.keyTemplate,
          iconSource,
          displayName: value.displayName,
          description: value.description,
          definition: value.definition
        })
      } else {
        let updates = {}
        for (let k of ['displayName', 'description', 'definition']) {
          if (value[k] !== this.itemClassBeingEdited.value[k]) {
            updates[k] = value[k]
          }
        }
        if (iconSource) updates.iconSource = iconSource
        if (Object.keys(iconSource).length) {
          console.log('Update:', updates)
          await session.ctzn.db(this.communityId).method('ctzn.network/update-item-class-method', {
            classId: this.itemClassBeingEdited.value.id,
            ...updates
          })
        }
      }
    } catch (e) {
      this.currentError = e.message || e.data || e.toString()
      this.isProcessing = false
      return
    }

    await this.reload()

    this.isProcessing = false
    this.itemClassBeingEdited = false
    this.isCreatingNew = false
  }
}

customElements.define('manage-item-classes-popup', ManageItemClasses)