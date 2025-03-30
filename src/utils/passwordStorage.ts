import store from '@/store';
import Path from '@/utils/path';
import { DisconnectedError, OperationCancelledError } from '@/utils/errors';
import { UserRole } from '@/types/roles';

interface UserCredentials {
    username: string;
    password: string;
    role: UserRole;
}

interface CredentialsFile {
    users: Array<UserCredentials>;
}

export const DEFAULT_CREDENTIALS: UserCredentials[] = [
    {
        username: 'admin',
        password: 'admin1234',
        role: UserRole.Admin
    },
    {
        username: 'operator',
        password: 'operator1234',
        role: UserRole.Operator
    },
    {
        username: 'maintenance',
        password: 'maintenance1234',
        role: UserRole.Maintenance
    }
];

export class PasswordStorage {
    private static instance: PasswordStorage;
    private readonly credentialsFileName = 'credentials.json';
    private credentials: UserCredentials[] = DEFAULT_CREDENTIALS;

    private constructor() {
        // Initialize credentials from file if available
        this.initializeCredentials();
    }

    private async initializeCredentials() {
        try {
            const fileCredentials = await this.loadCredentialsFromFile();
            if (fileCredentials && fileCredentials.users.length > 0) {
                this.credentials = fileCredentials.users;
            }
        } catch (error) {
            console.warn('Failed to load credentials from file, using defaults:', error);
        }
    }

    public static getInstance(): PasswordStorage {
        if (!PasswordStorage.instance) {
            PasswordStorage.instance = new PasswordStorage();
        }
        return PasswordStorage.instance;
    }

    public async validateCredentials(username: string, password: string): Promise<{ isValid: boolean; role?: UserRole }> {
        const user = this.credentials.find(u => u.username === username && u.password === password);
        if (user) {
            return { isValid: true, role: user.role };
        }
        return { isValid: false };
    }

    public async updateCredentials(username: string, newPassword: string, role: UserRole): Promise<boolean> {
        try {
            const userIndex = this.credentials.findIndex(u => u.username === username);
            
            if (userIndex === -1) {
                this.credentials.push({
                    username,
                    password: newPassword,
                    role
                });
            } else {
                this.credentials[userIndex].password = newPassword;
                this.credentials[userIndex].role = role;
            }
            
            // Save to file after updating in memory
            await this.saveCredentialsToFile({ users: this.credentials });
            return true;
        } catch (error) {
            console.error('Error updating credentials:', error);
            return false;
        }
    }

    private async loadCredentialsFromFile(): Promise<CredentialsFile> {
        try {
            const filename = Path.combine('sys', this.credentialsFileName);
            const response = await store.dispatch('machine/download', {
                filename,
                type: 'json',
                showSuccess: false,
                showError: false
            });
            return response as CredentialsFile;
        } catch (e) {
            if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
                console.warn('Failed to load credentials:', e);
            }
            throw e;
        }
    }

    private async saveCredentialsToFile(credentials: CredentialsFile): Promise<void> {
        try {
            const filename = Path.combine('sys', this.credentialsFileName);
            const content = new Blob([JSON.stringify(credentials, null, 2)]);
            await store.dispatch('machine/upload', {
                filename,
                content,
                showSuccess: false
            });
        } catch (e) {
            console.warn('Failed to save credentials:', e);
            throw e;
        }
    }
} 