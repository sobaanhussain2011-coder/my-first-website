/// <reference types="vite/client" />

declare module '*.css' {
  const css: string
  export default css
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string
  export default url
}
