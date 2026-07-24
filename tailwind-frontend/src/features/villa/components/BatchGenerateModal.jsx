import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { batchGenerateVillasAsync, fetchVillasAsync } from '../store/villaSlice';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const BatchGenerateModal = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  // Local form state
  const [prefix, setPrefix] = useState('Villa');
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(54);
  const [blockOrBuilding, setBlockOrBuilding] = useState('Block A');
  const [type, setType] = useState('Apartment');
  const [floorAreaSqFt, setFloorAreaSqFt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (startNumber > endNumber) {
      setError(t('villas.batch.errorStartEnd', 'Start number must be less than or equal to end number.'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resultAction = await dispatch(batchGenerateVillasAsync({
        startNumber,
        endNumber,
        prefix,
        config: {
          blockOrBuilding,
          type,
          floorAreaSqFt: floorAreaSqFt ? parseFloat(floorAreaSqFt) : null
        }
      }));

      if (batchGenerateVillasAsync.fulfilled.match(resultAction)) {
        toast.success(t('villas.batch.successMsg', `Successfully generated ${resultAction.payload.length} units!`));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        dispatch(fetchVillasAsync({ page: 1, limit: 12 }));
        onClose();
      } else {
        setError(resultAction.payload || t('villas.batch.failedMsg', 'Failed to batch generate units.'));
      }
    } catch (err) {
      setError(err.message || t('villas.batch.unexpectedError', 'An unexpected error occurred.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {t('villas.batch.title', 'Batch Generate Units')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="batch-prefix" className="text-sm font-semibold">
              {t('villas.batch.prefix', 'Unit Prefix')}
            </Label>
            <Input
              id="batch-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. Villa"
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
            <p className="text-gray-400 dark:text-gray-500 text-3xs mt-1.5">
              {t('villas.batch.prefixDesc', 'Suffix numbers will be appended automatically, e.g. "Villa 01".')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batch-start" className="text-sm font-semibold">
                {t('villas.batch.start', 'Start Range')}
              </Label>
              <Input
                id="batch-start"
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="batch-end" className="text-sm font-semibold">
                {t('villas.batch.end', 'End Range')}
              </Label>
              <Input
                id="batch-end"
                type="number"
                min="1"
                value={endNumber}
                onChange={(e) => setEndNumber(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batch-block" className="text-sm font-semibold">
                {t('villas.batch.blockOrBuilding', 'Block / Building')}
              </Label>
              <Input
                id="batch-block"
                value={blockOrBuilding}
                onChange={(e) => setBlockOrBuilding(e.target.value)}
                placeholder="e.g. Block A"
                className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="batch-config" className="text-sm font-semibold">
                {t('villas.batch.type', 'Unit Type')}
              </Label>
              <select
                id="batch-config"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
              >
                <option value="Studio" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Studio', 'Studio')}</option>
                <option value="Apartment" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Apartment', 'Apartment')}</option>
                <option value="Villa" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Villa', 'Villa')}</option>
                <option value="Penthouse" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Penthouse', 'Penthouse')}</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="batch-floor-area" className="text-sm font-semibold">
              {t('villas.batch.floorArea', 'Floor Area (Sq Ft)')}
            </Label>
            <Input
              id="batch-floor-area"
              type="number"
              value={floorAreaSqFt}
              onChange={(e) => setFloorAreaSqFt(e.target.value)}
              placeholder="e.g. 1500"
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              {t('villas.batch.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={submitting}
              className="text-xs font-semibold px-4 py-2"
            >
              {submitting ? t('villas.batch.generating', 'Generating...') : t('villas.batch.submit', 'Generate Units')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BatchGenerateModal;
