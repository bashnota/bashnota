import { defineComponent, h, computed } from 'vue'
import { cn } from '@/lib/utils'

const Progress = defineComponent({
  name: 'Progress',
  props: {
    value: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    class: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const percentage = computed(() => {
      return Math.min(100, Math.max(0, (props.value / props.max) * 100))
    })

    return () => h('div', {
      class: cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', props.class)
    }, [
      h('div', {
        class: 'h-full w-full flex-1 bg-primary transition-all',
        style: {
          transform: `translateX(-${100 - percentage.value}%)`
        }
      })
    ])
  }
})

export { Progress } 