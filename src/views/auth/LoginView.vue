<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/solid'
import { toast } from '@/lib/utils'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Form state
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)

// Computed properties for form validation
const isEmailValid = computed(() => {
  if (!email.value) return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const isPasswordValid = computed(() => {
  if (!password.value) return true
  return password.value.length >= 6
})

const isFormValid = computed(() => {
  return email.value && password.value && isEmailValid.value && isPasswordValid.value
})

// Handle login with email/password
const handleLogin = async () => {
  if (!isFormValid.value) {
    toast('Please fill in all fields correctly', 'Invalid Form', 'destructive')
    return
  }

  isLoading.value = true

  try {
    const result = await authStore.loginWithEmail({ email: email.value, password: password.value })

    if (result) {
      // Store email in localStorage if remember me is checked
      if (rememberMe.value) {
        localStorage.setItem('rememberedEmail', email.value)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // Navigate to the redirect URL or home page
      const redirectUrl = (route.query.redirect as string) || '/'
      router.push(redirectUrl)
    }
  } catch (error) {
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle Google sign-in
const handleGoogleLogin = async () => {
  isLoading.value = true

  try {
    const result = await authStore.loginWithGoogle()

    if (result) {
      // Navigate to the redirect URL or home page
      const redirectUrl = (route.query.redirect as string) || '/'
      router.push(redirectUrl)
    }
  } catch (error) {
    console.error('Google login error:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle forgotten password
const handleForgotPassword = async () => {
  if (!email.value || !isEmailValid.value) {
    toast('Please enter a valid email address', 'Invalid Email', 'destructive')
    return
  }

  isLoading.value = true

  try {
    await authStore.resetPassword(email.value)
  } catch (error) {
    console.error('Password reset error:', error)
  } finally {
    isLoading.value = false
  }
}

// Initialize from localStorage if remember me was previously used
const initFromStorage = () => {
  const savedEmail = localStorage.getItem('rememberedEmail')
  if (savedEmail) {
    email.value = savedEmail
    rememberMe.value = true
  }
}

// Call on component mount
initFromStorage()
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription class="text-center">
          Enter your email and password to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Email Field -->
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <div class="relative">
            <EnvelopeIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="email"
              :value="email"
              type="email"
              :class-name="`pl-10 ${email && !isEmailValid ? 'border-red-500' : ''}`"
              placeholder="email@example.com"
              @input="(e: Event) => (email = (e.target as HTMLInputElement).value)"
              @keyup.enter="handleLogin"
            />
          </div>
          <p v-if="email && !isEmailValid" class="text-sm text-red-500">
            Please enter a valid email address
          </p>
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="password">Password</Label>
            <Button
              variant="link"
              class="px-0 font-normal h-auto text-xs"
              @click="handleForgotPassword"
            >
              Forgot password?
            </Button>
          </div>
          <div class="relative">
            <LockClosedIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="password"
              :value="password"
              :type="showPassword ? 'text' : 'password'"
              :class-name="`pl-10 ${password && !isPasswordValid ? 'border-red-500' : ''}`"
              placeholder="••••••••"
              @input="(e: Event) => (password = (e.target as HTMLInputElement).value)"
              @keyup.enter="handleLogin"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              @click="showPassword = !showPassword"
            >
              <EyeIcon v-if="showPassword" class="h-4 w-4" />
              <EyeSlashIcon v-else class="h-4 w-4" />
            </button>
          </div>
          <p v-if="password && !isPasswordValid" class="text-sm text-red-500">
            Password must be at least 6 characters long
          </p>
        </div>

        <!-- Remember Me -->
        <div class="flex items-center space-x-2">
          <Checkbox id="remember" v-model:checked="rememberMe" />
          <label
            for="remember"
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </label>
        </div>

        <!-- Login Button -->
        <Button
          class="w-full"
          :disabled="!isFormValid || isLoading"
          :class="{ 'opacity-70 cursor-not-allowed': isLoading }"
          @click="handleLogin"
        >
          {{ isLoading ? 'Logging in...' : 'Sign In' }}
        </Button>

        <!-- Divider -->
        <div class="relative flex items-center justify-center">
          <div class="absolute border-t border-gray-300 dark:border-gray-700 w-full"></div>
          <div class="relative px-4 bg-card text-sm">or continue with</div>
        </div>

        <!-- Google Login Button -->
        <Button variant="outline" class="w-full" :disabled="isLoading" @click="handleGoogleLogin">
          <svg class="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>
      </CardContent>
      <CardFooter class="flex justify-center">
        <div class="text-sm text-center text-muted-foreground">
          Don't have an account?
          <RouterLink to="/register" class="text-primary font-medium hover:underline ml-1">
            Sign up
          </RouterLink>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
