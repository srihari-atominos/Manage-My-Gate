import React, { useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Download, UploadCloud, CheckCircle, FileText, Trash2, User, Sparkles } from 'lucide-react-native';
import { VillaPayload } from '../services/villaService';
import { downloadCSVFile } from '@/src/utils/downloadHelper';

interface BulkUploadVillasModalProps {
  visible: boolean;
  onClose: () => void;
  onBulkUpload: (villas: VillaPayload[]) => Promise<any>;
  onDownloadTemplate?: () => Promise<any>;
  loading?: boolean;
}

export const DEFAULT_VILLA_CSV_TEMPLATE = `Unit Number,Block/Building,Floor,Unit Type,Floor Area (Sq Ft),Occupancy Status,Resident Name,Resident Email,Resident Type,Phone Number
101,Block A,1,Apartment,1200,Vacant,,,,
102,Block A,1,2 BHK,1350,Occupied,John Doe,john@example.com,Resident Owner,9876543210
103,Block A,2,3 BHK,1600,Occupied,Jane Smith,jane@example.com,Tenant,9876543211
201,Block B,1,Villa,2400,Under Maintenance,,,,
202,Block B,2,Penthouse,3200,Occupied,Alice Johnson,alice@example.com,Family Member,9876543212`;

/**
 * Dynamic CSV line parser handling quotes and flexible headers
 */
export const parseVillaCSV = (fileContent: string): VillaPayload[] => {
  const rawLines = fileContent.split(/\r?\n/).filter((l) => l.trim());
  if (rawLines.length < 2) return [];

  // Helper to split CSV row handling quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(rawLines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const rows: VillaPayload[] = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i]);
    if (!cols || cols.length === 0 || !cols[0]) continue;

    const rowObj: VillaPayload = {
      unitNumber: cols[0],
      blockOrBuilding: 'Main Block',
      type: 'Apartment',
      status: 'Vacant',
    };

    if (headers.length > 0 && headers.some((h) => h.length > 0)) {
      headers.forEach((hdr, idx) => {
        const val = cols[idx] ? cols[idx].trim() : '';
        if (!val) return;

        if (hdr.includes('unitnumber') || hdr.includes('unitno') || (hdr.includes('unit') && !hdr.includes('type'))) {
          rowObj.unitNumber = val;
        } else if (hdr.includes('block') || hdr.includes('building')) {
          rowObj.blockOrBuilding = val;
        } else if (hdr.includes('unittype') || (hdr.includes('type') && !hdr.includes('resident'))) {
          const lowerVal = val.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lowerVal === 'studio') rowObj.type = 'Studio';
          else if (lowerVal === 'apartment') rowObj.type = 'Apartment';
          else if (lowerVal === 'villa') rowObj.type = 'Villa';
          else if (lowerVal === 'penthouse') rowObj.type = 'Penthouse';
          else if (lowerVal === 'duplex') rowObj.type = 'Duplex';
          else if (lowerVal === '1bhk' || lowerVal === '1bha' || lowerVal === 'bhk1' || lowerVal === '1') rowObj.type = '1 BHK';
          else if (lowerVal === '2bhk' || lowerVal === '2bha' || lowerVal === 'bhk2' || lowerVal === '2') rowObj.type = '2 BHK';
          else if (lowerVal === '3bhk' || lowerVal === '3bha' || lowerVal === 'bhk3' || lowerVal === '3') rowObj.type = '3 BHK';
          else if (lowerVal === '4bhk' || lowerVal === '4bha' || lowerVal === 'bhk4' || lowerVal === '4') rowObj.type = '4 BHK';
          else rowObj.type = val;
        } else if (hdr.includes('floorarea') || hdr.includes('sqft') || hdr.includes('area')) {
          const num = Number(val);
          if (!isNaN(num)) {
            rowObj.squareFeetArea = num;
            rowObj.floorAreaSqFt = num;
          }
        } else if (hdr.includes('occupancy') || hdr.includes('status')) {
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('occupied')) rowObj.status = 'Occupied';
          else if (lowerVal.includes('maintenance')) rowObj.status = 'Under Maintenance';
          else rowObj.status = 'Vacant';
        } else if (hdr.includes('floor') && !hdr.includes('area')) {
          rowObj.floor = isNaN(Number(val)) ? val : Number(val);
        } else if (hdr.includes('residentname') || (hdr.includes('name') && !hdr.includes('block'))) {
          rowObj.name = val;
        } else if (hdr.includes('residentemail') || hdr.includes('email')) {
          rowObj.email = val;
        } else if (hdr.includes('residenttype')) {
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('owner')) rowObj.residentType = 'Resident Owner';
          else if (lowerVal.includes('tenant')) rowObj.residentType = 'Tenant';
          else if (lowerVal.includes('family')) rowObj.residentType = 'Family Member';
          else rowObj.residentType = val;
        } else if (hdr.includes('phone') || hdr.includes('mobile')) {
          rowObj.phone = val;
        }
      });
    } else {
      // Fallback positional indexing if headers are missing
      rowObj.unitNumber = cols[0];
      rowObj.blockOrBuilding = cols[1] || 'Main Block';
      rowObj.floor = cols[2] ? (isNaN(Number(cols[2])) ? cols[2] : Number(cols[2])) : undefined;
      rowObj.type = cols[3] || 'Apartment';
      rowObj.squareFeetArea = cols[4] ? Number(cols[4]) : undefined;
      rowObj.floorAreaSqFt = cols[4] ? Number(cols[4]) : undefined;
      rowObj.status = cols[5] ? (cols[5].toLowerCase().includes('occupied') ? 'Occupied' : cols[5].toLowerCase().includes('maintenance') ? 'Under Maintenance' : 'Vacant') : 'Vacant';
      rowObj.name = cols[6] || undefined;
      rowObj.email = cols[7] || undefined;
      rowObj.residentType = cols[8] ? (cols[8].toLowerCase().includes('owner') ? 'Resident Owner' : cols[8].toLowerCase().includes('family') ? 'Family Member' : 'Tenant') : undefined;
      rowObj.phone = cols[9] || undefined;
    }

    if (rowObj.unitNumber) {
      rows.push(rowObj);
    }
  }

  return rows;
};

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
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/comma-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset);

        if (asset.uri) {
          try {
            const fileContent = await fetch(asset.uri).then((res) => res.text());
            const parsed = parseVillaCSV(fileContent);
            if (parsed.length === 0) {
              setErrorMsg('No valid unit rows could be parsed. Please check your CSV format.');
            } else {
              setParsedData(parsed);
            }
          } catch (e: any) {
            console.log('[BulkUploadModal] Text parse error:', e);
            setErrorMsg('Failed to parse file content. Please upload a valid CSV file.');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to pick file');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedData([]);
    setErrorMsg(null);
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
      handleClearFile();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Bulk upload failed');
    }
  };

  const getStatusVariant = (status?: string) => {
    if (status === 'Occupied') return 'info';
    if (status === 'Under Maintenance') return 'warning';
    return 'success';
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Bulk Upload Units Directory">
      <View className="space-y-4 py-2">
        <Text variant="muted" className="text-xs text-start">
          Upload a CSV file to add multiple community units and optional resident invitations in bulk.
        </Text>

        {errorMsg && (
          <View className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-destructive text-start">{errorMsg}</Text>
          </View>
        )}

        {/* Template Download Trigger Button */}
        <TouchableOpacity
          onPress={handleDownloadTemplateClick}
          className="flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Download CSV Template"
        >
          <Icon as={Download} size={16} className="text-primary" />
          <Text className="text-xs font-bold text-primary">Download Sample CSV Template</Text>
        </TouchableOpacity>

        {/* CSV Format Guide when no file selected */}
        {!selectedFile && (
          <View className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5">
            <View className="flex-row items-center gap-2">
              <Icon as={FileText} size={16} className="text-primary" />
              <Text className="text-xs font-bold text-foreground text-start">Sample CSV Format & Structure</Text>
            </View>

            {/* Easy-to-understand Example Data Preview Cards */}
            <View className="space-y-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
              <View className="flex-row items-center justify-between border-b border-border/40 pb-1.5">
                <Text className="text-[11px] font-bold text-foreground">Unit #101 (Vacant Example)</Text>
                <StatusBadge label="Vacant" variant="success" size="sm" />
              </View>
              <Text className="text-[11px] text-muted-foreground text-start">
                Block A • Floor 1 • Apartment • 1,200 sq.ft
              </Text>

              <View className="flex-row items-center justify-between border-t border-border/40 pt-2 border-b pb-1.5">
                <Text className="text-[11px] font-bold text-foreground">Unit #102 (Occupied + Resident)</Text>
                <StatusBadge label="Occupied" variant="info" size="sm" />
              </View>
              <Text className="text-[11px] text-muted-foreground text-start">
                Block A • Floor 1 • 2 BHK • 1,350 sq.ft
              </Text>
              <Text className="text-[11px] font-medium text-primary text-start">
                👤 John Doe (john@example.com) • Resident Owner
              </Text>
            </View>

            {/* Supported Field Values Reference */}
            <View className="space-y-1 pt-1 border-t border-border/40">
              <Text className="text-[10px] text-muted-foreground text-start">
                <Text className="font-bold text-foreground">Occupancy Status:</Text> Vacant, Occupied, Under Maintenance
              </Text>
              <Text className="text-[10px] text-muted-foreground text-start">
                <Text className="font-bold text-foreground">Resident Type:</Text> Tenant, Resident Owner, Family Member
              </Text>
              <Text className="text-[10px] text-muted-foreground text-start">
                <Text className="font-bold text-foreground">Unit Type:</Text> Apartment, Villa, Studio, Penthouse, 1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex
              </Text>
            </View>
          </View>
        )}

        {/* File Selection Box */}
        {!selectedFile ? (
          <TouchableOpacity
            onPress={handlePickDocument}
            className="border-2 border-dashed border-primary/40 bg-primary/5 p-5 rounded-2xl items-center justify-center space-y-2 active:opacity-80 mt-1"
            accessibilityRole="button"
            accessibilityLabel="Tap to select CSV file"
          >
            <View className="size-11 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-0.5">
              <Icon as={UploadCloud} size={22} className="text-primary" />
            </View>
            <Text className="text-xs font-bold text-foreground text-center">
              Tap to select CSV spreadsheet
            </Text>
            <Text variant="muted" className="text-[11px] text-center">
              Supports .csv formatted spreadsheets
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="space-y-3">
            {/* Selected File Card */}
            <View className="flex-row items-center justify-between bg-card border border-border p-3 rounded-xl">
              <View className="flex-row items-center gap-2.5 flex-1 me-2">
                <View className="size-9 rounded-lg bg-primary/10 items-center justify-center">
                  <Icon as={FileText} size={18} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text variant="muted" className="text-[10px]">
                    {((selectedFile.size || 0) / 1000).toFixed(1)} KB • {parsedData.length} units parsed
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClearFile}
                className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Clear file"
              >
                <Icon as={Trash2} size={16} className="text-destructive" />
              </TouchableOpacity>
            </View>

            {/* Parsed Sample Data Preview (Strict 3 items limit per catalog rules) */}
            {parsedData.length > 0 && (
              <View className="bg-card border border-border rounded-xl p-3 space-y-2">
                <View className="flex-row items-center justify-between border-b border-border/40 pb-2">
                  <View className="flex-row items-center gap-1.5">
                    <Icon as={CheckCircle} size={15} className="text-status-success" />
                    <Text className="text-xs font-bold text-foreground text-start">
                      Parsed Preview (Top {Math.min(3, parsedData.length)} of {parsedData.length})
                    </Text>
                  </View>
                  <Text className="text-[11px] font-semibold text-primary">
                    Ready to Import
                  </Text>
                </View>

                {parsedData.slice(0, 3).map((item, index) => (
                  <View key={index} className="bg-muted/40 p-2.5 rounded-lg space-y-1 border border-border/40">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-foreground text-start">
                        Unit #{item.unitNumber}
                      </Text>
                      <StatusBadge
                        label={item.status || 'Vacant'}
                        variant={getStatusVariant(item.status)}
                        size="sm"
                      />
                    </View>

                    <Text className="text-[11px] text-muted-foreground text-start">
                      {item.blockOrBuilding || 'Main Block'} • {item.type || 'Apartment'}
                      {(item.squareFeetArea || item.floorAreaSqFt) ? ` • ${item.squareFeetArea || item.floorAreaSqFt} sq.ft` : ''}
                      {item.floor ? ` • Floor ${item.floor}` : ''}
                    </Text>

                    {(item.name || item.email) && (
                      <View className="flex-row items-center gap-1 pt-1">
                        <Icon as={User} size={12} className="text-primary" />
                        <Text className="text-[11px] font-medium text-primary text-start flex-1" numberOfLines={1}>
                          {item.name || 'Resident'} {item.email ? `(${item.email})` : ''} {item.residentType ? `• ${item.residentType}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
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
