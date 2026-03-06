export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = {
    [key: string]: JsonValue;
};
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface RefObject {
    $ref: string;
}
export declare class CyclicJSON {
    static stringify<T>(obj: T): string;
    static parse<T>(text: string): T;
}
export default CyclicJSON;
//# sourceMappingURL=JSON.d.ts.map