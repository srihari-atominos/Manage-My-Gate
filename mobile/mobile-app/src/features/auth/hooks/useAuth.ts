import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  loginUser,
  loginWithGoogleThunk,
  loginWithMicrosoftThunk,
  registerUserThunk,
  verifyRegistrationThunk,
  createWorkspaceThunk,
  updateOrganizationFeaturesThunk,
  requestOtp,
  verifyOtpLogin,
  performLogout,
  clearStatus,
  bootstrapAuth,
} from '../store/authSlice';
import authService from '../services/authService';
import { useCallback } from 'react';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth) || {
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

  const handleClearStatus = useCallback(() => {
    if (dispatch) dispatch(clearStatus());
  }, [dispatch]);

  const handleBootstrap = useCallback(() => {
    if (dispatch) dispatch(bootstrapAuth());
  }, [dispatch]);

  return {
    ...authState,
    login: handleLogin,
    register: handleRegister,
    verifyRegistration: handleVerifyRegistration,
    createWorkspace: handleCreateWorkspace,
    updateOrganizationFeatures: handleUpdateOrganizationFeatures,
    checkOrganizationName: handleCheckOrganizationName,
    loginWithGoogle: handleLoginWithGoogle,
    loginWithMicrosoft: handleLoginWithMicrosoft,
    requestOtp: handleRequestOtp,
    verifyOtp: handleVerifyOtp,
    logout: handleLogout,
    clearStatus: handleClearStatus,
    bootstrap: handleBootstrap,
  };
};

export default useAuth;
