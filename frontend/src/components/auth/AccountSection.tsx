import React from 'react';
import { UserInfo } from '../../services/authService';

interface AccountSectionProps {
    theme: 'light' | 'dark';
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshAuthState: () => Promise<void>;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
    theme,
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshAuthState
}) => {
    const isDark = theme === 'dark';

    if (isLoading) {
        return (
            <div className={`p-6 rounded-xl ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-[#252525]' : 'bg-gray-200'} animate-pulse`} />
                    <div className="flex-1">
                        <div className={`h-4 w-24 rounded ${isDark ? 'bg-[#252525]' : 'bg-gray-200'} animate-pulse mb-2`} />
                        <div className={`h-3 w-32 rounded ${isDark ? 'bg-[#252525]' : 'bg-gray-200'} animate-pulse`} />
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className={`p-6 rounded-xl ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            Sign In
                        </h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Sync your settings and access premium features
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={refreshAuthState}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isDark ? 'bg-[#252525] text-gray-300 hover:bg-[#333]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Refresh
                        </button>
                        <button
                            onClick={login}
                            className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-6 rounded-xl ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    {user.picture ? (
                        <img
                            src={user.picture}
                            alt={user.name || 'Profile'}
                            className="w-12 h-12 rounded-full border-2 border-emerald-500"
                        />
                    ) : (
                        <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-[#252525]' : 'bg-gray-200'} flex items-center justify-center`}>
                            <span className="text-lg font-medium text-gray-500">
                                {(user.name || user.email)[0].toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* User Info */}
                    <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {user.name || 'User'}
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={logout}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
            ${isDark
                            ? 'bg-[#252525] text-gray-300 hover:bg-[#333] hover:text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default AccountSection;
