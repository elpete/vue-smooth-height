import parseCssTransition from 'parse-css-transition'

// Vue specific object
const methods = {
    $registerElement(options) {
        console.warn('vue-smooth-height: $registerElement is deprecated. Use $smoothElement instead')
        this.$smoothElement(options)
    },
    $removeElementElement(options) {
        console.warn('vue-smooth-height: $removeElementElement is deprecated. Use $unsmoothElement instead')
        this.$unsmoothElement(options)
    },
    $registerSmoothElement(options) {
        console.warn('vue-smooth-height: $registerSmoothElement is deprecated. Use $smoothElement instead')
        this.$smoothElement(options)
    },
    $removeElementSmoothElement(options) {
        console.warn('vue-smooth-height: $removeElementSmoothElement is deprecated. Use $unsmoothElement instead')
        this.$unsmoothElement(options)
    },
    $smoothElement(options) {
        let _addElement = addElement.bind(this)
        if (Array.isArray(options)) 
            options.forEach(_addElement)
        else 
            _addElement(options)
    },
    $unsmoothElement(options) {
        let _removeElement = removeElement.bind(this)
        if (Array.isArray(options))
            options.forEach(_removeElement)
        else 
            _removeElement(options)
    },
    
}

// Vue lifecycle hook
function created() {
    this._smoothElements = []
}

// Vue lifecycle hook
function beforeUpdate() {
    if (!this._smoothElements || !this._smoothElements.length) 
        return
    this._smoothElements.forEach(e =>{
        let $el = select(this.$el, e.el)
        e.beforeUpdate(this.$el)
    })
}

// Vue lifecycle hook
function updated() {
    if (!this._smoothElements || !this._smoothElements.length) 
        return
    this._smoothElements.forEach(e => this.$nextTick(e.doSmoothReflow))
}

// 'this' is vue component
function addElement(option) {
    if (!option.el) {
        console.error('vue-smooth-height: Missing required property: "el"')
        return
    }
    let smoothEl = new SmoothElement(option)
    this._smoothElements.push(smoothEl)
}

// 'this' is vue component
function removeElement(option) {
    let root = this.$el
    let index = this._smoothElements.findIndex(d => {
        return select(root, d.el).isEqualNode(select(root, option.el))
    })
    if (index == -1) {
        console.error("vue-smooth-height: Remove smooth element failed due to invalid el option")
        return
    }
    this._smoothElements.splice(index, 1)
}

function select(rootEl, el) {
    if (typeof el === 'string')
        return rootEl.matches(el) ? rootEl : rootEl.querySelector(el)
    else 
        return el
}

const STATES = {
    BEFORE_UPDATE: 0,
    UPDATED: 1,
    ENDED: 2,
    INTERRUPTED: 3
}

class SmoothElement {
    constructor(options) {
        Object.assign(this,{
            el: null, // User given argument. Element or selector string
            $el: null,// Resolved Element
            hideOverflow: false,
            debug: false,
            hasExistingHeightTransition: false,
            state: STATES.START,
        })
        Object.assign(this, options)
    }
    transition(to) {
        this.state = to
    }
    endListener(e) {
        if (e.currentTarget !== e.target || e.propertyName !== 'height')
            return
        this.stopTransition()
    }
    beforeUpdate($el) {
        if (!$el) {
            return
        }
        this.$el = $el
        let height = window.getComputedStyle($el)['height']
        this.beforeHeight = height
        if (this.state === STATES.IN_PROGRESS) {
            this.stopTransition()
            this.log('Transition was interrupted.')
        }
        this.transition(STATES.IN_PROGRESS)
    }
    doSmoothReflow() {
        if (!this.$el) {
            return
        }
        let { $el, beforeHeight, hideOverflow, debug } = this
    
        let computedStyle = window.getComputedStyle($el)
        let afterHeight = computedStyle['height']
        if (beforeHeight == afterHeight) {
            this.transition(STATES.ENDED)
            option.log(`Element height did not change between render.`)
            return
        }
        this.log(`Previous height: ${beforeHeight} Current height: ${afterHeight}`)
    
        let transition = computedStyle.transition
        parsedTransition = parseCssTransition(transition)
        if (this.hasHeightTransition(parsedTransition)) {
            this.hasExistingHeightTransition = true
        } else {
            this.hasExistingHeightTransition = false
            this.addHeightTransition(parsedTransition)
        }
    
        if (hideOverflow) {
            //save overflow properties before overwriting
            let overflowY = computedStyle.overflowY,
                overflowX = computedStyle.overflowX
    
            this.overflowX = overflowX
            this.overflowY = overflowY
    
            $el.style.overflowX = 'hidden'
            $el.style.overflowY = 'hidden'
        }
    
        $el.style['height'] = beforeHeight
        $el.offsetHeight // Force reflow
        $el.style['height'] = afterHeight
        $el.addEventListener('transitionend', this.endListener, { passive: true })
    }
    hasHeightTransition(parsedTransition) {
        return parsedTransition.find(t => {
            return ['all','height'].includes(t.name) && t.duration > 0
        })
    }
    // Delay and Duration are in milliseconds
    // Add height transition to existing transitions.
    addHeightTransition(parsedTransition) {
        let transitions = parsedTransition.map(t => {
            return `${t.name} ${t.duration}ms ${t.timingFunction} ${t.delay}ms`
        })
        this.$el.style.transition = transitions.join(',') + ',height 1s'
    }
    stopTransition() {
        let { 
            $el, hideOverflow, overflowX, overflowY,
            hasExistingHeightTransition,
        } = this
    
        $el.style['height'] = null // Change height back to auto
        if (hideOverflow) {
            // Restore original overflow properties
            $el.style.overflowX = overflowX
            $el.style.overflowY = overflowY
        }
        // Clean up inline transition
        if (!hasExistingHeightTransition) {
            $el.style.transition = null
        }
        $el.removeEventListener('transitionend', this.endListener)
        this.transition(STATES.ENDED)
    }
    log(text) {
        if (this.debug)
            console.log(`VSM_DEBUG: ${text}`)
    }
}


export default {
    methods,
    created,
    beforeUpdate,
    updated,
}
