import React from 'react'

const SearchBarApp = ({ children, style }) => {
  return (
    <div className="search-bar-app" style={style}>
      {children}
    </div>
  )
}

export default SearchBarApp
