import { ref, onMounted, watch } from 'vue'

export function useTheme() {
    const isDark = ref(false)

    const updateTheme = () => {
        // Check if dark class is present on html element
        isDark.value = document.documentElement.classList.contains('dark')
    }

    onMounted(() => {
        updateTheme()

        // Watch for theme changes
        const observer = new MutationObserver(updateTheme)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })
    })

    return {
        isDark
    }
} 