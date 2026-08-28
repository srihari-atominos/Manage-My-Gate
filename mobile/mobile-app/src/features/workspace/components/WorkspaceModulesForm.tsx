import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/forms/Checkbox';
import { useWorkspace } from '../hooks/useWorkspace';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { WorkspaceModule } from '../store/workspaceSlice';

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
        <ActivityIndicator size="small" />
        <Text className="text-muted-foreground mt-2">Loading modules...</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="mb-2">
        <Text className="text-lg font-bold text-foreground mb-1">Active Modules</Text>
        <Text className="text-sm text-muted-foreground">
          Enable or disable features for your workspace.
        </Text>
      </View>

      <View className="bg-card rounded-xl border border-border p-4 gap-2">
        {allModules.length === 0 && !loading && (
          <Text className="text-muted-foreground text-center py-4">No modules available</Text>
        )}
        
        {allModules.map((module) => (
          <View key={module._id || module.moduleKey} className="py-2">
            <Checkbox
              label={module.moduleName}
              description={`Route: ${module.route}`}
              checked={module.enabled}
              onCheckedChange={(val) => handleToggle(module, val)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};
