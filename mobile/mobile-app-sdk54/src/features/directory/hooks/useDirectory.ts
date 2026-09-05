import { useState, useMemo, useCallback } from 'react';
import { DirectoryMember } from '../components/DirectoryContactCard';
import { Alert, Linking, Platform } from 'react-native';

const MOCK_DIRECTORY_MEMBERS: DirectoryMember[] = [
  {
    id: 'dir-1',
    name: 'Ahmed Al-Mansoori',
    role: 'resident',
    designation: 'Villa Owner',
    unitNumber: 'Villa A-101',
    phone: '+971 50 111 2233',
    intercomNumber: '101',
    isOnline: true,
  },
  {
    id: 'dir-2',
    name: 'Sarah Jenkins',
    role: 'resident',
    designation: 'Resident Tenant',
    unitNumber: 'Villa A-104',
    phone: '+971 50 222 3344',
    intercomNumber: '104',
    isOnline: true,
  },
  {
    id: 'dir-3',
    name: 'Guard Tariq Khan',
    role: 'guard',
    designation: 'Main Security Gate',
    unitNumber: 'Gate 1',
    phone: '+971 50 333 4455',
    intercomNumber: '901',
    isOnline: true,
  },
  {
    id: 'dir-4',
    name: 'Guard Rajesh Kumar',
    role: 'guard',
    designation: 'Clubhouse Patrol',
    unitNumber: 'Gate 2',
    phone: '+971 50 444 5566',
    intercomNumber: '902',
    isOnline: false,
  },
  {
    id: 'dir-5',
    name: 'Mikhail Voronin',
    role: 'staff',
    designation: 'Head Electrician',
    unitNumber: 'Facility Office',
    phone: '+971 50 555 6677',
    intercomNumber: '801',
    isOnline: true,
  },
  {
    id: 'dir-6',
    name: 'Suresh Patel',
    role: 'staff',
    designation: 'HVAC Specialist',
    unitNumber: 'Maintenance Hub',
    phone: '+971 50 666 7788',
    intercomNumber: '802',
    isOnline: true,
  },
  {
    id: 'dir-7',
    name: 'Dr. Zaid Al-Nuaimi',
    role: 'admin',
    designation: 'Community Board President',
    unitNumber: 'Villa B-205',
    phone: '+971 50 777 8899',
    intercomNumber: '205',
    isOnline: true,
  },
];

export const useDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<DirectoryMember[]>(MOCK_DIRECTORY_MEMBERS);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Role filter check
      if (activeTab !== 'all') {
        if (activeTab === 'resident' && member.role !== 'resident') return false;
        if (activeTab === 'guard' && member.role !== 'guard') return false;
        if (activeTab === 'staff' && member.role !== 'staff' && member.role !== 'admin') return false;
      }

      // Keyword query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = member.name.toLowerCase().includes(query);
        const matchUnit = member.unitNumber?.toLowerCase().includes(query);
        const matchDesignation = member.designation?.toLowerCase().includes(query);
        const matchIntercom = member.intercomNumber?.includes(query);
        return matchName || matchUnit || matchDesignation || matchIntercom;
      }

      return true;
    });
  }, [members, activeTab, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate network re-fetch
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleIntercom = useCallback((intercom: string) => {
    Alert.alert(
      'Calling Intercom',
      `Initiating direct community voice intercom connection to #${intercom}...`,
      [{ text: 'End Call', style: 'cancel' }]
    );
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    refreshing,
    filteredMembers,
    totalCount: filteredMembers.length,
    onRefresh: handleRefresh,
    onCall: handleCall,
    onIntercom: handleIntercom,
  };
};

export default useDirectory;
