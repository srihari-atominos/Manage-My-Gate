import React, { useEffect } from 'react';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import useResidentHistory from '../hooks/useResidentHistory.js';
import CancelBookingModal from '../components/booking/CancelBookingModal.jsx';
import { cancelBooking } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';
import { CalendarX } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';

const calculateDuration = (start, end) => {
  if (!start || !end) return '';
  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  try {
    const startMins = parseTime(start);
    const endMins = parseTime(end);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    return `${diff} Mins`;
  } catch (e) {
    return '';
  }
};

const ResidentHistoryView = () => {
  const { bookings, loading, error, loadBookings } = useResidentHistory();
  const [bookingToCancel, setBookingToCancel] = React.useState(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const getStatusBadge = (status) => {
    let classes = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase ';
    switch (status) {
      case 'confirmed':
        classes += 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400';
        return <span className={classes}>Confirmed</span>;
      case 'completed':
        classes += 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400';
        return <span className={classes}>Completed</span>;
      case 'checked-in':
        classes += 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
        return <span className={classes}>Checked In</span>;
      case 'pending':
        classes += 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
        return <span className={classes}>Pending</span>;
      case 'cancelled':
        classes += 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
        return <span className={classes}>Cancelled</span>;
      default:
        classes += 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400';
        return <span className={classes}>{status}</span>;
    }
  };

  const getEntryStatusBadge = (status, qrStatus) => {
    let classes = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase ';
    if (qrStatus === 'expired') {
      return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Expired</span>;
    }
    switch (status) {
      case 'checked-in':
        return <span className={classes + 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'}>Entered</span>;
      case 'completed':
        return <span className={classes + 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'}>Completed</span>;
      case 'cancelled':
        return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Cancelled</span>;
      default:
        return <span className={classes + 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}>Not Entered</span>;
    }
  };

  const getQrStatusBadge = (qrStatus, status) => {
    let classes = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase ';
    if (status === 'cancelled') {
      return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Revoked</span>;
    }
    switch (qrStatus) {
      case 'active':
        return <span className={classes + 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'}>Active</span>;
      case 'expired':
        return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Expired</span>;
      case 'revoked':
        return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Revoked</span>;
      default:
        return <span className={classes + 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'}>{qrStatus || 'N/A'}</span>;
    }
  };

  const getPaymentStatusBadge = (status) => {
    let classes = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase ';
    switch (status) {
      case 'success':
        return <span className={classes + 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'}>Paid</span>;
      case 'pending':
        return <span className={classes + 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}>Unpaid</span>;
      case 'failed':
        return <span className={classes + 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}>Failed</span>;
      case 'refunded':
        return <span className={classes + 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'}>Refunded</span>;
      case 'partial_refund':
        return <span className={classes + 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'}>Partial Refund</span>;
      default:
        return null;
    }
  };

  const handleConfirmCancel = async (bookingId, reason) => {
    setIsCancelling(true);
    try {
      await cancelBooking(bookingId, reason);
      toast.success('Booking cancelled successfully.');
      setBookingToCancel(null);
      loadBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <AmenitiesTopNav />
      
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-black dark:text-white">Booking History</h2>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading bookings history...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-stroke bg-white p-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark space-y-3">
            <CalendarX className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto" />
            <h4 className="text-base font-bold text-black dark:text-white">No History Found</h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs">You haven't made any bookings yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-meta-4/20 border-b border-stroke dark:border-strokedark text-gray-500 dark:text-gray-400 font-semibold">
                    <th className="py-3 px-5">Booking ID</th>
                    <th className="py-3 px-5">Amenity</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-5">Booking Status</th>
                    <th className="py-3 px-5">Entry Status</th>
                    <th className="py-3 px-5">Check In / Out</th>
                    <th className="py-3 px-5">Payment Status</th>
                    <th className="py-3 px-5">QR Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {bookings.map((booking) => (
                    <tr key={booking._id} id={`res-booking-row-${booking._id}`} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-4 px-5 font-bold text-primary">
                        {booking.bookingId || booking._id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={booking.amenityId?.images?.[0] || 'https://via.placeholder.com/40'} 
                            alt={booking.amenityId?.name}
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-stroke dark:border-strokedark"
                          />
                          <span className="font-bold text-black dark:text-white">{booking.amenityId?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-black dark:text-white">{booking.bookingDate}</td>
                      <td className="py-4 px-5 font-semibold text-black dark:text-white">
                        {booking.startTime} - {booking.endTime}
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                          Duration: {calculateDuration(booking.startTime, booking.endTime)}
                        </div>
                      </td>
                      <td className="py-4 px-5">{getStatusBadge(booking.status)}</td>
                      <td className="py-4 px-5">{getEntryStatusBadge(booking.status, booking.qrStatus)}</td>
                      <td className="py-4 px-5 text-gray-700 dark:text-gray-300">
                        {booking.checkInTime ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 dark:text-gray-500 font-semibold text-[10px]">IN:</span> 
                            <span>{new Date(booking.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ) : '-'}
                        {booking.checkOutTime ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-400 dark:text-gray-500 font-semibold text-[10px]">OUT:</span> 
                            <span>{new Date(booking.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="py-4 px-5">{getPaymentStatusBadge(booking.paymentStatus)}</td>
                      <td className="py-4 px-5">{getQrStatusBadge(booking.qrStatus, booking.status)}</td>
                      <td className="py-4 px-5 text-right">
                        {['pending', 'confirmed'].includes(booking.status) && (
                          <Button 
                            variant="destructive"
                            size="sm"
                            className="text-[10px] h-7 px-3.5"
                            onClick={() => setBookingToCancel(booking)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CancelBookingModal 
        visible={!!bookingToCancel} 
        onClose={() => setBookingToCancel(null)} 
        onConfirm={handleConfirmCancel} 
        booking={bookingToCancel} 
        isSubmitting={isCancelling} 
      />
    </div>
  );
};

export default ResidentHistoryView;
