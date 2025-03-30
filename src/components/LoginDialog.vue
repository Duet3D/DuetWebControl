<template>
  <v-dialog :value="showLoginDialog" @input="handleDialogChange" persistent max-width="400">
    <v-card>
      <v-card-title>Login</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleLogin">
          <v-text-field
            v-model="username"
            label="Username"
            prepend-icon="mdi-account"
            type="text"
            required
          ></v-text-field>
          <v-text-field
            v-model="password"
            label="Password"
            prepend-icon="mdi-lock"
            :type="showPassword ? 'text' : 'password'"
            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showPassword = !showPassword"
            required
          ></v-text-field>
        </v-form>
        <v-alert v-if="error" type="error" dense>
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="handleLogin">Login</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState, mapActions } from 'vuex';
import store from '@/store';
import { RootState } from '@/store';

// Define types to help TypeScript understand the structure
//type LoginFunction = (credentials: { username: string; password: string }) => Promise<boolean>;

export default Vue.extend({
  name: 'LoginDialog',
  
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      error: ''
    };
  },
  
  computed: {
    ...mapState('auth', ['showLoginDialog'])
  },
  
  methods: {
    // We'll handle the login action separately instead of using mapActions
    // to avoid TypeScript issues
    handleDialogChange(value: boolean): void {
      store.commit('auth/setShowLoginDialog', value);
    },
    
    async handleLogin(): Promise<void> {
      try {
        // Call the Vuex action directly through the store
        const success = await store.dispatch('auth/login', {
          username: this.username,
          password: this.password
        }) as boolean;
        
        if (success) {
          store.commit('auth/setShowLoginDialog', false);
          this.error = '';
        } else {
          this.error = 'Invalid username or password';
        }
      } catch (error) {
        this.error = 'Login failed';
      }
    }
  }
});
</script> 