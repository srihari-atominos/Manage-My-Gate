import React, { useEffect } from 'react'

const RefundPolicyPage = () => {
  useEffect(() => {
    document.title = 'Refund & Cancellation Policy - Nahom'
  }, [])

  return (
    <main className="container py-5" style={{ maxWidth: 920 }}>
      <h1 className="mb-3">Refund &amp; Cancellation Policy</h1>
      <p className="text-body-secondary">Last updated: October 2026</p>
      <p>
        Refunds for amenity bookings, deposits, and wallet payments are calculated using the
        cancellation policy shown before confirmation. The applicable community policy is saved
        with each booking and controls the refund amount.
      </p>
      <h2 className="h4 mt-4">Amenity cancellations</h2>
      <p>
        Where a booking is eligible, the refundable amount is credited to the resident wallet after
        cancellation. Bookings cancelled after the configured cutoff may receive no booking refund.
        Any refundable security deposit is handled separately according to the booking terms.
      </p>
      <h2 className="h4 mt-4">Wallet refunds</h2>
      <p>
        Unused wallet funds added through a verified online top-up may be refundable where permitted
        by the applicable payment and community rules. Refunds are subject to the minimum amount
        and processing conditions shown in the app.
      </p>
      <h2 className="h4 mt-4">Support</h2>
      <p>
        If a refund is missing or the amount appears incorrect, contact your community administrator
        or <a href="mailto:support@managemygate.com">support@managemygate.com</a> with the booking
        or transaction reference.
      </p>
    </main>
  )
}

export default RefundPolicyPage
