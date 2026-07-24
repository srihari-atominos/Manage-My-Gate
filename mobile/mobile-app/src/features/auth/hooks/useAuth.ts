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
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  const handleLogin = useCallback(
    (credentials: any) => {
      return dispatch(loginUser(credentials));
    },
    [dispatch]
  );

  const handleRequestOtp = useCallback(
    (identifier: string, isEmail: boolean = false) => {
      return dispatch(requestOtp({ identifier, isEmail }));
    },
    [dispatch]
  );

  const handleVerifyOtp = useCallback(
    (identifier: string, code: string, isEmail: boolean = false) => {
      return dispatch(verifyOtpLogin({ identifier, code, isEmail }));
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    return dispatch(performLogout());
  }, [dispatch]);

  const handleClearStatus = useCallback(() => {
    dispatch(clearStatus());
  }, [dispatch]);

  const handleBootstrap = useCallback(() => {
    dispatch(bootstrapAuth());
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
