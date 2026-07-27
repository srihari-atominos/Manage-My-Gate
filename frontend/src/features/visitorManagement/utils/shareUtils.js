/**
 * Utility to convert an SVG element to a PNG image Blob and share it natively or download it.
 * @param {string} svgElementId - ID of the SVG element to copy.
 * @param {Object} passData - Pass details metadata.
 */
export const shareQrCode = async (svgElementId, passData) => {
  const svgElement = document.getElementById(svgElementId)
  if (!svgElement) {
    console.error(`SVG element with ID #${svgElementId} not found.`)
    return
  }

  try {
    const clonedSvg = svgElement.cloneNode(true)
    clonedSvg.setAttribute('width', '256')
    clonedSvg.setAttribute('height', '256')
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }
    const svgString = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const context = canvas.getContext('2d')

      // Fill canvas with white background (necessary for scanner contrast)
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create PNG blob.')
          return
        }

        const passCode = passData.id || passData._id || 'VISITOR-PASS'
        const file = new File([blob], `pass-${passCode}.png`, { type: 'image/png' })
        const shareText = `Here is my visitor entry pass for Villa. Pass Code: ${passCode}`

        // Attempt Native sharing sheet (supported on mobile OS and Safari)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Villa Visitor Pass',
              text: shareText,
            })
            return
          } catch (err) {
            console.log('Native share cancelled or dismissed:', err)
          }
        }

        // Fallback: Download the file automatically for manual attachment
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `pass-${passCode}.png`
        link.click()
      }, 'image/png')
    }
    image.src = blobURL
  } catch (error) {
    console.error('Error rendering and sharing QR code:', error)
  }
}
