<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/vue/24/solid'
import { toast } from '@/lib/utils'

const authStore = useAuthStore()
const router = useRouter()

// Form state
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
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

const isConfirmPasswordValid = computed(() => {
  if (!confirmPassword.value) return true
  return confirmPassword.value === password.value
})

const isDisplayNameValid = computed(() => {
  if (!displayName.value) return true
  return displayName.value.length >= 2
})

const isFormValid = computed(() => {
  return (
    email.value &&
    password.value &&
    confirmPassword.value &&
    displayName.value &&
    isEmailValid.value &&
    isPasswordValid.value &&
    isConfirmPasswordValid.value &&
    isDisplayNameValid.value
  )
})

// Handle registration
const handleRegister = async () => {
  if (!isFormValid.value) {
    toast('Please fill in all fields correctly', 'Invalid Form', 'destructive')
    return
  }

  isLoading.value = true

  try {
    const result = await authStore.register({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
    })

    if (result) {
      toast('Your account has been created successfully!', 'Welcome to BashNota!')
      router.push('/')
    }
  } catch (error) {
    console.error('Registration error:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle Google sign-in
const handleGoogleSignup = async () => {
  isLoading.value = true

  try {
    const result = await authStore.loginWithGoogle()

    if (result) {
      toast('You have signed up with Google successfully!', 'Welcome to BashNota!')
      router.push('/')
    }
  } catch (error) {
    console.error('Google signup error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl font-bold text-center">Create an account</CardTitle>
        <CardDescription class="text-center">
          Enter your details to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Display Name Field -->
        <div class="space-y-2">
          <Label for="name">Name</Label>
          <div class="relative">
            <UserIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="name"
              :value="displayName"
              type="text"
              class-name="pl-10"
              placeholder="John Doe"
              :class="{ 'border-red-500': displayName && !isDisplayNameValid }"
              @input="(e: Event) => (displayName = (e.target as HTMLInputElement).value)"
            />
          </div>
          <p v-if="displayName && !isDisplayNameValid" class="text-sm text-red-500">
            Name must be at least 2 characters long
          </p>
        </div>

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
              class-name="pl-10"
              placeholder="email@example.com"
              :class="{ 'border-red-500': email && !isEmailValid }"
              @input="(e: Event) => (email = (e.target as HTMLInputElement).value)"
            />
          </div>
          <p v-if="email && !isEmailValid" class="text-sm text-red-500">
            Please enter a valid email address
          </p>
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <div class="relative">
            <LockClosedIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="password"
              :value="password"
              :type="showPassword ? 'text' : 'password'"
              class-name="pl-10"
              placeholder="••••••••"
              :class="{ 'border-red-500': password && !isPasswordValid }"
              @input="(e: Event) => (password = (e.target as HTMLInputElement).value)"
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

        <!-- Confirm Password Field -->
        <div class="space-y-2">
          <Label for="confirmPassword">Confirm Password</Label>
          <div class="relative">
            <LockClosedIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="confirmPassword"
              :value="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class-name="pl-10"
              placeholder="••••••••"
              :class="{ 'border-red-500': confirmPassword && !isConfirmPasswordValid }"
              @input="(e: Event) => (confirmPassword = (e.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeIcon v-if="showConfirmPassword" class="h-4 w-4" />
              <EyeSlashIcon v-else class="h-4 w-4" />
            </button>
          </div>
          <p v-if="confirmPassword && !isConfirmPasswordValid" class="text-sm text-red-500">
            Passwords do not match
          </p>
        </div>

        <!-- Register Button -->
        <Button
          class="w-full"
          :disabled="!isFormValid || isLoading"
          :class="{ 'opacity-70 cursor-not-allowed': isLoading }"
          @click="handleRegister"
        >
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </Button>

        <!-- Divider -->
        <div class="relative flex items-center justify-center">
          <div class="absolute border-t border-gray-300 dark:border-gray-700 w-full"></div>
          <div class="relative px-4 bg-card text-sm">or continue with</div>
        </div>

        <!-- Google Signup Button -->
        <Button variant="outline" class="w-full" :disabled="isLoading" @click="handleGoogleSignup">
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
          Sign up with Google
        </Button>
      </CardContent>
      <CardFooter class="flex justify-center">
        <div class="text-sm text-center text-muted-foreground">
          Already have an account?
          <RouterLink to="/login" class="text-primary font-medium hover:underline ml-1">
            Sign in
          </RouterLink>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
