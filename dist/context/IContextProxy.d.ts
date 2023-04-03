import { StageObject } from './utils/types';
import { ContextType } from './ContextType';
import { OriginalObject } from '.';
export interface IContextProxy<T extends StageObject> {
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(parent: ContextType<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends StageObject>(config?: C): ContextType<T & C>;
    get(path: keyof T): any;
    get original(): T;
    [OriginalObject]?: true;
    [key: string | symbol | number]: any;
}
//# sourceMappingURL=IContextProxy.d.ts.map