export type Thanable<T> = {
  then: Promise<T>['then']
  catch: Promise<T>['catch']
}
export function is_thenable<T>(inp?: any): inp is Thanable<T> {
  return typeof inp == 'object' && 'then' in inp
}
