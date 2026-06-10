import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import {
  logout as logoutAction,
  updateProfile as updateProfileAction,
  clearStatus as clearStatusAction,
  acceptInvitation,
} from '../authSlice'

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
  const loading = useSelector((state) => state.auth.loading)
  const error = useSelector((state) => state.auth.error)
  const successMsg = useSelector((state) => state.auth.successMsg)

  const logout = () => {
    dispatch(logoutAction())
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
        navigate('/login')
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

  return {
    currentUser,
    isAuthenticated,
    loading,
    error,
    successMsg,
    logout,
    updateProfile,
    clearStatus,
    handleAcceptInvitation,
  }
}

export default useAuth
