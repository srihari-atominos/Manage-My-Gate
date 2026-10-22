import { useLocalSearchParams } from 'expo-router';
import { TransactionDetailsScreen, TransactionEditScreen } from '@/src/features/personalExpense';
export default function TransactionRoute() { const { edit } = useLocalSearchParams<{ edit?: string }>(); return edit === '1' ? <TransactionEditScreen /> : <TransactionDetailsScreen />; }