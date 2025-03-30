import Vue from 'vue';
import { ActionContext } from 'vuex';
import { UserRole } from '@/types/roles';
import { DEFAULT_CREDENTIALS } from '@/utils/passwordStorage';
import router from '@/routes';

interface AuthState {
    isAuthenticated: boolean;
    userRole: UserRole | null;
    showLoginDialog: boolean;
}

interface LoginCredentials {
    username: string;
    password: string;
}

const state: AuthState = {
    isAuthenticated: false,
    userRole: null,
    showLoginDialog: false
};

const mutations = {
    setAuth(state: AuthState, { isAuthenticated, userRole }: AuthState) {
        state.isAuthenticated = isAuthenticated;
        state.userRole = userRole;
    },
    logout(state: AuthState) {
        state.isAuthenticated = false;
        state.userRole = null;
    },
    setShowLoginDialog(state: AuthState, show: boolean) {
        state.showLoginDialog = show;
    }
};

const actions = {
    login({ commit }: ActionContext<AuthState, any>, credentials: LoginCredentials) {
        const user = DEFAULT_CREDENTIALS.find(
            u => u.username === credentials.username && u.password === credentials.password
        );
        
        if (user) {
            commit('setAuth', { isAuthenticated: true, userRole: user.role });
            
            // Redirect to BtnCmd for operator and maintenance roles if not already on that route
            if ((user.role === UserRole.Operator || user.role === UserRole.Maintenance) && 
                router.currentRoute.path !== '/BtnCmd') {
                router.push('/BtnCmd');
            }
            
            return true;
        }
        return false;
    },
    logout({ commit }: ActionContext<AuthState, any>) {
        commit('logout');
    },
    showLoginDialog({ commit }: ActionContext<AuthState, any>) {
        commit('setShowLoginDialog', true);
    }
};

const getters = {
    isAuthenticated: (state: AuthState) => state.isAuthenticated,
    isAdmin: (state: AuthState) => state.userRole === UserRole.Admin,
    userRole: (state: AuthState) => state.userRole
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
};
