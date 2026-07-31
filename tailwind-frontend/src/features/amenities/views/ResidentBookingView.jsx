import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Tag } from 'lucide-react';
import useResidentBooking from '../hooks/useResidentBooking.js';
import BookingStepper from '../components/booking/BookingStepper.jsx';
import DateSelector from '../components/booking/DateSelector.jsx';
import TimeSlotSelector from '../components/booking/TimeSlotSelector.jsx';
import BookingSummary from '../components/booking/BookingSummary.jsx';
import BookingConfirmationModal from '../components/booking/BookingConfirmationModal.jsx';
import BookingSuccess from '../components/booking/BookingSuccess.jsx';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import { Button } from 'src/components/ui/button';

const ResidentBookingView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const {
    amenity,
    loading,
    slotsLoading,
    availableSlots,
    step,
    draft,
    errorMsg,
    paymentIntent,
    updateDraft,
    proceedToTime,
    goBack,
    confirmBooking,
    processMockPayment,
    complete
  } = useResidentBooking(id);

  if (loading && !amenity) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading amenity details...</div>
      </div>
    );
  }

  if (!amenity && !loading) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 text-center py-16">
        <h4 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-4">Amenity not found</h4>
        <Button variant="outline" onClick={() => navigate('/resident/amenities/discover')}>
          Back to Discover
        </Button>
      </div>
    );
  }

  const handleFinalConfirm = async () => {
    await confirmBooking();
    setConfirmationVisible(false);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      <AmenitiesTopNav />
      
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/resident/amenities/discover')}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-0 flex items-center gap-1 bg-transparent hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Amenities</span>
          </Button>
        </div>

        {/* Amenity details card */}
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <img 
              src={amenity.images?.[0] || 'https://via.placeholder.com/150'} 
              alt={amenity.name} 
              className="w-20 h-20 object-cover rounded-xl shrink-0" 
            />
            <div className="min-w-0">
              <h4 className="text-lg font-bold text-black dark:text-white mb-2">{amenity.name}</h4>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> 
                  {amenity.location}
                </span>
                {amenity.bookingRules && amenity.bookingRules.openTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-success shrink-0" /> 
                    {amenity.bookingRules.openTime} - {amenity.bookingRules.closeTime}
                  </span>
                )}
                {amenity.pricing && amenity.pricing.baseRate !== undefined && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-warning shrink-0" /> 
                    ${amenity.pricing.baseRate} / {amenity.pricing.pricingType || 'hour'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {step !== 'success' && <BookingStepper currentStep={step} />}

        {step === 'date' && (
          <DateSelector 
            draft={draft} 
            updateDraft={updateDraft} 
            onNext={proceedToTime} 
            errorMsg={errorMsg}
          />
        )}

        {(step === 'time' || step === 'submitting') && (
          <div className="space-y-6">
            <TimeSlotSelector 
              draft={draft} 
              availableSlots={availableSlots}
              slotsLoading={slotsLoading}
              updateDraft={updateDraft}
              onBack={goBack}
              errorMsg={errorMsg}
            />

            {draft.startTime && draft.endTime && (
              <BookingSummary
                draft={draft}
                amenity={amenity}
                onConfirm={() => setConfirmationVisible(true)}
                onBack={goBack}
              />
            )}
          </div>
        )}

        {step === 'payment' && (
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark text-center space-y-4">
            <h4 className="text-base font-bold text-black dark:text-white">Mock Payment Gateway</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Simulate a payment for your booking of <strong>${paymentIntent?.amount || draft.totalPrice}</strong>
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Button variant="destructive" className="text-xs" onClick={() => processMockPayment(false)}>
                Simulate Failure
              </Button>
              <Button className="text-xs" onClick={() => processMockPayment(true)}>
                Simulate Success
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <BookingSuccess
            amenity={amenity}
            draft={draft}
            onComplete={complete}
          />
        )}

        <BookingConfirmationModal
          visible={confirmationVisible}
          draft={draft}
          amenity={amenity}
          onClose={() => setConfirmationVisible(false)}
          onConfirm={handleFinalConfirm}
          isSubmitting={step === 'submitting'}
        />
      </div>
    </div>
  );
};

export default ResidentBookingView;
