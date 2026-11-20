import { checkFile } from './domain/serviceForm'

// Foto ridotte a 1600 px sul lato lungo, JPEG (ricerca 010: WebP su Safari non è affidabile)
export const compressImage = async (file: File, maxSide = 1600, quality = 0.8): Promise<Blob> => {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compressione non riuscita'))), 'image/jpeg', quality),
  )
}

// Foto ridotte, PDF così come sono; controllo della quota del browser prima di salvare
export const prepareAttachment = async (file: File): Promise<{ name: string; type: string; blob: Blob }> => {
  checkFile(file)
  const isImage = file.type.startsWith('image/')
  const blob = isImage ? await compressImage(file) : file
  const est = await navigator.storage?.estimate?.()
  if (est?.quota !== undefined && est.usage !== undefined && est.usage + blob.size > est.quota * 0.9)
    throw new RangeError('Spazio del browser quasi pieno: elimina qualche allegato')
  return { name: isImage ? file.name.replace(/\.\w+$/, '.jpg') : file.name, type: isImage ? 'image/jpeg' : file.type, blob }
}
