import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  loginUser,
  requestOtp,
  verifyOtpLogin,
  performLogout,
  clearStatus,
  bootstrapAuth,
} from '../store/authSlice';
import { useCallback } from 'react';

export const useAuth = () => {
  let dispatch: AppDispatch | null = null;
  let authState: any = {
    user: null,
    isAuthenticated: false,
    isInitialized: true,
    loading: false,
    error: null,
    otpSent: false,
  };

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    dispatch = useDispatch<AppDispatch>();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authState = useSelector((state: RootState) => state.auth) || authState;
  } catch (err) {
    // Return safe initial fallback state if Redux Provider is not yet in tree
  }

  const handleLogin = useCallback(
    (credentials: any) => {
      return dispatch ? dispatch(loginUser(credentials)) : Promise.resolve();
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
    requestOtp: handleRequestOtp,
    verifyOtp: handleVerifyOtp,
    logout: handleLogout,
    clearStatus: handleClearStatus,
    bootstrap: handleBootstrap,
  };
};

export default useAuth;
