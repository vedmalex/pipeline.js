export type ComplexErrorInput = Error | object | string | unknown | null | undefined

export class ComplexError extends Error {
  payload: Array<ComplexErrorInput>
  isComplex: boolean
  // to store all details of single error
  constructor(...payload: Array<ComplexErrorInput>) {
    super()
    this.payload = payload
    this.isComplex = true
  }
}
