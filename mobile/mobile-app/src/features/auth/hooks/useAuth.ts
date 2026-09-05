import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  loginUser,
  loginWithGoogleThunk,
  loginWithMicrosoftThunk,
  registerUserThunk,
  verifyRegistrationThunk,
  acceptInviteThunk,
  createWorkspaceThunk,
  updateOrganizationFeaturesThunk,
  requestOtp,
  verifyOtpLogin,
  performLogout,
  deleteAccountThunk,
  requestPasswordReset,
  verifyResetOtpAction,
  resetPasswordAction,
  clearStatus,
  bootstrapAuth,
  updateProfileThunk,
  switchWorkspaceContextThunk,
} from '../store/authSlice';
import authService from '../services/authService';
import { useCallback } from 'react';

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

  const handleLogin = useCallback(
    (credentials: any) => {
      return dispatch ? dispatch(loginUser(credentials)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLoginWithGoogle = useCallback(
    (token: string) => {
      return dispatch ? dispatch(loginWithGoogleThunk({ token })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLoginWithMicrosoft = useCallback(
    (token: string) => {
      return dispatch ? dispatch(loginWithMicrosoftThunk({ token })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleRegister = useCallback(
    (userData: any) => {
      return dispatch ? dispatch(registerUserThunk(userData)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleVerifyRegistration = useCallback(
    (email: string, code: string) => {
      return dispatch ? dispatch(verifyRegistrationThunk({ email, code })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleAcceptInvite = useCallback(
    (token: string, password: string) => {
      return dispatch ? dispatch(acceptInviteThunk({ token, password })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleCreateWorkspace = useCallback(
    (workspaceData: any) => {
      return dispatch ? dispatch(createWorkspaceThunk(workspaceData)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleUpdateOrganizationFeatures = useCallback(
    (orgId: string, features: string[]) => {
      return dispatch ? dispatch(updateOrganizationFeaturesThunk({ orgId, features })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleCheckOrganizationName = useCallback((name: string) => {
    return authService.checkOrganizationName(name);
  }, []);

  const handleRequestOtp = useCallback(
    (identifier: string, isEmail: boolean = false) => {
      return dispatch ? dispatch(requestOtp({ identifier, isEmail })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleVerifyOtp = useCallback(
    (identifier: string, code: string, isEmail: boolean = false) => {
      return dispatch ? dispatch(verifyOtpLogin({ identifier, code, isEmail })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    return dispatch ? dispatch(performLogout()) : Promise.resolve();
  }, [dispatch]);

  const handleDeleteAccount = useCallback(() => {
    return dispatch ? dispatch(deleteAccountThunk()) : Promise.resolve();
  }, [dispatch]);

  const handleForgotPassword = useCallback(
    (identifier: string) => {
      return dispatch ? dispatch(requestPasswordReset(identifier)) : Promise.resolve();
    },
    [dispatch]
  );

  const handleVerifyResetOtp = useCallback(
    (identifier: string, code: string) => {
      return dispatch ? dispatch(verifyResetOtpAction({ identifier, code })) : Promise.resolve();
    },
    [dispatch]
  );

  const handleResetPassword = useCallback(
    (payload: { identifier: string; code: string; newPassword: string }) => {
      return dispatch ? dispatch(resetPasswordAction(payload)) : Promise.resolve();
    },
    [dispatch]
  );

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
    login: handleLogin,
    register: handleRegister,
    verifyRegistration: handleVerifyRegistration,
    acceptInvite: handleAcceptInvite,
    createWorkspace: handleCreateWorkspace,
    updateOrganizationFeatures: handleUpdateOrganizationFeatures,
    checkOrganizationName: handleCheckOrganizationName,
    loginWithGoogle: handleLoginWithGoogle,
    loginWithMicrosoft: handleLoginWithMicrosoft,
    requestOtp: handleRequestOtp,
    verifyOtp: handleVerifyOtp,
    forgotPassword: handleForgotPassword,
    verifyResetOtp: handleVerifyResetOtp,
    resetPassword: handleResetPassword,
    logout: handleLogout,
    deleteAccount: handleDeleteAccount,
    clearStatus: handleClearStatus,
    bootstrap: handleBootstrap,
    updateProfile: handleUpdateProfile,
    switchWorkspaceContext: handleSwitchWorkspaceContext,
  };
};

export default useAuth;
