import { useDispatch, useSelector } from 'react-redux'
import { logout as logoutAction } from '../authSlice'

/**
  * useAuth Custom Hook
  *
  * Controller hook encapsulating auth state selectors and action dispatchers.
  * Follows the "Thin View" architectural pattern.
  */
export const useAuth = () => {
  const dispatch = useDispatch()
  const currentUser = useSelector((state) => state.auth.user)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  const logout = () => {
    dispatch(logoutAction())
  }

  return {
    currentUser,
    isAuthenticated,
    logout,
  }
}

export default useAuth
