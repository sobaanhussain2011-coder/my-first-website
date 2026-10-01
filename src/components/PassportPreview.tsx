interface Props {
  imageDataUrl: string
  photographDataUrl: string | null
  fileName: string
}

export function PassportPreview({ imageDataUrl, photographDataUrl, fileName }: Props) {
  return (
    <div className="animate-fade-up space-y-4">
      <div className="panel overflow-hidden rounded-2xl">
        <div className="border-b border-ink/8 px-4 py-3">
          <h3 className="font-display text-sm font-semibold text-ink">Uploaded preview</h3>
          <p className="truncate text-xs text-ink/50">{fileName}</p>
        </div>
        <div className="bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] p-3">
          <img
            src={imageDataUrl}
            alt="Uploaded passport document preview"
            className="mx-auto max-h-[520px] w-full rounded-lg object-contain shadow-md"
          />
        </div>
      </div>

      <div className="panel rounded-2xl p-4">
        <h3 className="font-display text-sm font-semibold text-ink">Passport photograph</h3>
        {photographDataUrl ? (
          <img
            src={photographDataUrl}
            alt="Detected passport photograph crop"
            className="mt-3 h-40 w-32 rounded-lg object-cover shadow"
          />
        ) : (
          <p className="mt-2 text-sm text-ink/55">
            No photograph was detected. You can still create the Excel file without an embedded photo.
          </p>
        )}
      </div>
    </div>
  )
}
