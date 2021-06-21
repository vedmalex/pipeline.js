export class ErrorList extends Error {
  errors: Array<any>
  constructor(_list: Array<any> | any) {
    super('Complex Error')
    if (Array.isArray(_list)) {
      const list = _list.filter(e => e)
      if (list.length > 1) {
        this.errors = Array.isArray(list) ? list : [list]
      } else if ((list.length = 1)) {
        return list[0]
      } else {
        return null
      }
    } else {
      return _list
    }
  }
}
