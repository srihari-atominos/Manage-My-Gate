import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import {
  logout as logoutAction,
  updateProfile as updateProfileAction,
  clearStatus as clearStatusAction,
  acceptInvitation,
  acceptSsoInvitation,
  loginUser,
  loginWithGoogle,
  loginWithMicrosoft,
  registerUser,
  verifyRegistration as verifyRegistrationAction,
  requestOtp,
  verifyOtpLogin,
  requestPasswordReset,
  verifyResetOtp as verifyResetOtpAction,
  resetPassword as resetPasswordAction,
  performLogout,
} from '../store/authSlice'

/**
 * useAuth Custom Hook
 *
 * Controller hook encapsulating auth state selectors and action dispatchers.
 * Follows the "Thin View" architectural pattern.
 */
export const useAuth = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const currentUser = useSelector((state) => state.auth.user)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const token = useSelector((state) => state.auth.token)
  const loading = useSelector((state) => state.auth.loading)
  const error = useSelector((state) => state.auth.error)
  const successMsg = useSelector((state) => state.auth.successMsg)

  const otpSent = useSelector((state) => state.auth.otpSent)
  const activeWorkspace = useSelector((state) => state.workspace)
  const allowedFeatures = useSelector((state) => state.workspace?.allowedFeatures || [])
  const isPlatform = useSelector((state) => state.workspace?.isPlatform || false)

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'auth_logout' && isAuthenticated) {
        dispatch(logoutAction())
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [dispatch, isAuthenticated])

  const logout = () => {
    dispatch(performLogout())
  }

  const updateProfile = (formData) => {
    return dispatch(updateProfileAction(formData))
  }

  const clearStatus = () => {
    dispatch(clearStatusAction())
  }

  const handleAcceptInvitation = async (token, password) => {
    try {
      const resultAction = await dispatch(acceptInvitation({ token, password }))
      if (acceptInvitation.fulfilled.match(resultAction)) {
        toast.success(t('auth.invite.success'))
        navigate('/dashboard')
        return { success: true }
      } else {
        const errorMsg = resultAction.payload || t('auth.invite.error')
        toast.error(errorMsg)
        return { success: false, error: errorMsg }
      }
    } catch (err) {
      const fallbackMsg = t('auth.invite.error')
      toast.error(fallbackMsg)
      return { success: false, error: fallbackMsg }
    }
  }

  const login = async (credentials) => {
    const resultAction = await dispatch(loginUser(credentials))
    if (loginUser.fulfilled.match(resultAction)) {
      return { success: true, payload: resultAction.payload }
    }
    return { success: false, error: resultAction.payload }
  }

  const loginGoogle = async (credential, inviteToken) => {
    const payload = typeof credential === 'object' ? credential : { token: credential, inviteToken }
    const resultAction = await dispatch(loginWithGoogle(payload))
    if (loginWithGoogle.fulfilled.match(resultAction)) {
      const data = resultAction.payload?.data

      if (data?.isNewUser) {
        return { success: true, isNewUser: true, googleData: data.googleData }
      }

      const workspaces = data?.workspaces || data?.availableWorkspaces || []
      const navigateTo = workspaces.length === 0 ? '/workspace-setup' : '/dashboard'
      navigate(navigateTo)
      return { success: true, navigateTo }
    }
    return { success: false, error: resultAction.payload }
  }

  const loginMicrosoft = async (idToken, inviteToken) => {
    const payload = typeof idToken === 'object' ? idToken : { token: idToken, inviteToken }
    const resultAction = await dispatch(loginWithMicrosoft(payload))
    if (loginWithMicrosoft.fulfilled.match(resultAction)) {
      const data = resultAction.payload?.data
      const workspaces = data?.workspaces || data?.availableWorkspaces || []
      const navigateTo = workspaces.length === 0 ? '/workspace-setup' : '/dashboard'
      navigate(navigateTo)
      return { success: true, navigateTo }
    }
    return { success: false, error: resultAction.payload }
  }

  const handleAcceptSsoInvitation = async (inviteToken, ssoCredential, provider) => {
    try {
      const resultAction = await dispatch(
        acceptSsoInvitation({ inviteToken, ssoCredential, provider }),
      )
      if (acceptSsoInvitation.fulfilled.match(resultAction)) {
        const data = resultAction.payload?.data
        const workspaces = data?.workspaces || data?.availableWorkspaces || []
        const navigateTo = workspaces.length === 0 ? '/workspace-setup' : '/dashboard'
        toast.success(t('auth.invite.success'))
        navigate(navigateTo)
        return { success: true, navigateTo }
      } else {
        const errorMsg = resultAction.payload || t('auth.invite.error')
        toast.error(errorMsg)
        return { success: false, error: errorMsg }
      }
    } catch (err) {
      const fallbackMsg = t('auth.invite.error')
      toast.error(fallbackMsg)
      return { success: false, error: fallbackMsg }
    }
  }

  const register = (userData) => {
    return dispatch(registerUser(userData))
  }

  const verifyRegistration = async (email, code) => {
    const resultAction = await dispatch(verifyRegistrationAction({ email, code }))
    if (verifyRegistrationAction.fulfilled.match(resultAction)) {
      return { success: true, payload: resultAction.payload }
    }
    return { success: false, error: resultAction.payload }
  }

  const checkPermission = (permissionName) => {
    if (!currentUser) return false

    const adminRoles = [
      'super admin',
      'platform super admin',
      'community admin',
      'admin',
      'superadmin',
      'facility manager',
      'super_admin',
      'platform_super_admin',
      'community_admin',
    ]
    const cleanRole = (r) => (r || '').toLowerCase().trim().replace(/[_-]/g, ' ')
    const userRole = cleanRole(currentUser.role)
    const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles.map(cleanRole) : []

    if (
      adminRoles.some((ar) => cleanRole(ar) === userRole) ||
      userRoles.some((r) => adminRoles.some((ar) => cleanRole(ar) === r))
    ) {
      return true
    }

    if (currentUser.permissions && (currentUser.permissions.includes('*') || currentUser.permissions.includes('all'))) {
      return true
    }

    const isPermEnabledInWorkspace = (perm) => {
      if (!perm || isPlatform) return true
      const featurePart = perm.split(':')[0]
      if (featurePart === 'workspaces' || featurePart === 'dashboard') return true

      const isModuleEnabled = (key) => {
        if (allowedFeatures.includes(key)) return true
        if (activeWorkspace?.modules?.some((m) => m.moduleKey === key && m.enabled !== false)) return true
        if (activeWorkspace?.workspaceModules?.some((m) => m.moduleKey === key && m.enabled === true)) return true
        return false
      }

      if (featurePart === 'amenities' || featurePart === 'booking') {
        return ['amenities', 'booking', 'amenity', 'amenitiesBooking'].some((f) => isModuleEnabled(f))
      }

      if (['villas', 'users', 'roles', 'integrations'].includes(featurePart)) {
        return (
          isModuleEnabled('administration_security') ||
          isModuleEnabled(featurePart) ||
          allowedFeatures.includes(perm)
        )
      }

      return isModuleEnabled(featurePart) || allowedFeatures.includes(perm)
    }

    if (Array.isArray(permissionName)) {
      return permissionName.some(
        (perm) => isPermEnabledInWorkspace(perm) && currentUser.permissions?.includes(perm),
      )
    }

    if (!isPermEnabledInWorkspace(permissionName)) return false

    return !!(currentUser.permissions && currentUser.permissions.includes(permissionName))
  }

  const sendOtp = (identifier, isEmail) => {
    return dispatch(requestOtp({ identifier, isEmail }))
  }

  const verifyOtp = async (identifier, code, isEmail) => {
    const resultAction = await dispatch(verifyOtpLogin({ identifier, code, isEmail }))
    if (verifyOtpLogin.fulfilled.match(resultAction)) {
      return { success: true, payload: resultAction.payload }
    }
    return { success: false, error: resultAction.payload }
  }

  const sendPasswordResetOtp = (identifier) => {
    return dispatch(requestPasswordReset(identifier))
  }

  const verifyResetOtp = (identifier, code) => {
    return dispatch(verifyResetOtpAction({ identifier, code }))
  }

  const resetAccountPassword = (identifier, code, newPassword) => {
    return dispatch(resetPasswordAction({ identifier, code, newPassword }))
  }

  return {
    currentUser,
    isAuthenticated,
    token,
    loading,
    error,
    successMsg,
    logout,
    updateProfile,
    clearStatus,
    handleAcceptInvitation,
    handleAcceptSsoInvitation,
    login,
    loginGoogle,
    loginMicrosoft,
    register,
    verifyRegistration,
    checkPermission,
    otpSent,
    sendOtp,
    verifyOtp,
    sendPasswordResetOtp,
    verifyResetOtp,
    resetAccountPassword,
  }
}

export default useAuth
