import { ActionContext } from 'vuex';
import { makeNotification } from '@/utils/notifications';
import { LogType } from '@/utils/logging';
import store from '@/store';

interface SessionState {
    lastActivity: number;
    timeoutWarningShown: boolean;
    timeoutInterval: number;
    warningInterval: number;
}

const state: SessionState = {
    lastActivity: Date.now(),
    timeoutWarningShown: false,
    timeoutInterval: 5 * 60 * 1000, // 5 minutes
    warningInterval: 4 * 60 * 1000  // 4 minutes (1 minute warning)
};

const mutations = {
    updateLastActivity(state: SessionState) {
        state.lastActivity = Date.now();
        state.timeoutWarningShown = false;
    },
    setWarningShown(state: SessionState, shown: boolean) {
        state.timeoutWarningShown = shown;
    }
};

const actions = {
    init({ state, dispatch }: ActionContext<SessionState, any>) {
        // Add event listeners for user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                dispatch('updateActivity');
            });
        });

        // Start checking for timeout
        setInterval(() => {
            dispatch('checkTimeout');
        }, 60000); // Check every minute
    },

    updateActivity({ commit }: ActionContext<SessionState, any>) {
        commit('updateLastActivity');
    },

    async checkTimeout({ state, commit, dispatch }: ActionContext<SessionState, any>) {
        const now = Date.now();
        const timeSinceLastActivity = now - state.lastActivity;

        // Show warning 1 minute before timeout
        if (timeSinceLastActivity >= state.warningInterval && !state.timeoutWarningShown) {
            commit('setWarningShown', true);
            makeNotification(
                LogType.warning,
                'Session Timeout Warning',
                'Your session will expire in 1 minute due to inactivity. Click anywhere to extend your session.',
                60000
            );
        }

        // Timeout after 5 minutes of inactivity
        if (timeSinceLastActivity >= state.timeoutInterval) {
            // Perform logout
            await store.dispatch('auth/logout');
            store.commit('auth/setShowLoginDialog', true);
            
            makeNotification(
                LogType.warning,
                'Session Expired',
                'Your session has expired due to inactivity. Please log in again.',
                0
            );
        }
    }
};

export default {
    namespaced: true,
    state,
    mutations,
    actions
}; 