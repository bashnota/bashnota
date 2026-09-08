import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from './LoginView.vue'
import OAuthCallbackView from './OAuthCallbackView.vue'
import PasswordResetView from './PasswordResetView.vue'
import ProfileView from './ProfileView.vue'
import RegisterView from './RegisterView.vue'
import { useAuthStore } from '@/features/auth/stores/auth'

const doubles = vi.hoisted(() => ({
  auth: {
    completeOAuthCallback: vi.fn(),
    currentSession: vi.fn(),
    loginWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    mapSessionToProfile: vi.fn(),
    onAuthStateChange: vi.fn(),
    register: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
  },
  replace: vi.fn(async () => undefined),
  push: vi.fn(async () => undefined),
  toast: vi.fn(),
}))

vi.mock('@/features/auth/services/supabaseAuth', () => ({
  supabaseAuthService: doubles.auth,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: doubles.push, replace: doubles.replace }),
}))

vi.mock('vue-sonner', () => ({ toast: doubles.toast }))

const profile = {
  uid: 'user-1',
  email: 'reader@example.test',
  displayName: 'Reader',
  photoURL: '',
  emailVerified: true,
  createdAt: '',
  lastLoginAt: '',
  userTag: 'reader',
}
const session = { user: { id: 'user-1' } }

function mountView(
  component:
    | typeof LoginView
    | typeof OAuthCallbackView
    | typeof PasswordResetView
    | typeof RegisterView,
) {
  return mount(component, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

function mountProfile() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAuthStore(pinia)
  store.user = profile
  const wrapper = mount(ProfileView, {
    global: {
      plugins: [pinia],
      stubs: { UserTagEditor: true },
    },
  })
  return { store, wrapper }
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
  const found = wrapper.findAll('button').find((candidate) => candidate.text().includes(label))
  if (!found) throw new Error(`Missing ${label} button`)
  return found
}

async function fillLogin(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('#email').setValue('reader@example.test')
  await wrapper.get('#password').setValue('secret1')
}

async function fillRegistration(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('#name').setValue('Reader')
  await wrapper.get('#email').setValue('reader@example.test')
  await wrapper.get('#password').setValue('secret1')
  await wrapper.get('#confirmPassword').setValue('secret1')
}

describe('authentication feedback flows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    doubles.auth.loginWithEmail.mockResolvedValue(session)
    doubles.auth.loginWithGoogle.mockResolvedValue(null)
    doubles.auth.register.mockResolvedValue(session)
    doubles.auth.resetPassword.mockResolvedValue(undefined)
    doubles.auth.completeOAuthCallback.mockResolvedValue(session)
    doubles.auth.updatePassword.mockResolvedValue(undefined)
    doubles.auth.mapSessionToProfile.mockResolvedValue(profile)
    doubles.auth.currentSession.mockResolvedValue(null)
    doubles.auth.logout.mockResolvedValue(undefined)
    doubles.auth.onAuthStateChange.mockReturnValue(() => undefined)
    localStorage.clear()
    window.history.replaceState({}, '', '/login')
  })

  it('renders one accessible actionable error for a failed login and clears it on a successful retry', async () => {
    doubles.auth.loginWithEmail.mockRejectedValueOnce(new Error('Incorrect email or password.'))
    const wrapper = mountView(LoginView)
    await fillLogin(wrapper)

    await button(wrapper, 'Sign In').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Incorrect email or password.')
    expect(wrapper.get('[role="alert"]').text()).toContain('try again')
    expect(doubles.toast).not.toHaveBeenCalled()

    await button(wrapper, 'Sign In').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.push).toHaveBeenCalledWith('/')
  })

  it('shows the shared error boundary when Google sign-in fails', async () => {
    doubles.auth.loginWithGoogle.mockRejectedValueOnce(new Error('Google is unavailable.'))
    const wrapper = mountView(LoginView)

    await button(wrapper, 'Sign in with Google').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Google is unavailable.')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('completes Google sign-in without an error or duplicate toast', async () => {
    doubles.auth.loginWithGoogle.mockResolvedValueOnce(session)
    const wrapper = mountView(LoginView)

    await button(wrapper, 'Sign in with Google').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.push).toHaveBeenCalledWith('/')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('shows the shared error boundary when registration fails', async () => {
    doubles.auth.register.mockRejectedValueOnce(new Error('That email is already registered.'))
    const wrapper = mountView(RegisterView)
    await fillRegistration(wrapper)

    await button(wrapper, 'Create Account').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('That email is already registered.')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('completes registration without an error or duplicate toast', async () => {
    const wrapper = mountView(RegisterView)
    await fillRegistration(wrapper)

    await button(wrapper, 'Create Account').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.push).toHaveBeenCalledWith('/')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('shows the shared error boundary when registration with Google fails', async () => {
    doubles.auth.loginWithGoogle.mockRejectedValueOnce(new Error('Google sign-up is unavailable.'))
    const wrapper = mountView(RegisterView)

    await button(wrapper, 'Sign up with Google').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Google sign-up is unavailable.')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('only announces password-reset success when the store returns true', async () => {
    const wrapper = mountView(LoginView)
    await wrapper.get('#email').setValue('reader@example.test')
    const store = useAuthStore()
    const reset = vi.spyOn(store, 'resetPassword')

    reset.mockResolvedValueOnce(false)
    await button(wrapper, 'Forgot password?').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    reset.mockRejectedValueOnce(new Error('Reset service is unavailable.'))
    await button(wrapper, 'Forgot password?').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('Reset service is unavailable.')

    reset.mockResolvedValueOnce(true)
    await button(wrapper, 'Forgot password?').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Password reset email sent')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('renders password-update failures through the same boundary', async () => {
    window.history.replaceState({}, '', '/auth/reset-password?code=recovery-code')
    doubles.auth.updatePassword.mockRejectedValueOnce(new Error('Recovery session expired.'))
    const wrapper = mountView(PasswordResetView)
    await flushPromises()
    await wrapper.get('#new-password').setValue('secret1')
    await wrapper.get('#confirm-password').setValue('secret1')

    await button(wrapper, 'Update password').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Recovery session expired.')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('completes a password update without an error or duplicate toast', async () => {
    window.history.replaceState({}, '', '/auth/reset-password?code=recovery-code')
    const wrapper = mountView(PasswordResetView)
    await flushPromises()
    await wrapper.get('#new-password').setValue('secret1')
    await wrapper.get('#confirm-password').setValue('secret1')

    await button(wrapper, 'Update password').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.replace).toHaveBeenCalledWith('/profile')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('shows Profile reset failure, then clears it and announces only a true retry', async () => {
    const { store, wrapper } = mountProfile()
    const reset = vi.spyOn(store, 'resetPassword')
    reset.mockResolvedValueOnce(false)

    await button(wrapper, 'Reset Password').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Password reset email could not be sent.')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    reset.mockResolvedValueOnce(true)
    await button(wrapper, 'Reset Password').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('Password reset email sent')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('keeps the authenticated profile in place when sign-out fails', async () => {
    const { store, wrapper } = mountProfile()
    vi.spyOn(store, 'logout').mockImplementationOnce(async () => {
      store.error = 'Sign out service is unavailable.'
      return false
    })

    await button(wrapper, 'Logout').trigger('click')
    await flushPromises()

    expect(store.user).toEqual(profile)
    expect(doubles.push).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Sign out service is unavailable.')
    expect(button(wrapper, 'Logout').attributes('disabled')).toBeUndefined()
  })

  it('preserves store authentication when the provider rejects sign-out', async () => {
    const store = useAuthStore()
    store.user = profile
    doubles.auth.logout.mockRejectedValueOnce(new Error('provider sign-out failed'))

    await expect(store.logout()).resolves.toBe(false)

    expect(store.user).toEqual(profile)
    expect(store.error).toBe('provider sign-out failed')
  })

  it('routes away only after sign-out succeeds', async () => {
    const { store, wrapper } = mountProfile()
    vi.spyOn(store, 'logout').mockResolvedValueOnce(true)

    await button(wrapper, 'Logout').trigger('click')
    await flushPromises()

    expect(doubles.push).toHaveBeenCalledWith('/')
  })

  it('labels and persists the email-only preference without implying session behavior', async () => {
    const wrapper = mountView(LoginView)
    expect(wrapper.text()).toContain('Save email on this device')
    expect(wrapper.text()).not.toContain('Remember me')
    await fillLogin(wrapper)
    await wrapper.get('#save-email').trigger('click')
    await button(wrapper, 'Sign In').trigger('click')
    await flushPromises()

    expect(localStorage.getItem('rememberedEmail')).toBe('reader@example.test')
  })

  it('guards a signed-out client from a stale profile hydration result', async () => {
    let listener: ((value: unknown) => void) | undefined
    let resolveProfile!: (value: typeof profile) => void
    const delayedProfile = new Promise<typeof profile>(resolve => { resolveProfile = resolve })
    doubles.auth.currentSession.mockResolvedValueOnce(null)
    doubles.auth.onAuthStateChange.mockImplementationOnce((callback: (value: unknown) => void) => {
      listener = callback
      return () => undefined
    })
    doubles.auth.mapSessionToProfile.mockImplementation((value: unknown) => {
      return value ? delayedProfile : Promise.resolve(null)
    })
    const store = useAuthStore()
    await store.init()

    listener?.(session)
    await Promise.resolve()
    listener?.(null)
    await flushPromises()
    resolveProfile(profile)
    await flushPromises()

    expect(store.user).toBeNull()
  })

  it('renders Google callback failure through the shared boundary', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=one-time-code')
    doubles.auth.completeOAuthCallback.mockRejectedValueOnce(new Error('OAuth code is invalid.'))
    const wrapper = mountView(OAuthCallbackView)
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('OAuth code is invalid.')
    expect(doubles.replace).not.toHaveBeenCalled()
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('completes the Google callback without an error or duplicate toast', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=one-time-code')
    const wrapper = mountView(OAuthCallbackView)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(doubles.replace).toHaveBeenCalledWith('/')
    expect(doubles.toast).not.toHaveBeenCalled()
  })
})
