import React from 'react'
import PropTypes from 'prop-types'

export const LoadingSkeleton = ({ count = 3 }) => {
  const skeletons = Array.from({ length: count })

  return (
    <div className="flex flex-col gap-4">
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark animate-pulse min-h-[160px] flex flex-col justify-between"
        >
          <div className="space-y-3">
            {/* Header Badges Placeholder */}
            <div className="flex gap-2">
              <div className="bg-slate-200 dark:bg-meta-4 rounded h-4.5 w-20" />
              <div className="bg-slate-200 dark:bg-meta-4 rounded h-4.5 w-16" />
              <div className="bg-slate-200 dark:bg-meta-4 rounded h-4.5 w-12 ml-auto" />
            </div>

            {/* Title Placeholder */}
            <div className="bg-slate-200 dark:bg-meta-4 rounded h-5.5 w-3/4" />

            {/* Description lines */}
            <div className="bg-slate-200 dark:bg-meta-4 rounded h-4 w-full" />
            <div className="bg-slate-200 dark:bg-meta-4 rounded h-4 w-[90%]" />
          </div>

          {/* Footer Metadata & Actions */}
          <div className="flex justify-between items-center mt-6 pt-3 border-t border-stroke/50 dark:border-strokedark/50">
            <div className="bg-slate-200 dark:bg-meta-4 rounded h-4 w-36" />
            <div className="bg-slate-200 dark:bg-meta-4 rounded h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

LoadingSkeleton.propTypes = {
  count: PropTypes.number,
}

export default LoadingSkeleton
