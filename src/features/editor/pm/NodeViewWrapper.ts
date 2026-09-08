import { defineComponent, h } from 'vue'

/**
 * Small replacement for the wrapper component used by the existing block
 * views. ProseMirror owns the outer node-view DOM; this component only provides
 * the inner element and the stable data attribute the block CSS relies on.
 */
export const NodeViewWrapper = defineComponent({
  name: 'NodeViewWrapper',
  inheritAttrs: false,
  props: {
    as: { type: String, default: 'div' },
  },
  setup(props, { attrs, slots }) {
    return () => h(props.as, { ...attrs, 'data-node-view-wrapper': '' }, slots.default?.())
  },
})

export default NodeViewWrapper
