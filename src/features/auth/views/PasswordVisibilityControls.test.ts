import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from './LoginView.vue'
import RegisterView from './RegisterView.vue'

const doubles = vi.hoisted(() => ({
  push: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    loginWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
    register: vi.fn(),
    resetPassword: doubles.resetPassword,
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: doubles.push }),
}))

describe('password visibility controls', () => {
  beforeEach(() => {
    doubles.push.mockReset()
    doubles.resetPassword.mockReset()
    localStorage.clear()
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('labels, focuses, and updates the login password control in both states', async () => {
    const wrapper = mount(LoginView, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    })
    const password = wrapper.get('#password')
    const reveal = wrapper.get('button[aria-controls="password"]')

    expect(password.attributes('type')).toBe('password')
    expect(reveal.attributes()).toMatchObject({
      'aria-label': 'Show password',
      'aria-pressed': 'false',
    })

    const revealElement = reveal.element as HTMLButtonElement
    revealElement.focus()
    expect(document.activeElement).toBe(revealElement)

    await reveal.trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(reveal.attributes()).toMatchObject({
      'aria-label': 'Hide password',
      'aria-pressed': 'true',
    })
    wrapper.unmount()
  })

  it('labels, focuses, and updates the registration password controls in both states', async () => {
    const wrapper = mount(RegisterView, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    })
    const password = wrapper.get('#password')
    const confirmation = wrapper.get('#confirmPassword')
    const reveal = wrapper.get('button[aria-controls="password"]')
    const revealConfirmation = wrapper.get('button[aria-controls="confirmPassword"]')

    expect(password.attributes('type')).toBe('password')
    expect(confirmation.attributes('type')).toBe('password')
    expect(reveal.attributes()).toMatchObject({
      'aria-label': 'Show password',
      'aria-pressed': 'false',
    })
    expect(revealConfirmation.attributes()).toMatchObject({
      'aria-label': 'Show confirmation password',
      'aria-pressed': 'false',
    })

    const revealElement = reveal.element as HTMLButtonElement
    const revealConfirmationElement = revealConfirmation.element as HTMLButtonElement
    revealElement.focus()
    expect(document.activeElement).toBe(revealElement)
    revealConfirmationElement.focus()
    expect(document.activeElement).toBe(revealConfirmationElement)

    await reveal.trigger('click')
    await revealConfirmation.trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(confirmation.attributes('type')).toBe('text')
    expect(reveal.attributes()).toMatchObject({
      'aria-label': 'Hide password',
      'aria-pressed': 'true',
    })
    expect(revealConfirmation.attributes()).toMatchObject({
      'aria-label': 'Hide confirmation password',
      'aria-pressed': 'true',
    })
    wrapper.unmount()
  })
})
