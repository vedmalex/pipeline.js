export class ErrorList extends Error {
  errors: Array<any>
  constructor(list: Array<any> | any) {
    super('Complex Error')
    var self = this
    if (!(self instanceof ErrorList)) {
      throw new Error('constructor is not a function')
    }
    self.message = 'Complex Error'
    self.errors = Array.isArray(list) ? list : [list]
  }
}
