import React, { useEffect } from 'react';
import { View, ActivityIndicator, Switch, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useWorkspace } from '../hooks/useWorkspace';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { WorkspaceModule } from '../store/workspaceSlice';
import { ALL_AVAILABLE_FEATURES } from '../../dashboard/dashboardCatalog';

export const WorkspaceModulesForm = () => {
  const { loadWorkspaceModules, toggleModuleStatus, allModules, loading } = useWorkspace();
  
  useEffect(() => {
    loadWorkspaceModules('current');
  }, [loadWorkspaceModules]);

  const handleToggle = (module: WorkspaceModule, enabled: boolean) => {
    toggleModuleStatus('current', module._id, enabled);
  };

  if (loading && allModules.length === 0) {
    return (
      <View className="p-4 items-center justify-center min-h-[200px]">
        <ActivityIndicator size="small" color="#03A9F4" />
        <Text className="text-muted-foreground mt-3 font-sans">Loading modules...</Text>
      </View>
    );
  }

  return (
    <View className="gap-4 pb-8">
      <View className="mb-2">
        <Text className="text-xl font-extrabold text-foreground mb-1">Active Modules</Text>
        <Text className="text-sm text-muted-foreground font-sans">
          Enable or disable high-level features for your community workspace.
        </Text>
      </View>

      <View className="gap-3">
        {allModules.length === 0 && !loading && (
          <View className="bg-card rounded-2xl border border-border p-8 items-center">
            <Text className="text-muted-foreground text-center font-sans">No modules available.</Text>
          </View>
        )}
        
        {[...allModules].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((module) => {
          // Try to map to an existing catalog item for rich colors if possible
          const catalogItem = ALL_AVAILABLE_FEATURES.find(f => f.categoryKey === module.moduleKey);
          
          const iconName = module.icon || catalogItem?.iconName || 'Box';
          const colorIcon = catalogItem?.colorIcon || '#03A9F4';
          const colorBg = catalogItem?.colorBg || 'bg-sky-500/10';
          
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggle(module, !module.enabled)}
              key={module._id || module.moduleKey} 
              className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                module.enabled ? 'bg-card border-primary/30' : 'bg-muted/30 border-border/50'
              }`}
            >
              <View className="flex-row items-center gap-4 flex-1 pr-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${colorBg}`}>
                  <FeatureIcon iconName={iconName} size={24} color={colorIcon} />
                </View>
                <View className="flex-1">
                  <Text className={`text-[15px] font-bold ${module.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {module.moduleName}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5 font-sans" numberOfLines={1}>
                    System path: {module.route}
                  </Text>
                </View>
              </View>
              
              <Switch
                trackColor={{ false: '#e2e8f0', true: '#bae6fd' }}
                thumbColor={module.enabled ? '#0284c7' : '#f8fafc'}
                ios_backgroundColor="#e2e8f0"
                onValueChange={(val) => handleToggle(module, val)}
                value={module.enabled}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
