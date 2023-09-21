export type Thenable<T> = {
  then: Promise<T>['then']
  catch: Promise<T>['catch']
  finally: Promise<T>['finally']
}
export function is_thenable<T>(inp?: any): inp is Thenable<T> {
  return typeof inp == 'object' && 'then' in inp
}
