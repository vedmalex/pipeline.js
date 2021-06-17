export class ErrorList extends Error {
  errors: Array<any>
  constructor(list: Array<any> | any) {
    super('Complex Error')
    if (Array.isArray(list)) {
      if (list.length > 1) {
        this.errors = Array.isArray(list) ? list : [list]
      } else if ((list.length = 1)) {
        return list[0]
      }
    } else {
      return list
    }
  }
}
