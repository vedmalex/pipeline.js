export class ComplexError extends Error {
  payload: Array<Error | object | string>
  isComplex: boolean
  // to store all details of single error
  constructor(...payload: Array<Error | object | string>) {
    super()
    this.payload = payload
    this.isComplex = true
  }
}
