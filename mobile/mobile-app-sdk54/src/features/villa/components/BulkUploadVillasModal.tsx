import React, { useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/ui/icon';
import { Download, UploadCloud, CheckCircle } from 'lucide-react-native';
import { VillaPayload } from '../services/villaService';
import { downloadCSVFile } from '@/src/utils/downloadHelper';

interface BulkUploadVillasModalProps {
  visible: boolean;
  onClose: () => void;
  onBulkUpload: (villas: VillaPayload[]) => Promise<any>;
  onDownloadTemplate?: () => Promise<any>;
  loading?: boolean;
}

const DEFAULT_VILLA_CSV_TEMPLATE = `Unit Number,Block/Building,Floor,Unit Type,Floor Area (Sq Ft),Occupancy Status,Resident Name,Resident Email,Resident Type
101,Block A,1,Apartment,1200,Vacant,,,
102,Block A,1,Apartment,1200,Occupied,John Doe,john@example.com,Resident Owner
201,Block B,2,Villa,2400,Vacant,,,`;

export const BulkUploadVillasModal: React.FC<BulkUploadVillasModalProps> = ({
  visible,
  onClose,
  onBulkUpload,
  onDownloadTemplate,
  loading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [parsedData, setParsedData] = useState<VillaPayload[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePickDocument = async () => {
    try {
      setErrorMsg(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset);

        if (asset.uri) {
          try {
            const fileContent = await fetch(asset.uri).then((res) => res.text());
            const lines = fileContent.split(/\r?\n/).filter((l) => l.trim());
            if (lines.length > 1) {
              const rows: VillaPayload[] = [];
              for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
                if (cols[0]) {
                  rows.push({
                    unitNumber: cols[0],
                    blockOrBuilding: cols[1] || 'Main Block',
                    floor: cols[2] ? Number(cols[2]) : undefined,
                    squareFeetArea: cols[3] ? Number(cols[3]) : undefined,
                    type: cols[4] || 'Standard Villa',
                    status: (cols[5] as any) || 'Vacant',
                  });
                }
              }
              setParsedData(rows);
            }
          } catch (e) {
            console.log('[BulkUploadModal] Text parse fallback:', e);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to pick file');
    }
  };

  const handleDownloadTemplateClick = async () => {
    try {
      let content: any = DEFAULT_VILLA_CSV_TEMPLATE;
      if (onDownloadTemplate) {
        const res = await onDownloadTemplate();
        if (res && res.data) {
          content = res.data;
        }
      }
      await downloadCSVFile(content, 'bulk_upload_units_template.csv');
    } catch (e) {
      console.log('[BulkUploadModal] Falling back to default CSV template content');
      await downloadCSVFile(DEFAULT_VILLA_CSV_TEMPLATE, 'bulk_upload_units_template.csv');
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      setErrorMsg('No valid unit rows found in the selected file.');
      return;
    }
    setErrorMsg(null);
    try {
      await onBulkUpload(parsedData);
      setSelectedFile(null);
      setParsedData([]);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Bulk upload failed');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Bulk Upload Units Directory">
      <View className="space-y-4 py-2">
        <Text variant="muted" className="text-xs">
          Upload a CSV spreadsheet containing unit numbers, block names, floors, area sq.ft, and occupancy status.
        </Text>

        {errorMsg && (
          <Text className="text-xs font-semibold text-destructive">{errorMsg}</Text>
        )}

        {/* Template Download Trigger Button */}
        <TouchableOpacity
          onPress={handleDownloadTemplateClick}
          className="flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 active:opacity-80"
        >
          <Icon as={Download} size={16} className="text-primary" />
          <Text className="text-xs font-bold text-primary">Download CSV Template</Text>
        </TouchableOpacity>

        {/* File Picker Box */}
        <TouchableOpacity
          onPress={handlePickDocument}
          className="border-2 border-dashed border-primary/40 bg-primary/5 p-6 rounded-2xl items-center justify-center space-y-2 active:opacity-80 mt-2"
        >
          <View className="size-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-1">
            <Icon as={UploadCloud} size={24} className="text-primary" />
          </View>
          <Text className="text-sm font-bold text-foreground text-center">
            {selectedFile ? selectedFile.name : 'Tap to select CSV / Excel file'}
          </Text>
          <Text variant="muted" className="text-xs text-center">
            {selectedFile ? `${(selectedFile.size || 0) / 1000} KB • ${parsedData.length} units parsed` : 'Supports .csv files'}
          </Text>
        </TouchableOpacity>

        {parsedData.length > 0 && (
          <View className="flex-row items-center gap-2 bg-status-success/10 border border-status-success/20 p-3 rounded-xl">
            <Icon as={CheckCircle} size={18} className="text-status-success" />
            <Text className="text-xs font-semibold text-status-success flex-1">
              Ready to import {parsedData.length} unit records.
            </Text>
          </View>
        )}

        <View className="pt-2">
          <Button
            variant="default"
            onPress={handleUpload}
            disabled={loading || parsedData.length === 0}
          >
            {loading ? <ActivityIndicator color="#fff" /> : `Import ${parsedData.length} Units`}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default BulkUploadVillasModal;
