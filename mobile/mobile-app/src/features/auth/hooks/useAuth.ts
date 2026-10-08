import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  loginWithGoogleThunk,
  loginWithMicrosoftThunk,
  loginWithAppleThunk,
  requestOtp,
  verifyOtpLogin,
  respondToInvitationThunk,
  performLogout,
  deleteAccountThunk,
  clearStatus,
  bootstrapAuth,
  updateProfileThunk,
  switchWorkspaceContextThunk,
} from '../store/authSlice';
import { useCallback } from 'react';

/**
 * Sign-in is email code, phone code or SSO; joining a community is by invitation.
 * (Password, self-registration and self-serve community creation were removed.)
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const storeState = useSelector((state: RootState) => state.auth);
  const authState = storeState || {
    user: null,
    isAuthenticated: false,
    isInitialized: true,
    loading: false,
    error: null,
    otpSent: false,
  };

  const handleLoginWithGoogle = useCallback(
    (tokenOrPayload: string | any) => {
      const payload = typeof tokenOrPayload === 'string' ? { token: tokenOrPayload } : tokenOrPayload;
      return dispatch ? dispatch(loginWithGoogleThunk(payload)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLoginWithMicrosoft = useCallback(
    (token: string) => {
      return dispatch ? dispatch(loginWithMicrosoftThunk({ token })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLoginWithApple = useCallback(
    (payload: { token: string; nonce: string; fullName?: string }) => {
      return dispatch ? dispatch(loginWithAppleThunk(payload)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleRequestOtp = useCallback(
    (identifier: string, isEmail: boolean = false) => {
      return dispatch ? dispatch(requestOtp({ identifier, isEmail })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleVerifyOtp = useCallback(
    (identifier: string, code: string, isEmail: boolean = false, inviteToken: string | null = null) => {
      return dispatch ? dispatch(verifyOtpLogin({ identifier, code, isEmail, inviteToken })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleRespondToInvitation = useCallback(
    (args: { action: 'accept' | 'decline'; invitationId?: string; inviteToken?: string; ticket?: string | null }) => {
      return dispatch ? dispatch(respondToInvitationThunk(args)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    return dispatch ? dispatch(performLogout()) : Promise.resolve();
  }, [dispatch]);

  const handleDeleteAccount = useCallback(() => {
    return dispatch ? dispatch(deleteAccountThunk()) : Promise.resolve();
  }, [dispatch]);

  const handleClearStatus = useCallback(() => {
    if (dispatch) dispatch(clearStatus());
  }, [dispatch]);

  const handleBootstrap = useCallback(() => {
    if (dispatch) dispatch(bootstrapAuth());
  }, [dispatch]);

  const handleUpdateProfile = useCallback(
    (payload: any) => {
      return dispatch ? dispatch(updateProfileThunk(payload)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleSwitchWorkspaceContext = useCallback(
    (payload: any = {}) => {
      return dispatch(switchWorkspaceContextThunk(payload));
    },
    [dispatch]
  );

  return {
    ...authState,
    loginWithGoogle: handleLoginWithGoogle,
    loginWithMicrosoft: handleLoginWithMicrosoft,
    loginWithApple: handleLoginWithApple,
    requestOtp: handleRequestOtp,
    verifyOtp: handleVerifyOtp,
    respondToInvitation: handleRespondToInvitation,
    logout: handleLogout,
    deleteAccount: handleDeleteAccount,
    clearStatus: handleClearStatus,
    bootstrap: handleBootstrap,
    updateProfile: handleUpdateProfile,
    switchWorkspaceContext: handleSwitchWorkspaceContext,
  };
};

export default useAuth;
